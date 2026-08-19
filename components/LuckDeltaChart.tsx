'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';

export interface LuckDeltaEntry {
  ownerName: string;
  luckDelta: number;
  wins: number;
  expectedWins: number;
}

interface Props {
  entries: LuckDeltaEntry[];
}

export default function LuckDeltaChart({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => b.luckDelta - a.luckDelta);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 32, bottom: 4, left: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          tickFormatter={v => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
        />
        <YAxis
          type="category"
          dataKey="ownerName"
          width={72}
          tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="#334155" strokeWidth={1.5} />
        <Tooltip
          cursor={{ fill: 'var(--border)', fillOpacity: 0.4 }}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as LuckDeltaEntry;
            return (
              <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs">
                <p className="font-semibold text-foreground mb-1">{d.ownerName}</p>
                <p className="text-muted">
                  Luck delta: <span style={{ color: d.luckDelta >= 0 ? '#34D399' : '#F87171' }}>
                    {d.luckDelta >= 0 ? '+' : ''}{d.luckDelta.toFixed(2)}
                  </span>
                </p>
                <p className="text-muted">Actual wins: <span className="text-foreground">{d.wins}</span></p>
                <p className="text-muted">Expected wins: <span className="text-foreground">{d.expectedWins.toFixed(1)}</span></p>
              </div>
            );
          }}
        />
        <Bar dataKey="luckDelta" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {sorted.map((entry) => (
            <Cell
              key={entry.ownerName}
              fill={entry.luckDelta >= 0 ? '#34D399' : '#F87171'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
