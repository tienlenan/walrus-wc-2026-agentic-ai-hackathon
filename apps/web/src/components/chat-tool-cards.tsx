import type {
  ChatToolPart,
  FixturesToolOutput,
  MyDappActionsToolOutput,
  MyGameRecordToolOutput,
  MyMatchVotesToolOutput,
  MyOutputRecordsToolOutput,
  MyPredictionsToolOutput,
  MyRoastsToolOutput,
  TeamProfileToolOutput,
  UserProof,
} from "../lib/gil-api";
import { teamWithFlag } from "../lib/team-flags";
import { useTimeSettings } from "../lib/time-settings";

function shortId(value: string | null | undefined): string {
  if (!value) return "none";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function scoreLabel(fixture: FixturesToolOutput["fixtures"][number]): string | null {
  if (fixture.homeScore == null || fixture.awayScore == null) return null;
  return `${fixture.homeScore}-${fixture.awayScore}`;
}

function GateBadge({ fixture }: { fixture: FixturesToolOutput["fixtures"][number] }) {
  const label = fixture.predictionOpen ? "Open" : fixture.predictionStatus.replace(/_/g, " ");
  return <span className={fixture.predictionOpen ? "tool-gate open" : "tool-gate"}>{label}</span>;
}

function ProofChips({ proof }: { proof: UserProof }) {
  const chips = [
    ["tx", proof.txDigest],
    ["object", proof.suiObjectId],
    ["blob", proof.blobId],
    ["hash", proof.contentHash],
    ["walrus", proof.walrusStatus],
  ].filter(([, value]) => Boolean(value));

  if (chips.length === 0) return <span className="tool-proof-chip muted">no proof indexed</span>;
  return (
    <div className="tool-proof-row">
      {chips.map(([label, value]) => (
        <span className="tool-proof-chip" key={`${label}-${value}`}>
          <b>{label}</b> {shortId(value)}
        </span>
      ))}
    </div>
  );
}

function ToolHeader({ kicker, title, meta }: { kicker: string; title: string; meta: string }) {
  return (
    <div className="tool-card-head">
      <div>
        <span className="tool-kicker">{kicker}</span>
        <strong>{title}</strong>
      </div>
      <span>{meta}</span>
    </div>
  );
}

function FixturesToolCard({ output }: { output: FixturesToolOutput }) {
  const { formatDateTime } = useTimeSettings();
  return (
    <div className="tool-card fixture-tool-card">
      <ToolHeader kicker="Fixture tool" title={output.title} meta={`${output.totalMatches} found`} />
      <div className="tool-fixtures">
        {output.fixtures.length === 0 && <div className="tool-empty">No fixture matched that warrant.</div>}
        {output.fixtures.map((fixture) => (
          <div className="tool-fixture" key={fixture.matchId}>
            <div className="tool-fixture-main">
              <b>
                {teamWithFlag(fixture.home, fixture.homeTeamCode)} <span>vs</span> {teamWithFlag(fixture.away, fixture.awayTeamCode)}
              </b>
              {scoreLabel(fixture) && <em>{scoreLabel(fixture)}</em>}
            </div>
            <div className="tool-fixture-meta">
              <span>M{fixture.matchId}</span>
              <span>{fixture.groupName ? `Group ${fixture.groupName}` : fixture.stage ?? "Knockout"}</span>
              <span>{fixture.kickoff ? formatDateTime(fixture.kickoff) : "Kickoff TBA"}</span>
              <span>{[fixture.venue, fixture.city].filter(Boolean).join(", ")}</span>
            </div>
            <GateBadge fixture={fixture} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamProfileToolCard({ output }: { output: TeamProfileToolOutput }) {
  const { formatDateTime } = useTimeSettings();
  return (
    <div className="tool-card team-tool-card">
      <ToolHeader kicker="Team profile tool" title={`${output.team.flagEmoji} ${output.team.name}`} meta={`Group ${output.team.groupName}`} />
      <div className="team-tool-grid">
        <div>
          <span>Coach</span>
          <b>{output.team.coach ?? "TBA"}</b>
        </div>
        <div>
          <span>Squad</span>
          <b>{output.squadCount} players</b>
        </div>
        <div>
          <span>Walrus blob</span>
          <b>{output.team.walrusBlobId ? output.team.walrusBlobId.slice(0, 12) : output.team.walrusStatus}</b>
        </div>
      </div>
      <div className="tool-squad">
        {output.squadSample.map((player) => (
          <span key={`${player.number}-${player.playerName}`}>
            #{player.number} {player.playerName} - {player.position}
          </span>
        ))}
      </div>
      <div className="tool-mini-fixtures">
        {output.fixtures.slice(0, 3).map((fixture) => (
          <span key={fixture.matchId}>
            {teamWithFlag(fixture.home, fixture.homeTeamCode)} vs {teamWithFlag(fixture.away, fixture.awayTeamCode)} -{" "}
            {fixture.kickoff ? formatDateTime(fixture.kickoff) : "TBA"}
          </span>
        ))}
      </div>
    </div>
  );
}

function MyPredictionsToolCard({ output }: { output: MyPredictionsToolOutput }) {
  const { formatDateTime } = useTimeSettings();
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My predictions" title="Prediction receipts" meta={`${output.total} found`} />
      <div className="user-tool-list">
        {output.predictions.length === 0 && <div className="tool-empty">No predictions indexed for this wallet yet.</div>}
        {output.predictions.slice(0, 5).map((prediction) => (
          <div className="user-tool-row" key={prediction.id}>
            <div>
              <b>{prediction.matchLabel}</b>
              <span>{prediction.pickLabel}</span>
              <small>
                {prediction.kickoff ? formatDateTime(prediction.kickoff) : "Kickoff TBA"} - {prediction.oracleStatus}
                {prediction.oraclePoints != null ? ` - ${prediction.oraclePoints} pts` : ""}
              </small>
            </div>
            <ProofChips proof={prediction.proof} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyRoastsToolCard({ output }: { output: MyRoastsToolOutput }) {
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My roasts" title="Roast history" meta={`${output.total} found`} />
      <div className="user-tool-list">
        {output.roasts.length === 0 && <div className="tool-empty">No roasts indexed for this wallet yet.</div>}
        {output.roasts.slice(0, 5).map((roast) => (
          <div className="user-tool-row" key={roast.id}>
            <div>
              <b>{roast.targetName}</b>
              <span>{roast.roastText}</span>
              <small>{roast.teamCode ?? roast.targetType}</small>
            </div>
            <ProofChips proof={roast.proof} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyMatchVotesToolCard({ output }: { output: MyMatchVotesToolOutput }) {
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My votes" title="MVP / worst player votes" meta={`${output.total} found`} />
      <div className="user-tool-list">
        {output.votes.length === 0 && <div className="tool-empty">No MVP or worst-player votes indexed yet.</div>}
        {output.votes.slice(0, 5).map((vote) => (
          <div className="user-tool-row" key={vote.id}>
            <div>
              <b>{vote.kind.replace(/_/g, " ")}</b>
              <span>
                {vote.targetLabel} - {vote.matchLabel}
              </span>
            </div>
            <ProofChips proof={vote.proof} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyOutputRecordsToolCard({ output }: { output: MyOutputRecordsToolOutput }) {
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My proofs" title="Sui OutputRecords" meta={`${output.total} found`} />
      <div className="user-tool-list">
        {output.records.length === 0 && <div className="tool-empty">No Sui OutputRecord receipts indexed yet.</div>}
        {output.records.slice(0, 5).map((record) => (
          <div className="user-tool-row" key={record.id}>
            <div>
              <b>{record.outputKind.replace(/_/g, " ")}</b>
              <span>
                {record.resourceType}:{record.resourceId}
              </span>
            </div>
            <ProofChips proof={record.proof} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyDappActionsToolCard({ output }: { output: MyDappActionsToolOutput }) {
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My dapp actions" title="Wallet activity timeline" meta={`${output.total} found`} />
      <div className="user-tool-list">
        {output.actions.length === 0 && <div className="tool-empty">No indexed dapp actions for this wallet yet.</div>}
        {output.actions.slice(0, 6).map((action) => (
          <div className="user-tool-row" key={action.id}>
            <div>
              <b>{action.title}</b>
              <span>{action.summary}</span>
              <small>{action.actionType.replace(/_/g, " ")}</small>
            </div>
            <ProofChips proof={action.proof} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MyGameRecordToolCard({ output }: { output: MyGameRecordToolOutput }) {
  return (
    <div className="tool-card user-tool-card">
      <ToolHeader kicker="My record" title="Shameboard record" meta={output.exists ? "indexed" : "empty"} />
      <div className="team-tool-grid">
        <div>
          <span>Points</span>
          <b>{output.totalPoints}</b>
        </div>
        <div>
          <span>Accuracy</span>
          <b>{output.accuracy == null ? "not graded" : `${output.accuracy}%`}</b>
        </div>
        <div>
          <span>Streak</span>
          <b>
            {output.streak} / {output.bestStreak}
          </b>
        </div>
      </div>
      {!output.exists && <div className="tool-empty user-tool-empty">No record row exists yet. Make a prediction first.</div>}
    </div>
  );
}

export function ToolPartRenderer({ part }: { part: ChatToolPart }) {
  if (part.state !== "output-available") {
    return <div className="tool-card tool-pending">Running {part.type.replace("tool-", "")}...</div>;
  }
  if (part.type === "tool-getFixtures" && part.output) return <FixturesToolCard output={part.output as FixturesToolOutput} />;
  if (part.type === "tool-getTeamProfile" && part.output) return <TeamProfileToolCard output={part.output as TeamProfileToolOutput} />;
  if (part.type === "tool-getMyPredictions" && part.output) return <MyPredictionsToolCard output={part.output as MyPredictionsToolOutput} />;
  if (part.type === "tool-getMyRoasts" && part.output) return <MyRoastsToolCard output={part.output as MyRoastsToolOutput} />;
  if (part.type === "tool-getMyMatchVotes" && part.output) return <MyMatchVotesToolCard output={part.output as MyMatchVotesToolOutput} />;
  if (part.type === "tool-getMyOutputRecords" && part.output) return <MyOutputRecordsToolCard output={part.output as MyOutputRecordsToolOutput} />;
  if (part.type === "tool-getMyDappActions" && part.output) return <MyDappActionsToolCard output={part.output as MyDappActionsToolOutput} />;
  if (part.type === "tool-getMyGameRecord" && part.output) return <MyGameRecordToolCard output={part.output as MyGameRecordToolOutput} />;
  return <div className="tool-card tool-pending">{part.type.replace("tool-", "")} completed.</div>;
}
