'use client';

import { useState, useEffect } from 'react';
import type { MatchupDepthData } from '@/lib/types';
import type { MatchupDepthRow } from '@/lib/types';
import {
  LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine, LabelList,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A78BFA',
];

function ownerFirst(name: string) {
  return name.split(' ')[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamSummary {
  owner: string;
  avgScorePP: number;
  avgEfficiency: number;
  avgPlayers: number;
  avgScore: number;
  wins: number;
  losses: number;
  winRate: number;
  weeks: number;
}

function buildTeamSummaries(rows: MatchupDepthRow[]): TeamSummary[] {
  const map: Record<string, { scorePPs: number[]; efficiencies: number[]; players: number[]; scores: number[]; wins: number; losses: number }> = {};

  for (const r of rows) {
    const key = ownerFirst(r.ownerName);
    if (!map[key]) map[key] = { scorePPs: [], efficiencies: [], players: [], scores: [], wins: 0, losses: 0 };
    if (r.scorePP > 0)    map[key].scorePPs.push(r.scorePP);
    if (r.efficiency > 0) map[key].efficiencies.push(r.efficiency);
    if (r.totalPlayers > 0) map[key].players.push(r.totalPlayers);
    map[key].scores.push(r.teamScore);
    if (r.won === true)  map[key].wins++;
    if (r.won === false) map[key].losses++;
  }

  return Object.entries(map).map(([owner, d]) => {
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const weeks = d.wins + d.losses;
    return {
      owner,
      avgScorePP:    Math.round(avg(d.scorePPs) * 10) / 10,
      avgEfficiency: Math.round(avg(d.efficiencies) * 1000) / 1000,
      avgPlayers:    Math.round(avg(d.players) * 10) / 10,
      avgScore:      Math.round(avg(d.scores) * 10) / 10,
      wins:          d.wins,
      losses:        d.losses,
      winRate:       weeks > 0 ? Math.round((d.wins / weeks) * 100) : 0,
      weeks,
    };
  }).sort((a, b) => b.avgScorePP - a.avgScorePP);
}

// ─── Team Toggle Selector ─────────────────────────────────────────────────────

function TeamSelector({
  owners,
  selected,
  colorMap,
  onToggle,
  onAll,
}: {
  owners: string[];
  selected: Set<string>;
  colorMap: Record<string, string>;
  onToggle: (o: string) => void;
  onAll: () => void;
}) {
  const allSelected = selected.size === owners.length;
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      <button
        onClick={onAll}
        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
          allSelected
            ? 'bg-[#0F172A] text-white border-[#0F172A]'
            : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#94A3B8]'
        }`}
      >
        All
      </button>
      {owners.map(o => {
        const active = selected.has(o);
        const color = colorMap[o];
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
            style={{
              backgroundColor: active ? color + '22' : '#fff',
              borderColor: active ? color : '#E2E8F0',
              color: active ? color : '#94A3B8',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ─── Score/PP Over Weeks ──────────────────────────────────────────────────────

function ScorePPLineChart({
  rows, periods, owners, selected, colorMap,
}: {
  rows: MatchupDepthRow[]; periods: number[];
  owners: string[]; selected: Set<string>; colorMap: Record<string, string>;
}) {
  const data = periods.map(p => {
    const entry: Record<string, string | number> = { week: `Wk ${p}` };
    for (const owner of owners) {
      const row = rows.find(r => r.matchupPeriod === p && ownerFirst(r.ownerName) === owner);
      if (row && row.scorePP > 0) entry[owner] = row.scorePP;
    }
    return entry;
  });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Score per Player — by Week</h3>
      <p className="text-[11px] text-[#94A3B8] mb-3">Team Score ÷ Players Played each week</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
            formatter={(v: ValueType | undefined) => [`${Number(v ?? 0).toFixed(1)}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {owners.filter(o => selected.has(o)).map(owner => (
            <Line
              key={owner}
              type="monotone"
              dataKey={owner}
              stroke={colorMap[owner]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Players Played Per Week ──────────────────────────────────────────────────

function PlayersLineChart({
  rows, periods, owners, selected, colorMap,
}: {
  rows: MatchupDepthRow[]; periods: number[];
  owners: string[]; selected: Set<string>; colorMap: Record<string, string>;
}) {
  const data = periods.map(p => {
    const entry: Record<string, string | number> = { week: `Wk ${p}` };
    for (const owner of owners) {
      const row = rows.find(r => r.matchupPeriod === p && ownerFirst(r.ownerName) === owner);
      if (row && row.totalPlayers > 0) entry[owner] = row.totalPlayers;
    }
    return entry;
  });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Players Played — by Week</h3>
      <p className="text-[11px] text-[#94A3B8] mb-3">Total starter games used each week</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={36} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {owners.filter(o => selected.has(o)).map(owner => (
            <Line
              key={owner}
              type="monotone"
              dataKey={owner}
              stroke={colorMap[owner]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Team Season Summary Bars ─────────────────────────────────────────────────

import { BarChart, Bar } from 'recharts';

function TeamSummaryChart({ summaries }: { summaries: TeamSummary[] }) {
  const data = summaries.map(s => ({
    owner: s.owner,
    'Avg Score/PP': s.avgScorePP,
    'Win %': s.winRate,
  }));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Season Ranking</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Avg Score/PP · Win % — sorted by Score/PP</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis type="category" dataKey="owner" tick={{ fontSize: 10, fill: '#475569' }} width={70} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Avg Score/PP" fill="#6366F1" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Win %" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Efficiency vs Win Rate Scatter ───────────────────────────────────────────

function EfficiencyWinRateScatter({ summaries, colorMap }: { summaries: TeamSummary[]; colorMap: Record<string, string> }) {
  const data = summaries
    .filter(s => s.avgEfficiency > 0 && s.weeks > 0)
    .map(s => ({
      x: s.avgEfficiency,
      y: s.winRate,
      owner: s.owner,
    }));

  const avgEff     = data.length ? data.reduce((s, d) => s + d.x, 0) / data.length : 0;
  const avgWinRate = data.length ? data.reduce((s, d) => s + d.y, 0) / data.length : 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Efficiency vs Win Rate</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Avg efficiency ratio (Score ÷ Players²) vs season win %</p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            type="number" dataKey="x" name="Efficiency"
            domain={[0.5, 'auto']}
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            label={{ value: 'Avg Efficiency', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#94A3B8' }}
            tickFormatter={v => Number(v).toFixed(3)}
          />
          <YAxis
            type="number" dataKey="y" name="Win %"
            tick={{ fontSize: 10, fill: '#94A3B8' }} width={40}
            tickFormatter={v => `${v}%`}
            domain={[0, 100]}
          />
          <ReferenceLine x={avgEff}     stroke="#CBD5E1" strokeDasharray="4 4" />
          <ReferenceLine y={avgWinRate} stroke="#CBD5E1" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[11px] shadow-sm">
                  <p className="font-semibold text-[#0F172A]">{d.owner}</p>
                  <p className="text-[#475569]">Efficiency: {Number(d.x).toFixed(3)}</p>
                  <p className="text-[#475569]">Win rate: {d.y}%</p>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            <LabelList dataKey="owner" position="top" style={{ fontSize: 9, fill: '#475569' }} />
            {data.map((d, i) => (
              <Cell key={i} fill={colorMap[d.owner] ?? COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Players vs Score/PP Scatter ─────────────────────────────────────────────

function PlayersScorePPScatter({ rows }: { rows: MatchupDepthRow[] }) {
  const data = rows
    .filter(r => r.totalPlayers > 0 && r.scorePP > 0)
    .map(r => ({
      x: r.totalPlayers,
      y: r.scorePP,
      owner: ownerFirst(r.ownerName),
      week: r.matchupPeriod,
      won: r.won,
    }));

  const avgPlayers = data.length ? data.reduce((s, d) => s + d.x, 0) / data.length : 0;
  const avgScorePP = data.length ? data.reduce((s, d) => s + d.y, 0) / data.length : 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Players vs Score/PP</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Each dot = one team-week · green = win · red = loss</p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            type="number" dataKey="x" name="Players"
            domain={[20, 'auto']}
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            label={{ value: 'Players Played', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#94A3B8' }}
          />
          <YAxis
            type="number" dataKey="y" name="Score/PP"
            domain={[15, 'auto']}
            tick={{ fontSize: 10, fill: '#94A3B8' }} width={40}
          />
          <ReferenceLine x={avgPlayers} stroke="#CBD5E1" strokeDasharray="4 4" />
          <ReferenceLine y={avgScorePP} stroke="#CBD5E1" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[11px] shadow-sm">
                  <p className="font-semibold text-[#0F172A]">{d.owner} — Wk {d.week}</p>
                  <p className="text-[#475569]">{d.x} players · {Number(d.y).toFixed(1)} score/pp</p>
                  {d.won !== null && (
                    <p className={d.won ? 'text-[#10B981]' : 'text-[#EF4444]'}>{d.won ? 'Win' : 'Loss'}</p>
                  )}
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.won === true ? '#10B981' : d.won === false ? '#EF4444' : '#94A3B8'}
                fillOpacity={0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse">
        <div className="h-3 w-32 bg-[#F1F5F9] rounded mb-3" />
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-14 bg-[#F1F5F9] rounded-full" />
          ))}
        </div>
        <div className="h-2 w-40 bg-[#F1F5F9] rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse">
            <div className="h-3 w-40 bg-[#F1F5F9] rounded mb-2" />
            <div className="h-2 w-56 bg-[#F1F5F9] rounded mb-4" />
            <div className="h-64 bg-[#F8FAFC] rounded-lg" />
          </div>
        ))}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse">
          <div className="h-3 w-40 bg-[#F1F5F9] rounded mb-2" />
          <div className="h-2 w-56 bg-[#F1F5F9] rounded mb-4" />
          <div className="h-72 bg-[#F8FAFC] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Inner charts component (all hooks at top level) ─────────────────────────

function DepthStatsChartsInner({ rows, periods }: { rows: MatchupDepthRow[]; periods: number[] }) {
  const owners = Array.from(new Set(rows.map(r => ownerFirst(r.ownerName))));
  const colorMap: Record<string, string> = Object.fromEntries(owners.map((o, i) => [o, COLORS[i % COLORS.length]]));
  const [selected, setSelected] = useState<Set<string>>(new Set(owners));

  function toggle(owner: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(owner)) {
        if (next.size === 1) return prev;
        next.delete(owner);
      } else {
        next.add(owner);
      }
      return next;
    });
  }

  const summaries = buildTeamSummaries(rows);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">Filter teams</p>
        <TeamSelector
          owners={owners}
          selected={selected}
          colorMap={colorMap}
          onToggle={toggle}
          onAll={() => setSelected(new Set(owners))}
        />
        <p className="text-[10px] text-[#CBD5E1]">Applies to the two charts below</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScorePPLineChart rows={rows} periods={periods} owners={owners} selected={selected} colorMap={colorMap} />
        <PlayersLineChart rows={rows} periods={periods} owners={owners} selected={selected} colorMap={colorMap} />
        <TeamSummaryChart summaries={summaries} />
        <EfficiencyWinRateScatter summaries={summaries} colorMap={colorMap} />
        <div className="lg:col-span-2">
          <PlayersScorePPScatter rows={rows} />
        </div>
      </div>
    </div>
  );
}

// ─── Main export (fetches data client-side) ───────────────────────────────────

export default function DepthStatsCharts() {
  const [depthData, setDepthData] = useState<MatchupDepthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/depth-stats')
      .then(r => r.json())
      .then((d: MatchupDepthData) => { setDepthData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <ChartSkeleton />;
  if (!depthData || depthData.rows.length === 0) {
    return (
      <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center bg-white">
        <p className="text-[15px] font-semibold text-[#0F172A]">No data yet</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">Stats will appear once matchups are completed.</p>
      </div>
    );
  }

  return <DepthStatsChartsInner rows={depthData.rows} periods={depthData.completedPeriods} />;
}
