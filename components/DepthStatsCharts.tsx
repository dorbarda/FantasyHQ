'use client';

import type { MatchupDepthRow } from '@/lib/types';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A78BFA',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ownerFirst(name: string) {
  return name.split(' ')[0];
}

interface TeamSummary {
  owner: string;
  avgScorePP: number;
  avgPlayers: number;
  avgScore: number;
  wins: number;
  losses: number;
  winRate: number;
  weeks: number;
}

function buildTeamSummaries(rows: MatchupDepthRow[]): TeamSummary[] {
  const map: Record<string, { scorePPs: number[]; players: number[]; scores: number[]; wins: number; losses: number }> = {};

  for (const r of rows) {
    const key = ownerFirst(r.ownerName);
    if (!map[key]) map[key] = { scorePPs: [], players: [], scores: [], wins: 0, losses: 0 };
    if (r.scorePP > 0) map[key].scorePPs.push(r.scorePP);
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
      avgScorePP:  Math.round(avg(d.scorePPs) * 10) / 10,
      avgPlayers:  Math.round(avg(d.players) * 10) / 10,
      avgScore:    Math.round(avg(d.scores) * 10) / 10,
      wins:        d.wins,
      losses:      d.losses,
      winRate:     weeks > 0 ? Math.round((d.wins / weeks) * 100) : 0,
      weeks,
    };
  }).sort((a, b) => b.avgScorePP - a.avgScorePP);
}

// ─── Score/PP Over Weeks ──────────────────────────────────────────────────────

function ScorePPLineChart({ rows, periods }: { rows: MatchupDepthRow[]; periods: number[] }) {
  const owners = Array.from(new Set(rows.map(r => ownerFirst(r.ownerName))));

  const data = periods.map(p => {
    const entry: Record<string, any> = { week: `Wk ${p}` };
    for (const owner of owners) {
      const row = rows.find(r => r.matchupPeriod === p && ownerFirst(r.ownerName) === owner);
      if (row && row.scorePP > 0) entry[owner] = row.scorePP;
    }
    return entry;
  });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Score per Player — by Week</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Team Score ÷ Players Played each week</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
            formatter={(v: any) => [`${Number(v).toFixed(1)}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {owners.map((owner, i) => (
            <Line
              key={owner}
              type="monotone"
              dataKey={owner}
              stroke={COLORS[i % COLORS.length]}
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

function PlayersBarChart({ rows, periods }: { rows: MatchupDepthRow[]; periods: number[] }) {
  const owners = Array.from(new Set(rows.map(r => ownerFirst(r.ownerName))));

  const data = periods.map(p => {
    const entry: Record<string, any> = { week: `Wk ${p}` };
    for (const owner of owners) {
      const row = rows.find(r => r.matchupPeriod === p && ownerFirst(r.ownerName) === owner);
      if (row && row.totalPlayers > 0) entry[owner] = row.totalPlayers;
    }
    return entry;
  });

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Players Played — by Week</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Total starter games used each week</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {owners.map((owner, i) => (
            <Line
              key={owner}
              type="monotone"
              dataKey={owner}
              stroke={COLORS[i % COLORS.length]}
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

function TeamSummaryChart({ summaries }: { summaries: TeamSummary[] }) {
  const data = summaries.map(s => ({
    owner: s.owner,
    'Avg Score/PP': s.avgScorePP,
    'Win %': s.winRate,
  }));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Season Ranking</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Avg Score/PP (left) · Win % (right) — sorted by Score/PP</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis type="category" dataKey="owner" tick={{ fontSize: 10, fill: '#475569' }} width={70} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Avg Score/PP" fill="#6366F1" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Win %" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Efficiency Scatter ───────────────────────────────────────────────────────

function EfficiencyScatter({ rows }: { rows: MatchupDepthRow[] }) {
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
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            type="number" dataKey="x" name="Players"
            tick={{ fontSize: 10, fill: '#94A3B8' }} label={{ value: 'Players Played', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94A3B8' }}
            height={36}
          />
          <YAxis
            type="number" dataKey="y" name="Score/PP"
            tick={{ fontSize: 10, fill: '#94A3B8' }} width={40}
          />
          <ReferenceLine x={avgPlayers} stroke="#CBD5E1" strokeDasharray="4 4" />
          <ReferenceLine y={avgScorePP} stroke="#CBD5E1" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }}
            formatter={(v: any, name: any) => [
              name === 'Players' ? v : Number(v).toFixed(1),
              name,
            ]}
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

// ─── Win Rate Bar ─────────────────────────────────────────────────────────────

function WinRateChart({ summaries }: { summaries: TeamSummary[] }) {
  const sorted = [...summaries].sort((a, b) => b.winRate - a.winRate);
  const data = sorted.map(s => ({
    owner: s.owner,
    Wins: s.wins,
    Losses: s.losses,
  }));

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <h3 className="text-[13px] font-bold text-[#0F172A] mb-1">Win / Loss Record</h3>
      <p className="text-[11px] text-[#94A3B8] mb-4">Sorted by most wins</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <YAxis type="category" dataKey="owner" tick={{ fontSize: 10, fill: '#475569' }} width={70} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Wins" stackId="wl" fill="#10B981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Losses" stackId="wl" fill="#F87171" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DepthStatsCharts({ rows, periods }: { rows: MatchupDepthRow[]; periods: number[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-[#E2E8F0] rounded-lg px-6 py-10 text-center bg-white">
        <p className="text-[15px] font-semibold text-[#0F172A]">No data yet</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">Stats will appear once matchups are completed.</p>
      </div>
    );
  }

  const summaries = buildTeamSummaries(rows);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ScorePPLineChart rows={rows} periods={periods} />
      <PlayersBarChart rows={rows} periods={periods} />
      <TeamSummaryChart summaries={summaries} />
      <WinRateChart summaries={summaries} />
      <div className="lg:col-span-2">
        <EfficiencyScatter rows={rows} />
      </div>
    </div>
  );
}
