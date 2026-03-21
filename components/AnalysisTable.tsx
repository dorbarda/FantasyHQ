'use client';

import { useState } from 'react';

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  ownerName: string;
  isYou: boolean;
  wins: number;
  losses: number;
  avgScore: number;
  scoreStdDev: number;
  bestWeekScore: number;
  bestWeekPeriod: number;
  worstWeekScore: number;
  worstWeekPeriod: number;
  avgPlayers: number;
  avgScorePP: number;
  expectedWins: number;
  luckDelta: number;
  depthAdvWins: number;
  depthAdvTotal: number;
  depthDisadvWins: number;
  depthDisadvTotal: number;
}

type SortKey = 'record' | 'avgScore' | 'bestWeek' | 'worstWeek' | 'consistency' | 'avgPlayers' | 'avgScorePP' | 'luck';

function heatColor(value: number, min: number, max: number, higherIsBetter = true): string {
  if (max === min) return '#94A3B8';
  const pct = (value - min) / (max - min);
  const adj = higherIsBetter ? pct : 1 - pct;
  if (adj >= 0.7) return '#34D399';
  if (adj >= 0.4) return '#94A3B8';
  return '#F87171';
}

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

export default function AnalysisTable({ teams }: { teams: TeamAnalytics[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('avgScore');
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...teams].sort((a, b) => {
    let av = 0, bv = 0;
    switch (sortKey) {
      case 'record':      av = a.wins; bv = b.wins; break;
      case 'avgScore':    av = a.avgScore; bv = b.avgScore; break;
      case 'bestWeek':    av = a.bestWeekScore; bv = b.bestWeekScore; break;
      case 'worstWeek':   av = a.worstWeekScore; bv = b.worstWeekScore; break;
      case 'consistency': av = a.scoreStdDev; bv = b.scoreStdDev; break; // lower is better
      case 'avgPlayers':  av = a.avgPlayers; bv = b.avgPlayers; break;
      case 'avgScorePP':  av = a.avgScorePP; bv = b.avgScorePP; break;
      case 'luck':        av = a.luckDelta; bv = b.luckDelta; break;
    }
    return sortAsc ? av - bv : bv - av;
  });

  const scores   = teams.map(t => t.avgScore);
  const bestScores = teams.map(t => t.bestWeekScore);
  const worstScores = teams.map(t => t.worstWeekScore);
  const stdDevs  = teams.map(t => t.scoreStdDev);
  const playerss = teams.map(t => t.avgPlayers);
  const sppArr   = teams.map(t => t.avgScorePP);
  const luckArr  = teams.map(t => t.luckDelta);
  const minOf = (arr: number[]) => Math.min(...arr);
  const maxOf = (arr: number[]) => Math.max(...arr);

  const Th = ({ label, sortId, title }: { label: string; sortId: SortKey; title?: string }) => (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] cursor-pointer hover:text-[#C8956C] select-none whitespace-nowrap"
      onClick={() => handleSort(sortId)}
      title={title}
    >
      {label}
      {sortKey === sortId && (
        <span className="ml-1 text-[#C8956C]">{sortAsc ? '↑' : '↓'}</span>
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full text-sm">
        <thead className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
          <tr>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-[28px]">#</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</th>
            <Th label="Record"   sortId="record"      title="Win-Loss record" />
            <Th label="Avg Score" sortId="avgScore"   title="Average weekly score" />
            <Th label="Best Wk"  sortId="bestWeek"    title="Best single-week score" />
            <Th label="Worst Wk" sortId="worstWeek"   title="Worst single-week score" />
            <Th label="Std Dev"  sortId="consistency" title="Score standard deviation — lower = more consistent" />
            <Th label="Avg PPD"  sortId="avgPlayers"  title="Average players started per day of the week" />
            <Th label="Score/PP" sortId="avgScorePP"  title="Average score per player started" />
            <Th label="Luck"     sortId="luck"        title="Actual wins minus expected wins (based on how you'd do vs every team each week)" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            return (
              <tr
                key={t.teamId}
                className={`border-b border-[#E2E8F0]/50 last:border-0 transition-colors ${t.isYou ? 'bg-[#EFF6FF]/40' : 'hover:bg-[#F1F5F9]/60'}`}
              >
                {/* Rank */}
                <td className="px-3 py-2.5 text-[13px] text-[#475569] font-mono">{i + 1}</td>

                {/* Team */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {t.isYou && (
                      <span className="text-[9px] font-bold bg-[#C8956C]/20 text-[#C8956C] border border-[#C8956C]/30 rounded px-1 py-0.5">YOU</span>
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">{t.ownerName}</p>
                      <p className="text-[11px] text-[#475569]">{t.teamName}</p>
                    </div>
                  </div>
                </td>

                {/* Record */}
                <td className="px-3 py-2.5 text-[13px] font-mono text-[#0F172A]">
                  {t.wins}<span className="text-[#475569]">-</span>{t.losses}
                </td>

                {/* Avg Score */}
                <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: heatColor(t.avgScore, minOf(scores), maxOf(scores)) }}>
                  {fmt(t.avgScore)}
                </td>

                {/* Best Week */}
                <td className="px-3 py-2.5">
                  <span className="text-[13px] font-mono" style={{ color: heatColor(t.bestWeekScore, minOf(bestScores), maxOf(bestScores)) }}>
                    {fmt(t.bestWeekScore)}
                  </span>
                  <span className="ml-1.5 text-[10px] text-[#475569]">Wk{t.bestWeekPeriod}</span>
                </td>

                {/* Worst Week */}
                <td className="px-3 py-2.5">
                  <span className="text-[13px] font-mono" style={{ color: heatColor(t.worstWeekScore, minOf(worstScores), maxOf(worstScores)) }}>
                    {fmt(t.worstWeekScore)}
                  </span>
                  <span className="ml-1.5 text-[10px] text-[#475569]">Wk{t.worstWeekPeriod}</span>
                </td>

                {/* Std Dev (lower = better) */}
                <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: heatColor(t.scoreStdDev, minOf(stdDevs), maxOf(stdDevs), false) }}>
                  {fmt(t.scoreStdDev)}
                </td>

                {/* Avg Players Per Day */}
                <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: heatColor(t.avgPlayers, minOf(playerss), maxOf(playerss)) }}>
                  {fmt(t.avgPlayers, 2)}
                </td>

                {/* Score/PP */}
                <td className="px-3 py-2.5 text-[13px] font-mono" style={{ color: heatColor(t.avgScorePP, minOf(sppArr), maxOf(sppArr)) }}>
                  {fmt(t.avgScorePP, 1)}
                </td>

                {/* Luck */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[13px] font-mono font-bold"
                      style={{ color: heatColor(t.luckDelta, minOf(luckArr), maxOf(luckArr)) }}
                    >
                      {t.luckDelta > 0 ? '+' : ''}{fmt(t.luckDelta)}
                    </span>
                    <span className="text-[10px] text-[#475569]">
                      ({t.wins}W / {fmt(t.expectedWins)}E)
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
