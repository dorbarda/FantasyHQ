import { hasEspnCredentials } from '@/lib/espn';
import { getAllRecords } from '@/lib/espn-records';
import { getAllHistoricalSeasons, getOwnerCategoryPercentiles } from '@/lib/espn-history';
import { getDraftCountsByOwner } from '@/lib/espn-draft';
import { slugToOwner, bestLogoForOwner, ownerToSlug } from '@/lib/team-utils';
import TeamCareerChart, { CareerPoint } from '@/components/TeamCareerChart';
import TeamCategoryRadar from '@/components/TeamCategoryRadar';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

export async function generateStaticParams() {
  if (!hasEspnCredentials()) return [];
  const records = await getAllRecords();
  return records.hallOfFame.map(c => ({ owner: ownerToSlug(c.ownerName) }));
}

// ── Tiny stat card ────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[80px]">
      <span className={`text-[20px] font-black leading-tight ${accent ? 'text-[#F59E0B]' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ── H2H row ───────────────────────────────────────────────────────────────────

function H2HRow({
  opponent, wins, losses, highlight,
}: {
  opponent: string;
  wins: number;
  losses: number;
  highlight?: 'best' | 'worst';
}) {
  const total = wins + losses;
  const winPct = total > 0 ? wins / total : 0;
  const barW = Math.round(winPct * 100);

  const rowBg = highlight === 'best'
    ? 'bg-[#ECFDF5]'
    : highlight === 'worst'
    ? 'bg-[#FEF2F2]'
    : 'bg-white';
  const pctColor = winPct >= 0.6 ? '#10B981' : winPct <= 0.4 ? '#F87171' : '#94A3B8';

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${rowBg} border-b border-[#E2E8F0] last:border-0`}>
      <div className="w-28 shrink-0">
        <p className="text-[13px] font-semibold text-[#0F172A] truncate">{opponent}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${barW}%`, backgroundColor: pctColor }}
          />
        </div>
      </div>
      <div className="w-16 text-right shrink-0">
        <span className="text-[13px] font-mono font-bold" style={{ color: pctColor }}>
          {wins}–{losses}
        </span>
      </div>
      <div className="w-10 text-right shrink-0">
        <span className="text-[11px] font-semibold text-[#94A3B8]">
          {Math.round(winPct * 100)}%
        </span>
      </div>
      {highlight && (
        <span className="text-[16px]">{highlight === 'best' ? '👑' : '😬'}</span>
      )}
    </div>
  );
}

// ── Season result badge ───────────────────────────────────────────────────────

function ResultBadge({ isChampion, isRunnerUp, isThird, isLast }: {
  isChampion: boolean; isRunnerUp: boolean; isThird: boolean; isLast: boolean;
}) {
  if (isChampion) return <span className="text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-full px-2 py-0.5">🏆 Champion</span>;
  if (isRunnerUp) return <span className="text-[11px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] rounded-full px-2 py-0.5">🥈 Runner-up</span>;
  if (isThird)    return <span className="text-[11px] font-bold bg-[#FDF6F0] text-[#9A3412] border border-[#FDBA74] rounded-full px-2 py-0.5">🥉 3rd</span>;
  if (isLast)     return <span className="text-[11px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] rounded-full px-2 py-0.5">🚽 Last</span>;
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function TeamProfilePage({
  params,
}: {
  params: Promise<{ owner: string }>;
}) {
  const { owner: ownerSlug } = await params;

  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6">
        <p className="text-[14px] text-[#475569]">ESPN credentials required.</p>
      </div>
    );
  }

  const [records, seasons, draftCounts] = await Promise.all([
    getAllRecords(),
    getAllHistoricalSeasons(),
    getDraftCountsByOwner(),
  ]);

  const ownerName = slugToOwner(ownerSlug, records.hallOfFame.map(c => c.ownerName));
  if (!ownerName) notFound();

  const categoryPercs = await getOwnerCategoryPercentiles(ownerName).catch(() => null);

  const career = records.hallOfFame.find(c => c.ownerName === ownerName)!;
  const logo = bestLogoForOwner(ownerName, seasons);

  // Season-by-season results for this owner (oldest → newest for chart)
  const ownerSeasons = seasons
    .filter(s => s.finalStandings.some(t => t.ownerName === ownerName))
    .map(s => {
      const myTeam = s.finalStandings.find(t => t.ownerName === ownerName)!;
      const isChampion  = s.champion?.ownerName === ownerName;
      const isRunnerUp  = s.runnerUp?.ownerName === ownerName;
      const isLastPlace = s.lastPlace?.ownerName === ownerName;
      const isThird     = !isChampion && !isRunnerUp && myTeam.rank === 3;
      return {
        year: s.year,
        seasonLabel: s.seasonLabel,
        teamName: myTeam.teamName,
        rank: myTeam.rank,
        wins: myTeam.wins,
        losses: myTeam.losses,
        pf: myTeam.pf,
        pa: myTeam.pa,
        totalTeams: s.finalStandings.length,
        isChampion,
        isRunnerUp,
        isThird,
        isLast: isLastPlace,
      };
    })
    .sort((a, b) => a.year - b.year);

  // Career chart data
  const careerChartData: CareerPoint[] = ownerSeasons.map(s => ({
    seasonLabel: s.seasonLabel,
    position: s.rank,
    totalTeams: s.totalTeams,
    teamName: s.teamName,
    wins: s.wins,
    losses: s.losses,
    isChampion: s.isChampion,
    isRunnerUp: s.isRunnerUp,
    isThird: s.isThird,
    isLast: s.isLast,
  }));

  // All unique team names (newest to oldest)
  const allTeamNames = seasons
    .flatMap(s => s.finalStandings.filter(t => t.ownerName === ownerName).map(t => t.teamName))
    .filter((name, i, arr) => arr.indexOf(name) === i);

  // H2H records
  const h2hRaw = records.h2hMap[ownerName] || {};
  const h2hEntries = Object.entries(h2hRaw)
    .map(([opp, rec]) => ({
      opponent: opp,
      wins: rec.wins,
      losses: rec.losses,
      total: rec.wins + rec.losses,
      winPct: rec.wins + rec.losses > 0 ? rec.wins / (rec.wins + rec.losses) : 0.5,
    }))
    .sort((a, b) => b.total - a.total);

  // Best / worst opponent (min 2 matchups to qualify)
  const qualified = h2hEntries.filter(e => e.total >= 2);
  const bestOpponent  = qualified.length ? qualified.reduce((best, e) => e.winPct > best.winPct ? e : best) : null;
  const worstOpponent = qualified.length ? qualified.reduce((worst, e) => e.winPct < worst.winPct ? e : worst) : null;

  // Superlatives this owner holds
  const mySuperlatives = records.superlatives.filter(s => s.ownerName === ownerName);

  // Championship years
  const champYears = ownerSeasons.filter(s => s.isChampion).map(s => s.seasonLabel);
  const lastPlaceCount = ownerSeasons.filter(s => s.isLast).length;

  // Average finishing position
  const avgPosition = ownerSeasons.length > 0
    ? (ownerSeasons.reduce((sum, s) => sum + s.rank, 0) / ownerSeasons.length).toFixed(1)
    : '—';

  // Favourite players (most-drafted across all seasons)
  const favouritePlayers = (draftCounts[ownerName] ?? []).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Back link ──────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#64748B] hover:text-[#C8956C] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All teams
        </Link>
      </div>

      {/* ── HERO BANNER ────────────────────────────────────────────────────────── */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1628] via-[#112040] to-[#1E3A5F] shadow-xl">
        <div className="px-6 pt-8 pb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">

          {/* Logo */}
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white/10 ring-4 ring-white/20 shrink-0 shadow-2xl">
            {logo ? (
              <Image src={logo} alt={ownerName} width={112} height={112} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/40">
                {ownerName.slice(0, 1)}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-[28px] sm:text-[36px] font-black text-white leading-tight tracking-tight">
              {ownerName}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2 justify-center sm:justify-start">
              {allTeamNames.slice(0, 4).map(name => (
                <span key={name} className="text-[11px] bg-white/10 text-white/70 rounded-full px-2.5 py-0.5 font-medium">
                  {name}
                </span>
              ))}
              {allTeamNames.length > 4 && (
                <span className="text-[11px] bg-white/10 text-white/50 rounded-full px-2.5 py-0.5">
                  +{allTeamNames.length - 4} more
                </span>
              )}
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              <StatPill
                label="Titles"
                value={champYears.length > 0 ? `${'🏆'.repeat(Math.min(champYears.length, 4))}` : '—'}
                accent={champYears.length > 0}
              />
              <StatPill label="Record" value={`${career.totalWins}–${career.totalLosses}`} />
              <StatPill label="Win%" value={`${career.winPct}%`} />
              <StatPill label="Avg Pts/Wk" value={`${career.avgWeeklyScore}`} />
              <StatPill label="Avg Rank" value={`#${avgPosition}`} />
              <StatPill label="Seasons" value={String(career.seasonsPlayed)} />
            </div>
          </div>
        </div>

        {/* Championship years strip */}
        {champYears.length > 0 && (
          <div className="border-t border-white/10 px-6 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Champion</span>
            {champYears.map(y => (
              <span key={y} className="text-[11px] font-bold bg-[#F59E0B]/20 text-[#FDE68A] border border-[#F59E0B]/30 rounded-full px-2.5 py-0.5">
                {y}
              </span>
            ))}
            {lastPlaceCount > 0 && (
              <>
                <span className="text-white/20 mx-1">·</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Last Place</span>
                <span className="text-[11px] font-bold bg-[#F87171]/20 text-[#FCA5A5] border border-[#F87171]/30 rounded-full px-2.5 py-0.5">
                  {lastPlaceCount}×
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6 pb-10">

        {/* ── CAREER ARC + SEASON TABLE ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Career arc chart */}
          <div className="lg:col-span-3 bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-4">
              Career Arc · Finishing Position
            </p>
            <TeamCareerChart data={careerChartData} />
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {[
                { color: '#F59E0B', label: '1st' },
                { color: '#94A3B8', label: '2nd' },
                { color: '#C8956C', label: '3rd' },
                { color: '#60A5FA', label: 'Other' },
                { color: '#F87171', label: 'Last' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-[#94A3B8]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Season-by-season table */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
                Season History
              </p>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {[...ownerSeasons].reverse().map(s => (
                <div key={s.year} className="px-4 py-3 flex items-start gap-3">
                  <div className="text-[11px] font-mono text-[#94A3B8] shrink-0 mt-0.5 w-12">
                    {s.seasonLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0F172A] truncate">{s.teamName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-[#475569] font-mono">{s.wins}–{s.losses}</span>
                      <span className="text-[10px] text-[#94A3B8]">{s.pf.toLocaleString()} PF</span>
                      <ResultBadge
                        isChampion={s.isChampion}
                        isRunnerUp={s.isRunnerUp}
                        isThird={s.isThird}
                        isLast={s.isLast}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#64748B] shrink-0">#{s.rank}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CATEGORY PROFILE ───────────────────────────────────────────────── */}
        {categoryPercs && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-1">
              Category Profile
            </p>
            <p className="text-[11px] text-[#475569] mb-4">
              Average rank percentile across all seasons — 100 = best in league
            </p>
            <TeamCategoryRadar percs={categoryPercs} />
          </div>
        )}

        {/* ── HEAD-TO-HEAD ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
              Head-to-Head
            </p>
            <span className="text-[11px] text-[#64748B]">{h2hEntries.length} opponents</span>
          </div>

          {/* Best / worst highlight */}
          {(bestOpponent || worstOpponent) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#E2E8F0] border-b border-[#E2E8F0]">
              {bestOpponent && (
                <div className="bg-[#ECFDF5] px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981] mb-1">
                    👑 Favourite Prey
                  </p>
                  <p className="text-[16px] font-black text-[#065F46]">{bestOpponent.opponent}</p>
                  <p className="text-[13px] font-mono text-[#10B981] mt-0.5">
                    {bestOpponent.wins}–{bestOpponent.losses} &nbsp;
                    <span className="text-[11px]">({Math.round(bestOpponent.winPct * 100)}%)</span>
                  </p>
                </div>
              )}
              {worstOpponent && (
                <div className="bg-[#FEF2F2] px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F87171] mb-1">
                    😬 Kryptonite
                  </p>
                  <p className="text-[16px] font-black text-[#991B1B]">{worstOpponent.opponent}</p>
                  <p className="text-[13px] font-mono text-[#F87171] mt-0.5">
                    {worstOpponent.wins}–{worstOpponent.losses} &nbsp;
                    <span className="text-[11px]">({Math.round(worstOpponent.winPct * 100)}%)</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Full H2H table */}
          <div>
            <div className="grid grid-cols-[7rem_1fr_4rem_3rem_1.5rem] gap-x-3 px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Opponent</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">Win Rate</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">W–L</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">%</span>
              <span />
            </div>
            {h2hEntries.map(e => (
              <H2HRow
                key={e.opponent}
                opponent={e.opponent}
                wins={e.wins}
                losses={e.losses}
                highlight={
                  e.opponent === bestOpponent?.opponent && qualified.length >= 2
                    ? 'best'
                    : e.opponent === worstOpponent?.opponent && qualified.length >= 2
                    ? 'worst'
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* ── ALL-TIME RECORDS ───────────────────────────────────────────────── */}
        {mySuperlatives.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
                All-Time Records Held
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E2E8F0]">
              {mySuperlatives.map((s, i) => (
                <div key={i} className="bg-white px-5 py-4">
                  <div className="flex items-start gap-2">
                    <span className="text-[22px] shrink-0 leading-none mt-0.5">{s.emoji}</span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        {s.label}
                      </p>
                      <p className="text-[18px] font-black text-[#0F172A] leading-tight mt-0.5">
                        {s.value}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{s.teamName}</p>
                      <p className="text-[10px] text-[#94A3B8]">{s.context}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCORING PROFILE ────────────────────────────────────────────────── */}
        {ownerSeasons.length > 0 && (() => {
          const pfs = ownerSeasons.map(s => s.pf);
          const best = ownerSeasons.reduce((b, s) => s.pf > b.pf ? s : b);
          const worst = ownerSeasons.reduce((w, s) => s.pf < w.pf ? s : w);
          const avgPF = pfs.reduce((a, b) => a + b, 0) / pfs.length;
          return (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
                  Scoring Profile
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#E2E8F0]">
                <div className="px-5 py-4 text-center">
                  <p className="text-[22px] font-black text-[#34D399]">{best.pf.toLocaleString()}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Best Season PF</p>
                  <p className="text-[10px] text-[#94A3B8]">{best.seasonLabel}</p>
                </div>
                <div className="px-5 py-4 text-center">
                  <p className="text-[22px] font-black text-[#60A5FA]">{Math.round(avgPF).toLocaleString()}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Avg Season PF</p>
                </div>
                <div className="px-5 py-4 text-center">
                  <p className="text-[22px] font-black text-[#F87171]">{worst.pf.toLocaleString()}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Worst Season PF</p>
                  <p className="text-[10px] text-[#94A3B8]">{worst.seasonLabel}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── FRANCHISE FAVOURITES ────────────────────────────────────────── */}
        {favouritePlayers.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
              <span className="text-[16px]">❤️</span>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
                Franchise Favourites
              </p>
              <span className="text-[11px] text-[#CBD5E1] ml-auto">Most-drafted players in league history</span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {favouritePlayers.map((p, i) => (
                <div key={p.playerName} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Rank */}
                  <span className="text-[13px] font-black text-[#CBD5E1] w-4 shrink-0 tabular-nums">
                    {i + 1}
                  </span>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-[#0F172A]">{p.playerName}</p>
                      <span className="text-[10px] font-bold bg-[#EFF6FF] text-[#3B82F6] border border-[#BFDBFE] rounded px-1.5 py-0.5">
                        {p.position}
                      </span>
                      {p.proTeam !== '—' && (
                        <span className="text-[10px] font-semibold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-1.5 py-0.5">
                          {p.proTeam}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {p.years.sort().map(y => (
                        <span key={y} className="text-[10px] text-[#94A3B8] bg-[#F1F5F9] rounded px-1.5 py-0.5">
                          {y - 1}–{String(y).slice(2)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Draft count */}
                  <div className="shrink-0 text-right">
                    <p className="text-[20px] font-black text-[#C8956C] leading-none">{p.draftCount}×</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">drafted</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
