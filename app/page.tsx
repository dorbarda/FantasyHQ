import Image from 'next/image';
import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import type { Matchup, MatchupsData } from '@/lib/types';
import OwnerAvatar from '@/components/OwnerAvatar';
import RecapHighlights from '@/components/RecapHighlights';
import { CURRENT_SEASON_DISPLAY } from '@/lib/season';
import { loadNightlyRecap } from '@/lib/nightly-data';
import { loadHighlightsForDates } from '@/lib/highlights-data';
import {
  managerOfTheNight,
  worstManagerOfTheNight,
  topPlayers,
  type ManagerAward,
  type NightPlayer,
} from '@/lib/nightly';

export const revalidate = 1800;

/**
 * Home — the daily recap: what happened last night. Spec: docs/HOME-SPEC.md.
 * Everything except the closest matchup reads the nightly snapshots, so the
 * page renders without waiting on ESPN or YouTube.
 */

/** "2026-10-20" → "Tue, Oct 20" */
function nightLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ─── Closest matchup ──────────────────────────────────────────────────────────

function findClosestMatchup(matchups: Matchup[]): Matchup {
  return matchups.reduce((closest, m) => {
    const diff = Math.abs(m.home.actualScore - m.away.actualScore);
    const closestDiff = Math.abs(closest.home.actualScore - closest.away.actualScore);
    return diff < closestDiff ? m : closest;
  });
}

// ─── Closest Matchup Hero Card ────────────────────────────────────────────────

