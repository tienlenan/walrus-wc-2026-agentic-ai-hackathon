import type { LineupPlayer, TeamLineup } from "../lib/live-match-api";
import "./lineup-pitch.css";

function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function parseGrid(grid: string | null): { row: number; col: number } | null {
  const match = grid?.match(/^(\d+):(\d+)$/);
  if (!match?.[1] || !match[2]) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function positionFor(player: LineupPlayer, index: number, starters: LineupPlayer[], side: "home" | "away") {
  if (player.pitchX != null && player.pitchY != null) {
    return { left: `${player.pitchX}%`, top: `${player.pitchY}%` };
  }
  const grid = parseGrid(player.grid);
  if (grid) {
    const rows = starters.map((item) => parseGrid(item.grid)?.row ?? 1);
    const maxRow = Math.max(1, ...rows);
    const colsInRow = starters.filter((item) => parseGrid(item.grid)?.row === grid.row).length || 1;
    const xBase = 9 + ((grid.row - 1) / Math.max(1, maxRow - 1 || 1)) * 35;
    const x = side === "home" ? xBase : 100 - xBase;
    const y = 12 + (grid.col / (colsInRow + 1)) * 76;
    return { left: `${x}%`, top: `${y}%` };
  }
  const x = side === "home" ? 10 + (index % 4) * 9 : 90 - (index % 4) * 9;
  const y = 14 + Math.floor(index / 4) * 18;
  return { left: `${x}%`, top: `${Math.min(y, 86)}%` };
}

function TeamPitch({ lineup, side }: { lineup: TeamLineup; side: "home" | "away" }) {
  const starters = lineup.players.filter((player) => player.role === "starter").slice(0, 11);
  const bench = lineup.players.filter((player) => player.role === "substitute").slice(0, 8);
  return (
    <section className={`lineup-team ${side}`}>
      <div className="lineup-team-head">
        <div>
          <h3>{lineup.teamName}</h3>
          <span>{lineup.formation ?? "formation TBA"}</span>
        </div>
        <b>{lineup.confirmed ? "confirmed" : "projected"}</b>
      </div>
      <div className="pitch-half" aria-label={`${lineup.teamName} lineup`}>
        {starters.length === 0 ? (
          <div className="lineup-empty">Lineup not released</div>
        ) : (
          starters.map((player, index) => (
            <div className="pitch-player" key={`${player.playerName}-${index}`} style={positionFor(player, index, starters, side)} title={player.playerName}>
              <strong>{player.shirtNumber ?? "-"}</strong>
              <span>{shortName(player.playerName)}</span>
            </div>
          ))
        )}
      </div>
      {bench.length > 0 && (
        <div className="bench-list">
          <span>Bench</span>
          <p>{bench.map((player) => shortName(player.playerName)).join(", ")}</p>
        </div>
      )}
    </section>
  );
}

export function LineupPitch({ lineups }: { lineups: TeamLineup[] }) {
  if (lineups.length === 0) {
    return <div className="lineup-shell lineup-shell-empty">Lineups are not available yet.</div>;
  }
  return (
    <div className="lineup-shell">
      {lineups.slice(0, 2).map((lineup, index) => (
        <TeamPitch key={`${lineup.matchId}-${lineup.teamName}`} lineup={lineup} side={index === 0 ? "home" : "away"} />
      ))}
    </div>
  );
}
