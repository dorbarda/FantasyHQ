'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CategoryPercentiles } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  fgPct: 'FG%', ftPct: 'FT%', tpm: '3PM', reb: 'REB',
  ast: 'AST', stl: 'STL', blk: 'BLK', to: 'TO', pts: 'PTS',
};

const KEYS = ['fgPct', 'ftPct', 'tpm', 'reb', 'ast', 'stl', 'blk', 'to', 'pts'] as const;

interface Props {
  percs: CategoryPercentiles;
  color?: string;
}

export default function TeamCategoryRadar({ percs, color = '#60A5FA' }: Props) {
  const data = KEYS.map(key => ({
    category: CATEGORY_LABELS[key],
    value: percs[key],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 12, right: 32, bottom: 4, left: 32 }}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={percs.ownerName}
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: '#0F172A' }}
            formatter={(value) => [`${value}`, 'Percentile']}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-[#475569] text-center mt-1">
        Avg rank percentile across {percs.seasonsCount} season{percs.seasonsCount !== 1 ? 's' : ''} · 100 = league leader · TO: lower is better (inverted)
      </p>
    </div>
  );
}
