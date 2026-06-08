/// The Daily Walrus — World Cup 2026 prediction game.
/// Design (red-team adjusted): predictions = OWNED objects (user submits, sponsored, event-emitted);
/// scoring/leaderboard = SHARED `Scoreboard` written by `OracleCap` (server grades off-chain → records
/// on-chain). Sponsored tx can't sign a user's owned object, so scoring is server-driven, not user-pull.
#[allow(unused_const)]
module wc_predict::prediction_game {
    use std::string::String;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};

    // ---- errors ----
    const EMatchLocked: u64 = 1;
    const EMatchNotFound: u64 = 2;
    const EMatchAlreadySettled: u64 = 3;
    const EBadKind: u64 = 4;
    const EMatchExists: u64 = 5;
    const ELenMismatch: u64 = 6;

    // ---- prediction kinds ----
    const K_SCORELINE: u8 = 0;
    const K_MATCH_MVP: u8 = 1;
    const K_WORST_PLAYER: u8 = 2;
    const K_CHAMPION: u8 = 3;
    const K_ADVANCE: u8 = 4;

    // ---- capabilities ----
    public struct AdminCap has key, store { id: UID }
    public struct OracleCap has key, store { id: UID }

    // ---- shared: match registry (admin/oracle writes only) ----
    public struct MatchRegistry has key {
        id: UID,
        match_count: u64,
        matches: Table<u64, Match>,
    }
    public struct Match has store {
        match_id: u64,
        label: String,
        kickoff_ms: u64,
        round: u8,
        settled: bool,
    }

    // ---- shared: scoreboard (OracleCap writes) ----
    public struct Scoreboard has key {
        id: UID,
        scores: Table<address, Score>,
    }
    public struct Score has store, copy, drop {
        points: u64,
        streak: u64,
        best_streak: u64,
        graded: u64,
        correct: u64,
    }

    // ---- owned: per-user prediction ----
    public struct Prediction has key, store {
        id: UID,
        owner: address,
        match_id: u64,
        kind: u8,
        a: u32,
        b: u32,
        c: u32,
        d: u32,
        e: u32,
        created_ms: u64,
    }

    // ---- events (leaderboard + indexer source) ----
    public struct MatchRegistered has copy, drop { match_id: u64, label: String, kickoff_ms: u64, round: u8 }
    public struct MatchSettled has copy, drop { match_id: u64, settled_ms: u64 }
    public struct PredictionSubmitted has copy, drop {
        prediction_id: ID,
        owner: address,
        match_id: u64,
        kind: u8,
        a: u32, b: u32, c: u32, d: u32, e: u32,
        created_ms: u64,
    }
    public struct Scored has copy, drop {
        owner: address,
        points: u64,
        correct: bool,
        streak: u64,
        total_points: u64,
        scored_ms: u64,
    }

    fun init(ctx: &mut TxContext) {
        let admin = ctx.sender();
        transfer::public_transfer(AdminCap { id: object::new(ctx) }, admin);
        transfer::public_transfer(OracleCap { id: object::new(ctx) }, admin);
        transfer::share_object(MatchRegistry { id: object::new(ctx), match_count: 0, matches: table::new(ctx) });
        transfer::share_object(Scoreboard { id: object::new(ctx), scores: table::new(ctx) });
    }

    /// User submits a prediction (owned). Locked at kickoff via on-chain Clock.
    public fun submit_prediction(
        registry: &MatchRegistry,
        match_id: u64,
        kind: u8,
        a: u32, b: u32, c: u32, d: u32, e: u32,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(kind <= K_ADVANCE, EBadKind);
        if (kind != K_CHAMPION) {
            assert!(table::contains(&registry.matches, match_id), EMatchNotFound);
            let m = table::borrow(&registry.matches, match_id);
            assert!(clock::timestamp_ms(clock) < m.kickoff_ms, EMatchLocked);
        };
        let pred = Prediction {
            id: object::new(ctx),
            owner: ctx.sender(),
            match_id,
            kind,
            a, b, c, d, e,
            created_ms: clock::timestamp_ms(clock),
        };
        event::emit(PredictionSubmitted {
            prediction_id: object::id(&pred),
            owner: pred.owner,
            match_id, kind, a, b, c, d, e,
            created_ms: pred.created_ms,
        });
        transfer::public_transfer(pred, ctx.sender());
    }

    /// Admin registers a match (with kickoff lock time).
    public fun register_match(
        _admin: &AdminCap,
        registry: &mut MatchRegistry,
        match_id: u64,
        label: String,
        kickoff_ms: u64,
        round: u8,
    ) {
        assert!(!table::contains(&registry.matches, match_id), EMatchExists);
        table::add(&mut registry.matches, match_id, Match { match_id, label, kickoff_ms, round, settled: false });
        registry.match_count = registry.match_count + 1;
        event::emit(MatchRegistered { match_id, label, kickoff_ms, round });
    }

    /// Oracle marks a match settled (results graded off-chain; recorded via record_scores).
    public fun settle_match(
        _oracle: &OracleCap,
        registry: &mut MatchRegistry,
        match_id: u64,
        clock: &Clock,
    ) {
        assert!(table::contains(&registry.matches, match_id), EMatchNotFound);
        let m = table::borrow_mut(&mut registry.matches, match_id);
        assert!(!m.settled, EMatchAlreadySettled);
        m.settled = true;
        event::emit(MatchSettled { match_id, settled_ms: clock::timestamp_ms(clock) });
    }

    /// Oracle records a batch of graded scores (server computes points/correct off-chain).
    public fun record_scores(
        _oracle: &OracleCap,
        board: &mut Scoreboard,
        users: vector<address>,
        points: vector<u64>,
        correct: vector<bool>,
        clock: &Clock,
    ) {
        let n = vector::length(&users);
        assert!(n == vector::length(&points) && n == vector::length(&correct), ELenMismatch);
        let mut i = 0;
        while (i < n) {
            let u = *vector::borrow(&users, i);
            let pts = *vector::borrow(&points, i);
            let ok = *vector::borrow(&correct, i);
            if (!table::contains(&board.scores, u)) {
                table::add(&mut board.scores, u, Score { points: 0, streak: 0, best_streak: 0, graded: 0, correct: 0 });
            };
            let s = table::borrow_mut(&mut board.scores, u);
            s.points = s.points + pts;
            s.graded = s.graded + 1;
            if (ok) {
                s.correct = s.correct + 1;
                s.streak = s.streak + 1;
                if (s.streak > s.best_streak) { s.best_streak = s.streak; };
            } else {
                s.streak = 0;
            };
            event::emit(Scored {
                owner: u,
                points: pts,
                correct: ok,
                streak: s.streak,
                total_points: s.points,
                scored_ms: clock::timestamp_ms(clock),
            });
            i = i + 1;
        };
    }

    /// Admin delegates settling/scoring to a hot oracle wallet.
    public fun grant_oracle(_admin: &AdminCap, to: address, ctx: &mut TxContext) {
        transfer::public_transfer(OracleCap { id: object::new(ctx) }, to);
    }

    /// Read a user's score (points, streak, graded, correct).
    public fun score_of(board: &Scoreboard, who: address): (u64, u64, u64, u64) {
        if (!table::contains(&board.scores, who)) {
            return (0, 0, 0, 0)
        };
        let s = table::borrow(&board.scores, who);
        (s.points, s.streak, s.graded, s.correct)
    }
}
