import { useEffect, useMemo, useState } from "react";
import { getWorldCupSnapshot, type TeamProfile, type WorldCupFixture, type WorldCupSnapshot } from "../lib/world-cup-api";
import { useI18n } from "../lib/i18n";
import { useTimeSettings } from "../lib/time-settings";
import "./team-profiles.css";

function byKickoff(a: WorldCupFixture, b: WorldCupFixture): number {
  return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
}

export function TeamProfiles() {
  const { t } = useI18n();
  const { formatDate, formatDateTime } = useTimeSettings();
  const [snapshot, setSnapshot] = useState<WorldCupSnapshot | null>(null);
  const [selectedCode, setSelectedCode] = useState("MEX");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      const next = await getWorldCupSnapshot();
      setSnapshot(next);
      if (!next.teams.some((team) => team.code === selectedCode) && next.teams[0]) {
        setSelectedCode(next.teams[0].code);
      }
    } catch {
      setError(t("team.loadErr"));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const teams = snapshot?.teams ?? [];
  const fixtures = snapshot?.fixtures ?? [];
  const selected = teams.find((team) => team.code === selectedCode) ?? teams[0] ?? null;
  const selectedFixtures = useMemo(
    () =>
      selected
        ? fixtures
            .filter((fixture) => fixture.homeTeamCode === selected.code || fixture.awayTeamCode === selected.code)
            .sort(byKickoff)
        : [],
    [fixtures, selected],
  );

  return (
    <section className="team-profiles">
      <div className="profile-head">
        <div>
          <div className="profile-kicker">{t("team.kicker")}</div>
          <h2>{t("team.title")}</h2>
        </div>
        <button type="button" onClick={() => void refresh()}>
          {t("common.refresh")}
        </button>
      </div>

      <div className="profile-grid">
        <aside className="team-picker" aria-label={t("nav.teams")}>
          {teams.map((team) => (
            <button
              type="button"
              key={team.code}
              className={team.code === selectedCode ? "selected" : ""}
              onClick={() => setSelectedCode(team.code)}
            >
              <span className="team-flag">{team.flagEmoji}</span>
              <b>{team.code}</b>
              <small>{t("common.group")} {team.groupName}</small>
            </button>
          ))}
        </aside>

        {selected && <ProfileDetails team={selected} fixtures={selectedFixtures} />}
      </div>

      {snapshot && (
        <div className="data-sources">
          <span>{teams.length} {t("team.teams")}</span>
          <span>{teams.reduce((sum, team) => sum + team.squad.length, 0)} {t("team.officialRows")}</span>
          <span>{fixtures.length} {t("team.matches")}</span>
          <span>{t("team.squads")}: {formatDateTime(snapshot.sources.squadDocumentTimestampUtc)}</span>
          <span>{t("team.schedule")}: {formatDate(snapshot.sources.scheduleGeneratedAtUtc)}</span>
        </div>
      )}
      {error && <div className="profile-error">{error}</div>}
    </section>
  );
}

function ProfileDetails({ team, fixtures }: { team: TeamProfile; fixtures: WorldCupFixture[] }) {
  const { t } = useI18n();
  const { formatDateTime } = useTimeSettings();
  return (
    <article className="profile-detail">
      <div className="profile-title-row">
        <div className="profile-flag">{team.flagEmoji}</div>
        <div>
          <h3>{team.name}</h3>
          <p>
            {t("common.group")} {team.groupName} · {team.confederation}
          </p>
        </div>
      </div>

      <div className="profile-facts">
        <div>
          <span>{t("common.coach")}</span>
          <strong>{team.coach ?? t("team.mysteryBoss")}</strong>
        </div>
        <div>
          <span>{t("common.squad")}</span>
          <strong>{team.squad.length} {t("common.player").toLowerCase()}</strong>
        </div>
        <div>
          <span>{t("team.walrusBlob")}</span>
          <strong>{team.walrusBlobId ? team.walrusBlobId.slice(0, 12) : team.walrusStatus}</strong>
        </div>
        <div>
          <span>{t("team.profileHash")}</span>
          <strong>{team.profileHash.slice(0, 12)}</strong>
        </div>
      </div>

      <div className="fixture-strip">
        {fixtures.map((fixture) => (
          <div className="fixture-chip" key={fixture.matchId}>
            <b>
              {fixture.home} vs {fixture.away}
            </b>
            <span>
              {formatDateTime(fixture.kickoff)} · {fixture.venue}
            </span>
          </div>
        ))}
      </div>

      <div className="squad-table-wrap">
        <table className="squad-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t("team.position")}</th>
              <th>{t("common.player")}</th>
              <th>{t("team.club")}</th>
            </tr>
          </thead>
          <tbody>
            {team.squad.map((player) => (
              <tr key={player.number}>
                <td>{player.number}</td>
                <td>{player.position}</td>
                <td>{player.playerName}</td>
                <td>{player.club}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
