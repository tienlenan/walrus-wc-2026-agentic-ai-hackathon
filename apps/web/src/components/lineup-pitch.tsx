import type { LineupPlayer, TeamLineup } from "../lib/live-match-api";
import "./lineup-pitch.css";

type Side = "home" | "away";

// Surname particles that belong with the surname (e.g. "van Dijk", "El Khannouss").
const NAME_PARTICLES = new Set(["van", "von", "de", "der", "den", "di", "da", "dos", "del", "della", "la", "le", "el", "al", "bin", "ben", "mac", "mc"]);

// Pitch badges are tiny — show just the surname (with its particle) so names stay readable.
function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  const last = parts[parts.length - 1] ?? name;
  const prev = parts[parts.length - 2] ?? "";
  if (parts.length >= 2 && NAME_PARTICLES.has(prev.toLowerCase())) {
    return `${prev} ${last}`;
  }
  return last;
}

function parseGrid(grid: string | null): { row: number; col: number } | null {
  const match = grid?.match(/^(\d+):(\d+)$/);
  if (!match?.[1] || !match[2]) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

// Both teams share one pitch: home fills the left half (GK at the left goal, attack toward the
// centre line), away mirrors on the right half. Coordinates are % of the full pitch.
function positionFor(player: LineupPlayer, index: number, starters: LineupPlayer[], side: Side) {
  if (player.pitchX != null && player.pitchY != null) {
    const x = side === "home" ? player.pitchX : 100 - player.pitchX;
    return { left: `${x}%`, top: `${player.pitchY}%` };
  }
  const grid = parseGrid(player.grid);
  if (grid) {
    const rows = starters.map((item) => parseGrid(item.grid)?.row ?? 1);
    const maxRow = Math.max(1, ...rows);
    const colsInRow = starters.filter((item) => parseGrid(item.grid)?.row === grid.row).length || 1;
    const xBase = 7 + ((grid.row - 1) / Math.max(1, maxRow - 1 || 1)) * 33;
    const x = side === "home" ? xBase : 100 - xBase;
    const y = 12 + (grid.col / (colsInRow + 1)) * 76;
    return { left: `${x}%`, top: `${y}%` };
  }
  const xBase = 8 + (index % 4) * 9;
  const x = side === "home" ? xBase : 100 - xBase;
  const y = 14 + Math.floor(index / 4) * 18;
  return { left: `${x}%`, top: `${Math.min(y, 86)}%` };
}

function TeamHead({ lineup, side }: { lineup: TeamLineup; side: Side }) {
  return (
    <div className={`lineup-team-head ${side}`}>
      <div>
        <h3>{lineup.teamName}</h3>
        <span>{lineup.formation ?? "formation TBA"}</span>
      </div>
      <b>{lineup.confirmed ? "confirmed" : "projected"}</b>
    </div>
  );
}

function startersOf(lineup: TeamLineup): LineupPlayer[] {
  return lineup.players.filter((player) => player.role === "starter").slice(0, 11);
}

function benchOf(lineup: TeamLineup): LineupPlayer[] {
  return lineup.players.filter((player) => player.role === "substitute").slice(0, 8);
}

export function LineupPitch({ lineups }: { lineups: TeamLineup[] }) {
  if (lineups.length === 0) {
    return <div className="lineup-shell lineup-shell-empty">Lineups are not available yet.</div>;
  }

  const sides: Array<{ side: Side; lineup: TeamLineup }> = [];
  if (lineups[0]) sides.push({ side: "home", lineup: lineups[0] });
  if (lineups[1]) sides.push({ side: "away", lineup: lineups[1] });

  return (
    <div className="lineup-shell">
      <div className="lineup-heads">
        {sides[0] && <TeamHead lineup={sides[0].lineup} side="home" />}
        <span className="lineup-vs">vs</span>
        {sides[1] && <TeamHead lineup={sides[1].lineup} side="away" />}
      </div>

      <div className="pitch" aria-label="Match lineups on one pitch">
        {sides.map(({ side, lineup }) => {
          const starters = startersOf(lineup);
          if (starters.length === 0) {
            return (
              <div className={`lineup-empty ${side}`} key={`${side}-empty`}>
                {lineup.teamName}: lineup not released
              </div>
            );
          }
          return starters.map((player, index) => (
            <div
              className={`pitch-player ${side}`}
              key={`${side}-${player.playerName}-${index}`}
              style={positionFor(player, index, starters, side)}
              title={player.playerName}
            >
              <strong>{player.shirtNumber ?? "-"}</strong>
              <span>{shortName(player.playerName)}</span>
            </div>
          ));
        })}
      </div>

      {sides.some(({ lineup }) => benchOf(lineup).length > 0) && (
        <div className="lineup-benches">
          {sides.map(({ side, lineup }) => {
            const bench = benchOf(lineup);
            if (bench.length === 0) return null;
            return (
              <div className={`bench-list ${side}`} key={`${side}-bench`}>
                <span>{lineup.teamName} bench</span>
                <p>{bench.map((player) => shortName(player.playerName)).join(", ")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