function ClosestMatchupCard({ matchup, week }: { matchup: Matchup; week: number }) {
  const { home, away, isFinal, isLive } = matchup;
  const margin = Math.abs(home.actualScore - away.actualScore);
  const leader = home.actualScore >= away.actualScore ? home : away;
  const trailer = home.actualScore >= away.actualScore ? away : home;
  const hasScores = home.actualScore > 0 || away.actualScore > 0;

  return (
    <div className="rounded-2xl overflow-hidden bg-panel text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 12 12" fill="#C8956C" className="w-3 h-3">
            <path d="M6 1l1.3 3h3l-2.4 1.8.9 3L6 7l-2.8 1.8.9-3L1.7 4h3z"/>
          </svg>
          <span className="text-[12px] font-semibold text-accent uppercase tracking-wider">
            Week {week} · Closest Game
          </span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
            </span>
            <span className="text-[11px] font-semibold text-positive">Live</span>
          </div>
        )}
        {isFinal && (
          <span className="text-[11px] font-semibold text-panel-text-muted">Final</span>
        )}
      </div>

      {/* Scores */}
      <div className="px-5 py-6">
        {hasScores ? (
          <div className="flex items-center justify-center gap-4">
            {/* Leader */}
            <div className="flex-1 text-right">
              <p className="text-[13px] font-medium text-panel-text-muted mb-1">{leader.ownerName}</p>
              <p className="text-[34px] sm:text-[48px] font-bold tabular-nums leading-none text-white">
                {leader.actualScore.toFixed(1)}
              </p>
              <p className="text-[12px] text-panel-text-muted mt-1 truncate">{leader.teamName}</p>
              {!isFinal && leader.playersRemainingToday > 0 && (
                <p className="text-[11px] text-panel-text-muted mt-1">{leader.playersRemainingToday} starter game{leader.playersRemainingToday !== 1 ? 's' : ''} left</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <span className="text-[20px] font-light text-panel-text">—</span>
              <div className="mt-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30">
                <span className="text-[12px] font-bold text-accent">
                  ±{margin.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Trailer */}
            <div className="flex-1 text-left">
              <p className="text-[13px] font-medium text-panel-text-muted mb-1">{trailer.ownerName}</p>
              <p className="text-[34px] sm:text-[48px] font-bold tabular-nums leading-none text-panel-text-muted">
                {trailer.actualScore.toFixed(1)}
              </p>
              <p className="text-[12px] text-panel-text-muted mt-1 truncate">{trailer.teamName}</p>
              {!isFinal && trailer.playersRemainingToday > 0 && (
                <p className="text-[11px] text-panel-text-muted mt-1">{trailer.playersRemainingToday} starter game{trailer.playersRemainingToday !== 1 ? 's' : ''} left</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-[15px] text-panel-text-muted">{home.ownerName} vs {away.ownerName}</p>
            <p className="text-[12px] text-panel-text mt-1">Scores not yet available</p>
          </div>
        )}
      </div>

      {/* Projected row */}
      {!isFinal && (home.projectedScore > 0 || away.projectedScore > 0) && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/3">
          <div className="text-right flex-1">
            <span className="text-[11px] text-panel-text-muted">Proj </span>
            <span className="text-[12px] font-semibold text-panel-text-muted tabular-nums">
              {(home.actualScore >= away.actualScore ? leader : trailer).projectedScore.toFixed(1)}
            </span>
          </div>
          <span className="text-[10px] text-panel-text px-3">PROJECTED</span>
          <div className="text-left flex-1">
            <span className="text-[11px] text-panel-text-muted">Proj </span>
            <span className="text-[12px] font-semibold text-panel-text-muted tabular-nums">
              {(home.actualScore >= away.actualScore ? trailer : leader).projectedScore.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Top players of the night ─────────────────────────────────────────────────

function TopPlayersCard({ players }: { players: NightPlayer[] }) {
  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="type-section-label">Top {players.length} players of the night</p>
      </div>
      <ol>
        {players.map((p, i) => (
          <li
            key={`${p.playerName}-${p.ownerName}`}
            className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0"
          >
            <span className={`w-5 text-[15px] font-bold tabular-nums ${i === 0 ? 'text-accent' : 'text-muted'}`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">
                {p.playerName}
                {p.proTeam && <span className="text-[12px] font-medium text-muted"> · {p.proTeam}</span>}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <OwnerAvatar ownerName={p.ownerName} teamName={p.teamName} size={16} />
                <span className="text-[12px] text-secondary truncate">{p.ownerName}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[20px] font-bold tabular-nums text-foreground leading-none">{p.fantasyPoints.toFixed(1)}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">FPts</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Best / worst manager ─────────────────────────────────────────────────────

function ManagerCard({ award, kind }: { award: ManagerAward; kind: 'best' | 'worst' }) {
  const best = kind === 'best';
  return (
    <section
      className={`rounded-2xl border p-5 ${best ? 'bg-positive-surface border-border' : 'bg-negative-surface border-border'}`}
    >
      <p className={`text-[12px] font-semibold uppercase tracking-wider ${best ? 'text-positive-text' : 'text-negative-text'}`}>
        {best ? '🏆 Manager of the night' : '💩 Worst manager of the night'}
      </p>
      <div className="flex items-center gap-3 mt-3">
        <OwnerAvatar ownerName={award.ownerName} teamName={award.teamName} size={44} />
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-foreground truncate">{award.ownerName}</p>
          <p className="text-[12px] text-secondary truncate">{award.teamName}</p>
        </div>
      </div>
      <div className="flex items-end gap-5 mt-4">
        <div>
          <p className={`tabular-nums font-bold leading-none ${best ? 'text-[32px] text-foreground' : 'text-[22px] text-secondary'}`}>
            {award.points.toFixed(1)}
          </p>
          <p className="text-[11px] text-muted mt-1">points</p>
        </div>
        <div>
          <p className={`tabular-nums font-bold leading-none ${best ? 'text-[22px] text-secondary' : 'text-[32px] text-foreground'}`}>
            {award.perPlayer.toFixed(1)}
          </p>
          <p className="text-[11px] text-muted mt-1">per player</p>
        </div>
        <div>
          <p className="text-[22px] tabular-nums font-bold leading-none text-secondary">{award.playersPlayed}</p>
          <p className="text-[11px] text-muted mt-1">played</p>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let matchupsData: MatchupsData = matchupsJson as MatchupsData;
  if (hasEspnCredentials()) {
    try {
      matchupsData = await getMatchups();
    } catch {
      /* keep the bundled fallback */
    }
  }
  const { matchups, week } = matchupsData;
  const closestMatchup = matchups.length > 0 ? findClosestMatchup(matchups) : null;

  const night = loadNightlyRecap();
  const players = night ? topPlayers(night.players) : [];
  const best = night ? managerOfTheNight(night.teams) : null;
  const worst = night ? worstManagerOfTheNight(night.teams) : null;
  const clips = night ? loadHighlightsForDates([night.date]) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Fantasy HQ" width={160} height={60} className="object-contain" priority />
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {night ? `Last night · ${nightLabel(night.date)}` : 'Daily recap'}
            </p>
            <p className="text-[12px] text-muted">Season {CURRENT_SEASON_DISPLAY}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-8 max-w-[1100px] space-y-6">
        {night ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {players.length > 0 && <TopPlayersCard players={players} />}
            <div className="space-y-4">
              {best && <ManagerCard award={best} kind="best" />}
              {worst && <ManagerCard award={worst} kind="worst" />}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface border border-border p-8 text-center">
            <p className="text-[15px] font-semibold text-foreground">No games yet this season</p>
            <p className="text-[13px] text-secondary mt-1">The daily recap starts the morning after opening night.</p>
          </div>
        )}

        {closestMatchup && <ClosestMatchupCard matchup={closestMatchup} week={week} />}

        <RecapHighlights clips={clips} />
      </div>
    </div>
  );
}
