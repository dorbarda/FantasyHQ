'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

export interface ScatterPoint {
  ownerName: string;
  avgScore: number;
  avgScorePP: number;
  wins: number;
}

interface Props {
  points: ScatterPoint[];
}

export default function EfficiencyScatterChart({ points }: Props) {
  // First names keep the labels from piling up; full name stays in the tooltip.
  const first = (n: string) => n.split(' ')[0];
  const firstCounts = new Map<string, number>();
  for (const p of points) firstCounts.set(first(p.ownerName), (firstCounts.get(first(p.ownerName)) ?? 0) + 1);
  const data = points.map(p => ({ ...p, label: firstCounts.get(first(p.ownerName))! > 1 ? p.ownerName : first(p.ownerName) }));
  const wins = points.map(p => p.wins);
  const minW = Math.min(...wins, 0);
  const maxW = Math.max(...wins, 1);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 8, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          type="number"
          dataKey="avgScore"
          name="Avg Score"
          domain={['auto', 'auto']}
          tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          label={{ value: 'Avg Score', position: 'insideBottomRight', offset: -4, fill: 'var(--foreground-secondary)', fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="avgScorePP"
          name="Score/Player"
          domain={['auto', 'auto']}
          tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.toFixed(1)}
          label={{ value: 'Score/Player', angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--foreground-secondary)', fontSize: 11 }}
        />
        {/* Bubble size = wins. Recharts sizes scatter dots from the Z axis (range = dot area in px²). */}
        <ZAxis type="number" dataKey="wins" name="Wins" domain={[minW, maxW]} range={[50, 700]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          formatter={(value, name) => [
            name === 'Avg Score' ? Number(value).toFixed(1) : Number(value).toFixed(2),
            name as string,
          ]}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ScatterPoint;
            return (
              <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs">
                <p className="font-semibold text-foreground mb-1">{d.ownerName}</p>
                <p className="text-muted">Avg Score: <span className="text-foreground">{d.avgScore.toFixed(1)}</span></p>
                <p className="text-muted">Score/Player: <span className="text-foreground">{d.avgScorePP.toFixed(2)}</span></p>
                <p className="text-muted">Wins: <span className="text-foreground">{d.wins}</span></p>
              </div>
            );
          }}
        />
        <Scatter data={data} isAnimationActive={false}>
          {points.map((p) => (
            <Cell
              key={p.ownerName}
              fill="#60A5FA"
              fillOpacity={0.85}
              stroke="#3B82F6"
              strokeWidth={1.5}
            />
          ))}
          <LabelList
            dataKey="label"
            position="top"
            style={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
