import { hasEspnCredentials } from '@/lib/espn';
import { getAllRecords } from '@/lib/espn-records';
import { getAllHistoricalSeasons } from '@/lib/espn-history';
import { getDraftCountsByOwner } from '@/lib/espn-draft';
import { bestLogoForOwner } from '@/lib/team-utils';
import type { RecordsData, HistoricalSeason } from '@/lib/types';
import PrintTrigger from './_components/PrintTrigger';
import PrintButton from './_components/PrintButton';
import Image from 'next/image';

export const revalidate = 3600;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seasonLabel(year: number) {
  return `${year - 1}-${String(year).slice(2)}`;
}

function ResultBadge({ rank, isChampion, isRunnerUp, isThird, isLast }: {
  rank: number; isChampion: boolean; isRunnerUp: boolean; isThird: boolean; isLast: boolean;
}) {
  if (isChampion) return <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-full px-1.5 py-0.5">🏆 Champion</span>;
  if (isRunnerUp) return <span className="text-[10px] font-bold text-[#475569] bg-[#F1F5F9] border border-[#CBD5E1] rounded-full px-1.5 py-0.5">🥈 Runner-up</span>;
  if (isThird)   return <span className="text-[10px] font-bold text-[#9A3412] bg-[#FDF6F0] border border-[#FDBA74] rounded-full px-1.5 py-0.5">🥉 3rd</span>;
  if (isLast)    return <span className="text-[10px] font-bold text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-full px-1.5 py-0.5">🚽 Last</span>;
  return <span className="text-[10px] text-[#94A3B8]">#{rank}</span>;
}

// ─── Per-team section ─────────────────────────────────────────────────────────

