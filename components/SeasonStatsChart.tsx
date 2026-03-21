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
  { key: 'pts', label: 'PTS', color: '#C8956C' },
  { key: 'reb', label: 'REB', color: '#60A5FA' },
  { key: 'ast', label: 'AST', color: '#34D399' },
  { key: 'stl', label: 'STL', color: '#A78BFA' },
  { key: 'blk', label: 'BLK', color: '#FBBF24' },
  { key: 'tpm', label: '3PM', color: '#F472B6' },
  { key: 'to',  label: 'TO',  color: '#F87171' },
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
    <div className="border border-[#E2E8F0] rounded-lg bg-white p-4">
      {/* Stat selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STAT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setActiveStat(opt.key)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              activeStat === opt.key
                ? 'text-[#0F172A]'
                : 'bg-[#F1F5F9] text-[#94A3B8] hover:text-[#0F172A]'
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
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toLocaleString()}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={76}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#FFFFFF' }}
            contentStyle={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: option.color }}
            formatter={(val) => [val != null ? Number(val).toLocaleString() : '', option.label]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{
            position: 'right',
            fill: '#475569',
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

      <p className="text-[11px] text-[#475569] text-center mt-3">
        Season cumulative totals · sorted by selected stat · TO in red (lower is better)
      </p>
    </div>
  );
}
