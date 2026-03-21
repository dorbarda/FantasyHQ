'use client';

import { useState, useTransition, useCallback } from 'react';
import { searchPlayerHistory, PlayerHistoryResult, PlayerSeasonData } from '@/app/draft/actions';
import type { DraftGrade } from '@/lib/types';

// ─── Grade badge (mirrors DraftBoard) ────────────────────────────────────────

const GRADE_STYLES: Record<DraftGrade, string> = {
  'A+': 'bg-[#34D399] text-white',
  'A':  'bg-[#34D399]/20 text-[#34D399]',
  'B':  'bg-[#C8956C]/15 text-[#C8956C]',
  'C':  'bg-[#6B7280]/10 text-[#94A3B8]',
  'D':  'bg-[#FB923C]/15 text-[#FB923C]',
  'F':  'bg-[#F87171]/15 text-[#F87171]',
  'INJ': 'bg-[#6B7280]/10 text-[#94A3B8]',
  '?':  'bg-[#6B7280]/10 text-[#94A3B8]',
};

function GradeBadge({ grade }: { grade: DraftGrade }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${GRADE_STYLES[grade]}`}>
      {grade}
    </span>
  );
}

// ─── SVG line chart ───────────────────────────────────────────────────────────

function PickChart({ seasons }: { seasons: PlayerSeasonData[] }) {
  if (seasons.length < 2) return null;

  const W = 480;
  const H = 110;
  const ML = 36; // left margin (Y axis labels)
  const MR = 12;
  const MT = 12;
  const MB = 28; // bottom margin (X axis labels)

  const chartW = W - ML - MR;
  const chartH = H - MT - MB;

  const picks = seasons.map(s => s.overallPick);
  const maxPick = Math.max(...picks);
  const minPick = Math.min(...picks);
  // Add a bit of padding so dots aren't clipped
  const yPad = Math.max(3, Math.round((maxPick - minPick) * 0.2));
  const yMin = Math.max(1, minPick - yPad);
  const yMax = maxPick + yPad;

  const xOf = (i: number) => ML + (i / (seasons.length - 1)) * chartW;
  // pick scale is inverted: lower pick # = better = higher on chart
  const yOf = (pick: number) =>
    MT + ((pick - yMin) / (yMax - yMin)) * chartH;

  const points = seasons.map((s, i) => ({ x: xOf(i), y: yOf(s.overallPick) }));
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Y axis ticks (3 ticks)
  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: H }}
    >
      {/* Grid lines */}
      {yTicks.map(t => {
        const y = yOf(t).toFixed(1);
        return (
          <g key={t}>
            <line
              x1={ML} y1={y} x2={W - MR} y2={y}
              stroke="#E2E8F0" strokeWidth="1"
            />
            <text
              x={ML - 5} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#64748B"
            >
              #{t}
            </text>
          </g>
        );
      })}

      {/* X axis labels */}
      {seasons.map((s, i) => (
        <text
          key={s.year}
          x={xOf(i).toFixed(1)}
          y={H - 6}
          textAnchor="middle"
          fontSize="9"
          fill="#64748B"
        >
          {s.seasonLabel}
        </text>
      ))}

      {/* Line */}
      <path d={linePath} fill="none" stroke="#2A4066" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={seasons[i].year}>
          <circle cx={p.x} cy={p.y} r="4" fill="#3B6CC8" />
          <text
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#94A3B8"
          >
            #{seasons[i].overallPick}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ result }: { result: PlayerHistoryResult }) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F1F5F9] flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] font-semibold text-[#0F172A]">{result.playerName}</p>
          <p className="text-[12px] text-[#475569] mt-0.5">
            {result.seasons[0].position} · {result.seasons[0].proTeam}
          </p>
        </div>
        <div className="flex gap-5 text-right shrink-0">
          <div>
            <p className="text-[11px] text-[#475569] uppercase tracking-wide">Seasons</p>
            <p className="text-[20px] font-bold text-[#0F172A] leading-none mt-0.5">
              {result.seasons.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#475569] uppercase tracking-wide">Avg Pick</p>
            <p className="text-[20px] font-bold text-[#0F172A] leading-none mt-0.5">
              #{result.avgPick}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#475569] uppercase tracking-wide">Avg Grade</p>
            <div className="mt-1.5">
              <GradeBadge grade={result.avgGrade as DraftGrade} />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {result.seasons.length >= 2 && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] text-[#475569] uppercase tracking-wide mb-2">Draft Position by Season</p>
          <PickChart seasons={result.seasons} />
        </div>
      )}

      {/* Season rows */}
      <div className="divide-y divide-[#E2E8F0]">
        {result.seasons.map(s => (
          <div key={s.year} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
            <span className="text-[#94A3B8] w-14 shrink-0">{s.seasonLabel}</span>
            <span className="text-[#0F172A] font-medium w-10 shrink-0">#{s.overallPick}</span>
            <GradeBadge grade={s.grade} />
            <span className="text-[#475569] ml-auto truncate">{s.ownerName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function PlayerHistoryTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerHistoryResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const data = await searchPlayerHistory(value);
      setResults(data);
    });
  }, []);

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search player name…"
          className="w-full max-w-md pl-9 pr-4 py-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] text-[14px] placeholder-[#64748B] focus:outline-none focus:border-[#2A4066] transition-colors"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#475569]">
            Loading…
          </span>
        )}
      </div>

      {/* Empty state */}
      {!isPending && results !== null && results.length === 0 && (
        <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center max-w-md">
          <p className="text-[15px] font-bold text-[#0F172A]">No results</p>
          <p className="text-[13px] text-[#94A3B8] mt-1">
            No player matching &ldquo;{query}&rdquo; found in draft history.
          </p>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-4 max-w-2xl">
          {results.map(r => (
            <PlayerCard key={r.playerName} result={r} />
          ))}
        </div>
      )}

      {/* Idle hint */}
      {results === null && !isPending && (
        <p className="text-[13px] text-[#475569]">
          Type at least 2 characters to search across all draft years.
        </p>
      )}
    </div>
  );
}
