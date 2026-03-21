'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LuckTableEntry } from '@/lib/types';

interface Props {
  entries: LuckTableEntry[];
}

export default function PfPaScatterChart({ entries }: Props) {
  const data = entries.map(e => ({
    x: e.pf,
    y: e.pa,
    name: e.ownerName,
    diff: e.diff,
  }));

  const allVals = entries.flatMap(e => [e.pf, e.pa]);
  const minVal = Math.floor(Math.min(...allVals) * 0.97);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.03);

  return (
    <div className="border border-[#E2E8F0] rounded-lg bg-white p-4">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#34D399]" />
          <span className="text-[11px] text-[#94A3B8]">PF &gt; PA (net positive)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#F87171]" />
          <span className="text-[11px] text-[#94A3B8]">PA &gt; PF (net negative)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 border-t border-dashed border-[#94A3B8]" />
          <span className="text-[11px] text-[#94A3B8]">Break-even line</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 24, bottom: 28, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[minVal, maxVal]}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            tickFormatter={v => v.toLocaleString()}
            label={{ value: 'Points For →', position: 'insideBottomRight', offset: -4, fill: '#94A3B8', fontSize: 11 }}
            name="PF"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[minVal, maxVal]}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v.toLocaleString()}
            label={{ value: '← Points Against', angle: -90, position: 'insideLeft', offset: -4, fill: '#94A3B8', fontSize: 11 }}
            name="PA"
          />
          {/* Y = X diagonal: teams below this line have PF > PA */}
          <ReferenceLine
            segment={[{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }]}
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#E2E8F0' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px]">
                  <p className="font-semibold text-[#0F172A] mb-1">{d.name}</p>
                  <p className="text-[#94A3B8]">PF: <span className="text-[#0F172A] tabular-nums">{d.x.toLocaleString()}</span></p>
                  <p className="text-[#94A3B8]">PA: <span className="text-[#0F172A] tabular-nums">{d.y.toLocaleString()}</span></p>
                  <p className={`font-semibold ${d.diff >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                    Diff: {d.diff > 0 ? '+' : ''}{d.diff.toLocaleString()}
                  </p>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number; payload?: { name: string; diff: number } }) => {
              const { cx = 0, cy = 0, payload } = props;
              if (!payload) return <g />;
              const color = payload.diff >= 0 ? '#34D399' : '#F87171';
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill={color}
                    fillOpacity={0.8}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize={10}
                  >
                    {payload.name}
                  </text>
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-[#475569] text-center mt-1">
        Below the diagonal = PF &gt; PA · teams that scored more than they gave up all season
      </p>
    </div>
  );
}