function TeamExportSection({
  career, seasons, records, draftCounts,
}: {
  career: RecordsData['hallOfFame'][number];
  seasons: HistoricalSeason[];
  records: RecordsData;
  draftCounts: Awaited<ReturnType<typeof getDraftCountsByOwner>>;
}) {
  const { ownerName } = career;
  const logo = bestLogoForOwner(ownerName, seasons);

  // Season-by-season for this owner (oldest → newest)
  const ownerSeasons = seasons
    .filter(s => s.finalStandings.some(t => t.ownerName === ownerName))
    .map(s => {
      const myTeam = s.finalStandings.find(t => t.ownerName === ownerName)!;
      return {
        year: s.year,
        label: seasonLabel(s.year),
        teamName: myTeam.teamName,
        rank: myTeam.rank,
        wins: myTeam.wins,
        losses: myTeam.losses,
        pf: myTeam.pf,
        isChampion: s.champion?.ownerName === ownerName,
        isRunnerUp: s.runnerUp?.ownerName === ownerName,
        isThird: !( s.champion?.ownerName === ownerName) && !(s.runnerUp?.ownerName === ownerName) && myTeam.rank === 3,
        isLast: s.lastPlace?.ownerName === ownerName,
      };
    })
    .sort((a, b) => b.year - a.year);

  // Champion years
  const champYears = ownerSeasons.filter(s => s.isChampion).map(s => s.label);
  const avgPosition = ownerSeasons.length > 0
    ? (ownerSeasons.reduce((sum, s) => sum + s.rank, 0) / ownerSeasons.length).toFixed(1)
    : '—';

  // H2H
  const h2hRaw = records.h2hMap[ownerName] ?? {};
  const h2hEntries = Object.entries(h2hRaw)
    .map(([opp, rec]) => ({
      opponent: opp,
      wins: rec.wins,
      losses: rec.losses,
      total: rec.wins + rec.losses,
      winPct: rec.wins + rec.losses > 0 ? rec.wins / (rec.wins + rec.losses) : 0.5,
    }))
    .filter(e => e.total >= 2)
    .sort((a, b) => b.total - a.total);

  const bestOpponents  = [...h2hEntries].sort((a, b) => b.winPct - a.winPct).slice(0, 3);
  const worstOpponents = [...h2hEntries].sort((a, b) => a.winPct - b.winPct).slice(0, 3);

  // Records
  const mySuperlatives = records.superlatives.filter(s => s.ownerName === ownerName);

  // Favourites
  const favourites = (draftCounts[ownerName] ?? []).slice(0, 5);

  return (
    <div className="w-[794px] min-h-[1123px] mx-auto bg-white p-10 break-after-page print:break-after-page flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 pb-5 border-b-2 border-[#0B1628]">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#F1F5F9] shrink-0 ring-2 ring-[#E2E8F0]">
          {logo ? (
            <Image src={logo} alt={ownerName} width={80} height={80} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#94A3B8]">
              {ownerName.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-[28px] font-black text-[#0F172A] leading-tight">{ownerName}</h1>
          {ownerSeasons[0] && (
            <p className="text-[13px] text-[#64748B] mt-0.5">{ownerSeasons[0].teamName}</p>
          )}
          {champYears.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-[#92400E] uppercase tracking-wide">Champion:</span>
              {champYears.map(y => (
                <span key={y} className="text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-full px-2 py-0.5">{y}</span>
              ))}
            </div>
          )}
        </div>
        {/* Career stat pills */}
        <div className="flex gap-3 shrink-0">
          {[
            { label: 'Record', value: `${career.totalWins}–${career.totalLosses}` },
            { label: 'Win%', value: `${career.winPct}%` },
            { label: 'Avg Pts', value: `${career.avgWeeklyScore}` },
            { label: 'Avg Rank', value: `#${avgPosition}` },
            { label: 'Seasons', value: String(career.seasonsPlayed) },
          ].map(pill => (
            <div key={pill.label} className="flex flex-col items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 min-w-[52px]">
              <span className="text-[15px] font-black text-[#0F172A] leading-none">{pill.value}</span>
              <span className="text-[9px] text-[#94A3B8] uppercase tracking-wide mt-1">{pill.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Season history ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2">Season History</p>
        <table className="w-full text-[11px] border border-[#E2E8F0] rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {['Season', 'Team', 'W–L', 'PF', 'Finish'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ownerSeasons.map((s, i) => (
              <tr key={s.year} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                <td className="px-3 py-1.5 font-mono text-[#475569]">{s.label}</td>
                <td className="px-3 py-1.5 font-semibold text-[#0F172A]">{s.teamName}</td>
                <td className="px-3 py-1.5 font-mono text-[#0F172A]">{s.wins}–{s.losses}</td>
                <td className="px-3 py-1.5 text-[#475569]">{s.pf.toLocaleString()}</td>
                <td className="px-3 py-1.5">
                  <ResultBadge rank={s.rank} isChampion={s.isChampion} isRunnerUp={s.isRunnerUp} isThird={s.isThird} isLast={s.isLast} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── H2H + Records row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        {/* H2H */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2">Head-to-Head Highlights</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-semibold text-[#10B981] uppercase mb-1.5">👑 Best vs.</p>
              {bestOpponents.map(e => (
                <div key={e.opponent} className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[11px] text-[#0F172A] truncate pr-2">{e.opponent}</span>
                  <span className="text-[11px] font-mono text-[#10B981] shrink-0">{e.wins}–{e.losses}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-semibold text-[#F87171] uppercase mb-1.5">😬 Worst vs.</p>
              {worstOpponents.map(e => (
                <div key={e.opponent} className="flex justify-between items-center py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[11px] text-[#0F172A] truncate pr-2">{e.opponent}</span>
                  <span className="text-[11px] font-mono text-[#F87171] shrink-0">{e.wins}–{e.losses}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Records held */}
        {mySuperlatives.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2">Records Held</p>
            <div className="space-y-1">
              {mySuperlatives.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5 border-b border-[#F1F5F9]">
                  <span className="text-[13px] leading-none shrink-0 mt-0.5">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[#0F172A] truncate">{s.label}</p>
                    <p className="text-[10px] text-[#475569]">{s.value} · {s.context}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Franchise Favourites ───────────────────────────────────────────── */}
      {favourites.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-2">❤️ Franchise Favourites · Most-Drafted Players</p>
          <div className="grid grid-cols-5 gap-2">
            {favourites.map((p, i) => (
              <div key={p.playerName} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-center">
                <p className="text-[10px] font-black text-[#C8956C]">#{i + 1}</p>
                <p className="text-[11px] font-bold text-[#0F172A] leading-tight mt-0.5">{p.playerName}</p>
                <p className="text-[9px] text-[#64748B] mt-0.5">{p.position}{p.proTeam !== '—' ? ` · ${p.proTeam}` : ''}</p>
                <p className="text-[13px] font-black text-[#C8956C] mt-1">{p.draftCount}×</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="mt-auto pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
        <span className="text-[9px] text-[#94A3B8]">Fantasy HQ · All-time team profile</span>
        <span className="text-[9px] text-[#94A3B8]">{ownerName}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TeamsExportPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[14px] text-[#475569]">ESPN credentials required.</p>
      </div>
    );
  }

  const [records, seasons, draftCounts] = await Promise.all([
    getAllRecords(),
    getAllHistoricalSeasons(),
    getDraftCountsByOwner(),
  ]);

  return (
    <div className="bg-white">
      <PrintTrigger />
      {/* Screen-only instructions bar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-[#0B1628] text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <p className="text-[13px] font-semibold">
          Teams PDF Export · {records.hallOfFame.length} pages
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/60">Print dialog should open automatically</span>
          <PrintButton />
        </div>
      </div>
      {/* Spacer for fixed bar */}
      <div className="print:hidden h-12" />

      {records.hallOfFame.map(career => (
        <TeamExportSection
          key={career.ownerName}
          career={career}
          seasons={seasons}
          records={records}
          draftCounts={draftCounts}
        />
      ))}
    </div>
  );
}
