'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface WeeklyTrendEntry {
  ownerName: string;
  isYou: boolean;
  week: number;
  scorePP: number;
}

interface Props {
  entries: WeeklyTrendEntry[];
}

// Fixed palette — "you" always gets the gold accent
const PALETTE = [
  '#60A5FA', '#34D399', '#F472B6', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#E879F9',
  '#FBBF24', '#F87171',
];

export default function WeeklyTrendChart({ entries }: Props) {
  // Get sorted unique weeks
  const weekSet = new Set(entries.map(e => e.week));
  const weeks = Array.from(weekSet).sort((a, b) => a - b);

  // Get unique owners, "you" first
  const ownerMap = new Map(entries.map(e => [e.ownerName, e.isYou]));
  const owners = Array.from(ownerMap.entries())
    .sort((a, b) => (b[1] ? 1 : 0) - (a[1] ? 1 : 0));

  // Build recharts data: [{week, Owner1: scorePP, Owner2: scorePP, ...}]
  const data = weeks.map(w => {
    const row: Record<string, number | string> = { week: `Wk ${w}` };
    for (const entry of entries.filter(e => e.week === w)) {
      if (entry.scorePP > 0) row[entry.ownerName] = parseFloat(entry.scorePP.toFixed(2));
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.toFixed(1)}
        />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94A3B8', marginBottom: 4 }}
          itemStyle={{ color: '#0F172A' }}
          formatter={(value) => [`${Number(value).toFixed(2)} pts/player`]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 8 }}
          formatter={(value, entry) => (
            <span style={{ color: (entry as { color?: string }).color }}>{value}</span>
          )}
        />
        {owners.map(([owner, isYou], i) => (
          <Line
            key={owner}
            type="monotone"
            dataKey={owner}
            stroke={isYou ? '#C8956C' : PALETTE[i % PALETTE.length]}
            strokeWidth={isYou ? 2.5 : 1.5}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
