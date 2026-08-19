'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
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
        <Scatter data={points} isAnimationActive={false}>
          {points.map((p) => (
            <Cell
              key={p.ownerName}
              fill="#60A5FA"
              fillOpacity={0.85}
              stroke="#3B82F6"
              strokeWidth={1.5}
              r={6 + p.wins * 1.2}
            />
          ))}
          <LabelList
            dataKey="ownerName"
            position="top"
            style={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
