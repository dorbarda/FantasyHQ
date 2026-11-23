'use client';
/* eslint-disable @typescript-eslint/no-explicit-any -- recharts label props */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

export interface LuckDeltaEntry {
  ownerName: string;
  luckDelta: number;
  wins: number;
  expectedWins: number;
  /** Change in luck delta from last week; null in week 1. */
  change?: number | null;
}

const fmtChange = (c: number) => `${c > 0 ? '▲' : '▼'} ${Math.abs(c).toFixed(1)}`;

/** ▲/▼ change label at the outer end of each bar. */
function ChangeLabel(props: any) {
  const { x, y, width, height, index, entries } = props;
  const e: LuckDeltaEntry | undefined = entries[index];
  if (!e || e.change == null || Math.abs(e.change) < 0.05) return null;
  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const neg = e.luckDelta < 0;
  return (
    <text
      x={neg ? left - 6 : right + 6}
      y={y + height / 2}
      dy={4}
      textAnchor={neg ? 'end' : 'start'}
      fontSize={11}
      fontWeight={600}
      fill={e.change > 0 ? '#10B981' : '#EF4444'}
    >
      {fmtChange(e.change)}
    </text>
  );
}

interface Props {
  entries: LuckDeltaEntry[];
}

export default function LuckDeltaChart({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => b.luckDelta - a.luckDelta);
  // Whole-number axis with room on both sides for the ▲▼ labels
  const values = sorted.map(e => e.luckDelta);
  const lo = Math.floor(Math.min(0, ...values) - 0.6);
  const hi = Math.ceil(Math.max(0, ...values) + 0.6);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

  return (
    <ResponsiveContainer width="100%" height={300}>
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
          tickFormatter={v => (v > 0 ? `+${v}` : String(v))}
          domain={[lo, hi]}
          ticks={ticks}
        />
        <YAxis
          type="category"
          dataKey="ownerName"
          width={110}
          interval={0}
          tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
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
                {d.change != null && (
                  <p className="text-muted">vs last week: <span style={{ color: d.change > 0 ? '#10B981' : d.change < 0 ? '#EF4444' : undefined }}>
                    {d.change > 0 ? '+' : ''}{d.change.toFixed(2)}
                  </span></p>
                )}
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
          <LabelList dataKey="luckDelta" content={(p: any) => <ChangeLabel {...p} entries={sorted} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
