import Link from 'next/link';
import Image from 'next/image';
import { hasEspnCredentials, getMatchups, getStandings, getPlayoffBracket } from '@/lib/espn';
import matchupsJson from '@/data/matchups.json';
import standingsJson from '@/data/standings.json';
import type { Matchup, MatchupsData, StandingEntry, PlayoffBracketData, BracketMatchup } from '@/lib/types';
import ScoreStrip from '@/components/ScoreStrip';
import { teamLogoSrc } from '@/lib/team-logos';

export const revalidate = 1800;

// ─── Closest matchup ──────────────────────────────────────────────────────────

function findClosestMatchup(matchups: Matchup[]): Matchup {
  return matchups.reduce((closest, m) => {
    const diff = Math.abs(m.home.actualScore - m.away.actualScore);
    const closestDiff = Math.abs(closest.home.actualScore - closest.away.actualScore);
    return diff < closestDiff ? m : closest;
  });
}

// ─── Semi-Finals Card ─────────────────────────────────────────────────────────

function SemiFinalsCard({ matchups }: { matchups: BracketMatchup[] }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#0B1628] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0">
            <path d="M8 2l1.8 4H14l-3.6 2.6 1.4 4.4L8 10.5 4.2 13 5.6 8.6 2 6h4.2z" fill="#C8956C"/>
          </svg>
          <span className="text-[12px] font-semibold text-[#C8956C] uppercase tracking-wider">
            Playoffs · Semi-Finals
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8956C] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C8956C]" />
          </span>
          <span className="text-[11px] font-semibold text-[#C8956C]">In Progress</span>
        </div>
      </div>

      {/* Matchups */}
      <div className="divide-y divide-white/5">
        {matchups.map((m, idx) => {
          const { home, away, winner } = m;
          const homeWon = winner === 'home';
          const awayWon = winner === 'away';
          const ongoing = winner === null;
          const homeLeading = ongoing && away !== null && home.score > away.score;
          const awayLeading = ongoing && away !== null && away.score > home.score;

          return (
            <div key={m.id} className="px-5 py-4">
              {/* Matchup label */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] mb-3">
                Matchup {idx + 1}
              </p>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                {(
                  [
                    { team: home, won: homeWon, leading: homeLeading, lost: awayWon },
                    away ? { team: away, won: awayWon, leading: awayLeading, lost: homeWon } : null,
                  ].filter(Boolean) as { team: import('@/lib/types').BracketTeam; won: boolean; leading: boolean; lost: boolean }[]
                ).map(({ team, won, leading, lost }, ti) => (
                  <>
                    {ti === 1 && (
                      <div key="vs" className="flex items-center justify-center px-1">
                        <span className="text-[11px] font-bold text-[#334155]">VS</span>
                      </div>
                    )}
                    <div
                      key={team.teamId}
                      className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition-colors ${
                        won ? 'bg-[#10B981]/10 border border-[#10B981]/20' : lost ? 'opacity-40 bg-white/3' : leading ? 'bg-white/5' : 'bg-white/3'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-[#475569]">#{team.seed}</span>
                      {teamLogoSrc(team.teamName) ? (
                        <Image src={teamLogoSrc(team.teamName)!} alt={team.teamName} width={56} height={56} className="rounded-full object-cover object-top w-14 h-14" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-white/10" />
                      )}
                      <div className="min-w-0 w-full">
                        <p className={`text-[13px] font-bold leading-tight truncate ${won ? 'text-[#10B981]' : 'text-white'}`}>
                          {team.ownerName}
                        </p>
                        <p className="text-[10px] text-[#475569] truncate">{team.teamName}</p>
                      </div>
                      <p className={`text-[28px] font-bold tabular-nums leading-none ${
                        won ? 'text-[#10B981]' : leading ? 'text-white' : 'text-[#64748B]'
                      }`}>
                        {team.score > 0 ? team.score.toFixed(1) : '—'}
                      </p>
                      {won && (
                        <span className="text-[9px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 rounded px-2 py-0.5">ADV</span>
                      )}
                      {leading && team.score > 0 && (
                        <span className="text-[9px] font-bold bg-[#C8956C]/20 text-[#C8956C] border border-[#C8956C]/30 rounded px-2 py-0.5">LEAD</span>
                      )}
                      {!won && team.playersRemainingToday > 0 && (
                        <span className="text-[9px] font-medium text-[#64748B]">
                          {team.playersRemainingToday} starter game{team.playersRemainingToday !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </div>
                  </>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-white/5">
        <Link href="/league" className="text-[12px] font-medium text-[#C8956C] hover:text-[#D4A77C] transition-colors">
          View full bracket →
        </Link>
      </div>
    </div>
  );
}

// ─── Closest Matchup Hero Card ────────────────────────────────────────────────

function ClosestMatchupCard({ matchup, week }: { matchup: Matchup; week: number }) {
  const { home, away, isFinal, isLive } = matchup;
  const margin = Math.abs(home.actualScore - away.actualScore);
  const leader = home.actualScore >= away.actualScore ? home : away;
  const trailer = home.actualScore >= away.actualScore ? away : home;
  const hasScores = home.actualScore > 0 || away.actualScore > 0;

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0B1628] text-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 12 12" fill="#C8956C" className="w-3 h-3">
            <path d="M6 1l1.3 3h3l-2.4 1.8.9 3L6 7l-2.8 1.8.9-3L1.7 4h3z"/>
          </svg>
          <span className="text-[12px] font-semibold text-[#C8956C] uppercase tracking-wider">
            Week {week} · Closest Game
          </span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
            </span>
            <span className="text-[11px] font-semibold text-[#10B981]">Live</span>
          </div>
        )}
        {isFinal && (
          <span className="text-[11px] font-semibold text-[#94A3B8]">Final</span>
        )}
      </div>

      {/* Scores */}
      <div className="px-5 py-6">
        {hasScores ? (
          <div className="flex items-center justify-center gap-4">
            {/* Leader */}
            <div className="flex-1 text-right">
              <p className="text-[13px] font-medium text-[#94A3B8] mb-1">{leader.ownerName}</p>
              <p className="text-[48px] font-bold tabular-nums leading-none text-white">
                {leader.actualScore.toFixed(1)}
              </p>
              <p className="text-[12px] text-[#475569] mt-1 truncate">{leader.teamName}</p>
              {!isFinal && leader.playersRemainingToday > 0 && (
                <p className="text-[11px] text-[#64748B] mt-1">{leader.playersRemainingToday} starter game{leader.playersRemainingToday !== 1 ? 's' : ''} left</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <span className="text-[20px] font-light text-[#334155]">—</span>
              <div className="mt-2 px-3 py-1 rounded-full bg-[#C8956C]/20 border border-[#C8956C]/30">
                <span className="text-[12px] font-bold text-[#C8956C]">
                  ±{margin.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Trailer */}
            <div className="flex-1 text-left">
              <p className="text-[13px] font-medium text-[#94A3B8] mb-1">{trailer.ownerName}</p>
              <p className="text-[48px] font-bold tabular-nums leading-none text-[#64748B]">
                {trailer.actualScore.toFixed(1)}
              </p>
              <p className="text-[12px] text-[#475569] mt-1 truncate">{trailer.teamName}</p>
              {!isFinal && trailer.playersRemainingToday > 0 && (
                <p className="text-[11px] text-[#64748B] mt-1">{trailer.playersRemainingToday} starter game{trailer.playersRemainingToday !== 1 ? 's' : ''} left</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-[15px] text-[#475569]">{home.ownerName} vs {away.ownerName}</p>
            <p className="text-[12px] text-[#334155] mt-1">Scores not yet available</p>
          </div>
        )}
      </div>

      {/* Projected row */}
      {!isFinal && (home.projectedScore > 0 || away.projectedScore > 0) && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/3">
          <div className="text-right flex-1">
            <span className="text-[11px] text-[#475569]">Proj </span>
            <span className="text-[12px] font-semibold text-[#64748B] tabular-nums">
              {(home.actualScore >= away.actualScore ? leader : trailer).projectedScore.toFixed(1)}
            </span>
          </div>
          <span className="text-[10px] text-[#334155] px-3">PROJECTED</span>
          <div className="text-left flex-1">
            <span className="text-[11px] text-[#475569]">Proj </span>
            <span className="text-[12px] font-semibold text-[#64748B] tabular-nums">
              {(home.actualScore >= away.actualScore ? trailer : leader).projectedScore.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weekly Score Cards (Statmuse-style) ─────────────────────────────────────

const CARD_COLORS = [
  { bg: '#1E3A5F', border: '#2D5A8E' },  // navy
  { bg: '#7F1D1D', border: '#991B1B' },  // deep red
  { bg: '#064E3B', border: '#065F46' },  // teal
  { bg: '#78350F', border: '#92400E' },  // amber
  { bg: '#312E81', border: '#3730A3' },  // indigo
  { bg: '#134E4A', border: '#115E59' },  // cyan
];

function WeekScoreCards({ matchups, closestId, week }: { matchups: Matchup[]; closestId: string; week: number }) {
  const others = matchups.filter((m) => m.id !== closestId);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
          All Matchups · Week {week}
        </p>
        <Link href="/matchups" className="text-[12px] font-medium text-[#C8956C] hover:text-[#D4A77C] transition-colors">
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {others.map((m, i) => {
          const color = CARD_COLORS[i % CARD_COLORS.length];
          const homeLeading = m.home.actualScore >= m.away.actualScore;
          const hasScores = m.home.actualScore > 0 || m.away.actualScore > 0;

          return (
            <div
              key={m.id}
              style={{ backgroundColor: color.bg, borderColor: color.border }}
              className="rounded-xl border p-4 flex flex-col gap-3"
            >
              {/* Status */}
              <div className="flex items-center gap-1.5">
                {m.isLive && (
                  <span className="relative flex h-1.5 w-1.5 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]" />
                  </span>
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  m.isLive ? 'text-[#10B981]' : m.isFinal ? 'text-white/40' : 'text-white/30'
                }`}>
                  {m.isLive ? 'Live' : m.isFinal ? 'Final' : 'Upcoming'}
                </span>
              </div>

              {/* Teams + Scores — 2 side-by-side boxes */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                {[m.home, m.away].map((team, ti) => {
                  const isLeading = hasScores && (ti === 0 ? homeLeading : !homeLeading);
                  return (
                    <>
                      {ti === 1 && (
                        <div key="vs" className="flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white/20">VS</span>
                        </div>
                      )}
                      <div key={team.teamId} className={`flex flex-col items-center gap-1.5 rounded-lg p-3 text-center ${isLeading ? 'bg-white/8' : 'bg-white/3'}`}>
                        {teamLogoSrc(team.teamName) ? (
                          <Image src={teamLogoSrc(team.teamName)!} alt={team.teamName} width={48} height={48} className="rounded-full object-cover object-top w-12 h-12" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white/10" />
                        )}
                        <p className={`text-[12px] font-bold leading-tight truncate w-full ${isLeading ? 'text-white' : 'text-white/60'}`}>
                          {team.ownerName}
                        </p>
                        <p className="text-[9px] text-white/30 truncate w-full">{team.teamName}</p>
                        <p className={`text-[24px] font-bold tabular-nums leading-none ${isLeading ? 'text-white' : 'text-white/40'}`}>
                          {hasScores ? team.actualScore.toFixed(1) : '—'}
                        </p>
                        {!m.isFinal && team.playersRemainingToday > 0 && (
                          <p className="text-[9px] text-white/40">
                            {team.playersRemainingToday} left
                          </p>
                        )}
                      </div>
                    </>
                  );
                })}
              </div>

              {/* H2H record */}
              {m.h2h && (
                <p className="text-[10px] text-white/25 border-t border-white/10 pt-2 mt-1">
                  H2H: {m.home.ownerName} {m.h2h.homeWins}–{m.h2h.awayWins} {m.away.ownerName}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Standings Panel ──────────────────────────────────────────────────────────

function HomeStandingsPanel({ standings }: { standings: StandingEntry[] }) {
  const top = standings.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
        <p className="text-[13px] font-bold text-[#0F172A]">Standings</p>
        <Link href="/league" className="text-[12px] font-medium text-[#C8956C] hover:text-[#D4A77C] transition-colors">
          Full table →
        </Link>
      </div>

      <div className="divide-y divide-[#F1F5F9]">
        {top.map((entry) => {
          const isTop3 = entry.rank <= 3;
          const rankColor = entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#94A3B8' : entry.rank === 3 ? '#C8956C' : '#CBD5E1';

          return (
            <div key={entry.teamId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors">
              <span
                className="text-[12px] font-bold w-5 text-center shrink-0 tabular-nums"
                style={{ color: rankColor }}
              >
                {entry.rank}
              </span>
              {teamLogoSrc(entry.teamName) && (
                <Image src={teamLogoSrc(entry.teamName)!} alt={entry.teamName} width={28} height={28} className="rounded-full object-cover object-top w-7 h-7 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold leading-tight truncate ${isTop3 ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
                  {entry.ownerName}
                </p>
                <p className="text-[10px] text-[#94A3B8] truncate">{entry.teamName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-bold tabular-nums text-[#0F172A]">
                  {entry.wins}–{entry.losses}
                </p>
                <p className="text-[10px] text-[#94A3B8] tabular-nums">
                  {entry.points.toFixed(0)} pts
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { href: '/draft',     label: 'Draft',    emoji: '📋' },
  { href: '/stats',     label: 'Stats',    emoji: '📊' },
  { href: '/records',   label: 'Records',  emoji: '🏆' },
  { href: '/nba',       label: 'NBA Live', emoji: '🏀' },
  { href: '/analysis',  label: 'Analysis', emoji: '🔬' },
  { href: '/history',   label: 'History',  emoji: '📖' },
];

function HomeQuickLinks() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
        Quick Links
      </p>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_LINKS.map(({ href, label, emoji }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[#F1F5F9] transition-colors text-center group"
          >
            <span className="text-[18px]">{emoji}</span>
            <span className="text-[11px] font-medium text-[#475569] group-hover:text-[#0F172A] transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Fetch data
  let matchupsData: MatchupsData = matchupsJson as MatchupsData;
  let standings: StandingEntry[] = standingsJson as StandingEntry[];
  let bracket: PlayoffBracketData | null = null;

  if (hasEspnCredentials()) {
    const [matchupsResult, standingsResult, bracketResult] = await Promise.allSettled([
      getMatchups(),
      getStandings(),
      getPlayoffBracket(),
    ]);
    if (matchupsResult.status === 'fulfilled') matchupsData = matchupsResult.value;
    if (standingsResult.status === 'fulfilled') standings = standingsResult.value;
    if (bracketResult.status === 'fulfilled') bracket = bracketResult.value;
  }

  const { matchups, week } = matchupsData;
  const closestMatchup = matchups.length > 0 ? findClosestMatchup(matchups) : null;

  // Semi-final matchups: winners bracket, current round only
  const semiFinals: BracketMatchup[] = bracket?.isPlayoffs
    ? bracket.winners.filter((m) => m.isCurrentRound)
    : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Score strip */}
      {matchups.length > 0 && (
        <ScoreStrip
          matchups={matchups}
          week={week}
          closestMatchupId={closestMatchup?.id ?? ''}
        />
      )}

      {/* Logo + title */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Fantasy HQ"
            width={160}
            height={60}
            className="object-contain"
            priority
          />
          <div className="hidden sm:block h-8 w-px bg-[#E2E8F0]" />
          <div className="hidden sm:block">
            <p className="text-[13px] font-medium text-[#475569]">Season 2025–26</p>
            <p className="text-[12px] text-[#94A3B8]">Private NBA Fantasy League</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="px-6 pb-8 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 max-w-[1400px]">

        {/* Left column */}
        <div className="space-y-6">
          {/* Semi-finals (shown when playoffs are active) */}
          {semiFinals.length > 0 && (
            <SemiFinalsCard matchups={semiFinals} />
          )}

          {closestMatchup ? (
            <ClosestMatchupCard matchup={closestMatchup} week={week} />
          ) : (
            <div className="rounded-2xl bg-[#0B1628] p-8 text-center">
              <p className="text-[#475569]">No matchup data available.</p>
            </div>
          )}

          {matchups.length > 1 && closestMatchup && (
            <WeekScoreCards
              matchups={matchups}
              closestId={closestMatchup.id}
              week={week}
            />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <HomeStandingsPanel standings={standings} />
          <HomeQuickLinks />
        </div>
      </div>
    </div>
  );
}
