'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { SeasonStats } from '@/lib/types';

const STAT_OPTIONS = [
  { key: 'pts', label: 'PTS', color: 'var(--accent)' },
  { key: 'reb', label: 'REB', color: 'var(--info-bright)' },
  { key: 'ast', label: 'AST', color: 'var(--positive-bright)' },
  { key: 'stl', label: 'STL', color: '#A78BFA' },
  { key: 'blk', label: 'BLK', color: 'var(--warning)' },
  { key: 'tpm', label: '3PM', color: '#F472B6' },
  { key: 'to',  label: 'TO',  color: 'var(--negative-bright)' },
] as const;

type StatKey = typeof STAT_OPTIONS[number]['key'];

interface Props {
  stats: SeasonStats[];
}

export default function SeasonStatsChart({ stats }: Props) {
  const [activeStat, setActiveStat] = useState<StatKey>('pts');

  const option = STAT_OPTIONS.find(o => o.key === activeStat)!;
  const sorted = [...stats].sort((a, b) => b[activeStat] - a[activeStat]);
  const data = sorted.map(s => ({ name: s.ownerName, value: s[activeStat] }));
  const maxVal = data[0]?.value ?? 1;

  return (
    <div className="border border-border rounded-lg bg-surface p-4">
      {/* Stat selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STAT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setActiveStat(opt.key)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              activeStat === opt.key
                ? 'text-foreground'
                : 'bg-surface-secondary text-muted hover:text-foreground'
            }`}
            style={activeStat === opt.key ? { backgroundColor: opt.color } : {}}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(240, stats.length * 28)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
          barCategoryGap="30%"
        >
          <XAxis
            type="number"
            domain={[0, maxVal * 1.05]}
            tick={{ fill: 'var(--foreground-secondary)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toLocaleString()}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={76}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#FFFFFF' }}
            contentStyle={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: option.color }}
            formatter={(val) => [val != null ? Number(val).toLocaleString() : '', option.label]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{
            position: 'right',
            fill: 'var(--foreground-secondary)',
            fontSize: 10,
            formatter: (v: unknown) => v != null ? Number(v).toLocaleString() : '',
          }}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={option.color}
                fillOpacity={1 - (i / data.length) * 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-secondary text-center mt-3">
        Season cumulative totals · sorted by selected stat · TO in red (lower is better)
      </p>
    </div>
  );
}
