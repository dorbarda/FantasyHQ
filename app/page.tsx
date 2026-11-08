import Image from 'next/image';
import { hasEspnCredentials, getMatchups } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import type { MatchupsData } from '@/lib/types';
import OwnerAvatar from '@/components/OwnerAvatar';
import RecapHighlights from '@/components/RecapHighlights';
import HomeTrends from '@/components/HomeTrends';
import { weekRange } from '@/components/PowerRankingsTable';
import { CURRENT_SEASON_DISPLAY } from '@/lib/season';
import { loadNightlyRecap } from '@/lib/nightly-data';
import { loadHighlightsForDates } from '@/lib/highlights-data';
import { loadPlayerTrends } from '@/lib/player-trends-data';
import { hasSeasonStarted, topLast30, surprises, busts } from '@/lib/player-trends';
import { readSnapshot } from '@/lib/snapshots';
import { computePowerRankings } from '@/lib/power-rankings';
import type { MatchupDepthData } from '@/lib/types';
import WeekPulseCard, { type PulseRow } from '@/components/WeekPulseCard';
import { readWeekProjection, readWeekDaily } from '@/lib/projections-data';
import { matchupDaily } from '@/lib/week-daily';
import { winPulse } from '@/lib/week-pulse';
import { loadTonight } from '@/lib/tonight-data';
import { getScoreboard, nextDate } from '@/lib/nba-scoreboard';
import { LastNightNba, NextNbaGames } from '@/components/NbaNightCards';
import HomeChapterNav from '@/components/HomeChapterNav';
import {
  managerOfTheNight,
  worstManagerOfTheNight,
  topPlayers,
  type ManagerAward,
  type NightPlayer,
} from '@/lib/nightly';
import NbaLogo from '@/components/NbaLogo';

export const revalidate = 1800;

/**
 * Home — the daily recap: what happened last night. Spec: docs/HOME-SPEC.md.
 * Everything except the "This week" card reads the nightly snapshots, so the
 * page renders without waiting on ESPN or YouTube.
 */

/** "2026-10-20" → "Tue, Oct 20" */
function nightLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

const CHAPTERS = [
  { id: 'fantasy', label: '🏆 Fantasy' },
  { id: 'nba', label: '🏀 NBA' },
  { id: 'highlights', label: '🎬 Highlights' },
];

/** One "chapter" of the scrolling home page: big header, content, link to the next one. */
function Chapter({
  id, number, title, subtitle, next, tinted, children,
}: {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  next?: { id: string; label: string };
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-[108px] md:scroll-mt-[52px] px-4 sm:px-6 pt-10 pb-8 border-t border-border ${tinted ? 'bg-surface-secondary' : ''}`}
    >
      <div className="max-w-[1480px]">
        <header className="home-reveal mb-6">
          <p className="text-[12px] font-bold tabular-nums text-accent-text tracking-widest">
            {String(number).padStart(2, '0')}
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-black tracking-tight leading-[1.05] text-foreground mt-1">
            {title}
          </h2>
          <p className="text-[13px] text-secondary mt-2">{subtitle}</p>
        </header>
        <div className="home-reveal">{children}</div>
        {next && (
          <div className="flex justify-center mt-10">
            <a
              href={`#${next.id}`}
              className="group inline-flex flex-col items-center gap-1 text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
            >
              <span>Next · {next.label}</span>
              <span className="text-[18px] leading-none transition-transform group-hover:translate-y-0.5">↓</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Next NBA game day ────────────────────────────────────────────────────────

/** Games of the first day with games after `date` (looks 4 days ahead). */
async function nextGameDay(date: string) {
  let d = date;
  for (let i = 0; i < 4; i++) {
    d = nextDate(d);
    const games = await getScoreboard(d);
    if (games.length > 0) return games;
  }
  return [];
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
                {p.proTeam && <span className="text-[12px] font-medium text-muted"> · <NbaLogo team={p.proTeam} size={14} className="mr-0.5 -mt-0.5" />{p.proTeam}</span>}
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

  // "This week" card: win % from the day-by-day file, today's players live.
  const espnId = (teamId: string) => Number(teamId.replace(/^team/, ''));
  const frozen = readWeekProjection(week);
  const daily = readWeekDaily(week);
  const night = loadNightlyRecap();
  const [tonight, nbaLastNight, nbaNext] = await Promise.all([
    matchups.some(m => !m.isFinal) ? loadTonight(week) : Promise.resolve(null),
    night ? getScoreboard(night.date) : Promise.resolve([]),
    night ? nextGameDay(night.date) : Promise.resolve([]),
  ]);
  const pulseRows: PulseRow[] = matchups.map(m => {
    const l = espnId(m.home.teamId);
    const r = espnId(m.away.teamId);
    const d = matchupDaily(frozen, daily, l, r);
    const tl = tonight?.teams.get(l);
    const tr = tonight?.teams.get(r);
    return {
      matchup: m,
      pulse: d ? winPulse(d.winProb) : null,
      tonight: tl && tr ? { left: tl, right: tr } : null,
    };
  });

  const players = night ? topPlayers(night.players) : [];
  const best = night ? managerOfTheNight(night.teams) : null;
  const worst = night ? worstManagerOfTheNight(night.teams) : null;
  const clips = night ? loadHighlightsForDates([night.date]) : [];

  // Side column — all from nightly snapshots.
  const trends = loadPlayerTrends();
  const trendsLive = trends && hasSeasonStarted(trends) ? trends.players : null;
  const depth = readSnapshot<MatchupDepthData>('matchup-depth');
  const power = depth ? computePowerRankings(depth.data.rows) : null;

  return (
    <div className="home-chapters min-h-screen bg-background">
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

      <HomeChapterNav chapters={CHAPTERS} />

      {/* 1 · Fantasy */}
      <Chapter
        id="fantasy"
        number={1}
        title="Tonight in our fantasy league"
        subtitle={night ? `Last night · ${nightLabel(night.date)} · Week ${week}` : `Week ${week}`}
        next={CHAPTERS[1]}
      >
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
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
            {pulseRows.length > 0 && <WeekPulseCard rows={pulseRows} week={week} />}
          </div>

          <HomeTrends
            last30={trendsLive ? topLast30(trendsLive) : null}
            movers={trendsLive ? { surprises: surprises(trendsLive), busts: busts(trendsLive) } : null}
            power={power ? power.entries.slice(0, 3) : []}
            powerWeeks={power && power.recentWeeks.length > 0 ? weekRange(power.recentWeeks) : null}
          />
        </div>
      </Chapter>

      {/* 2 · NBA */}
      <Chapter
        id="nba"
        number={2}
        title="Tonight in the NBA"
        subtitle="Last night's scores and the next games, in Israel time"
        next={CHAPTERS[2]}
        tinted
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-[1100px]">
          <LastNightNba games={nbaLastNight} dateLabel={night ? nightLabel(night.date) : ''} />
          <NextNbaGames games={nbaNext} rostered={tonight?.rostered ?? null} />
        </div>
      </Chapter>

      {/* 3 · Highlights */}
      <Chapter id="highlights" number={3} title="Highlights" subtitle="Last night's best plays">
        {clips.length > 0 ? (
          <RecapHighlights clips={clips} showTitle={false} />
        ) : (
          <div className="rounded-2xl bg-surface border border-border p-8 text-center">
            <p className="text-[13px] text-secondary">No clips for last night yet.</p>
          </div>
        )}
      </Chapter>
    </div>
  );
}
