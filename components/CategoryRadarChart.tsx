'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CategoryStanding } from '@/lib/types';

const COLORS = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#E879F9', '#F87171',
];

const CATEGORY_KEYS = ['fgPct', 'ftPct', 'tpm', 'reb', 'ast', 'stl', 'blk', 'to', 'pts'] as const;
const CATEGORY_LABELS: Record<typeof CATEGORY_KEYS[number], string> = {
  fgPct: 'FG%', ftPct: 'FT%', tpm: '3PM', reb: 'REB',
  ast: 'AST', stl: 'STL', blk: 'BLK', to: 'TO', pts: 'PTS',
};

interface Props {
  standings: CategoryStanding[];
  teamCount: number;
}

export default function CategoryRadarChart({ standings, teamCount }: Props) {
  // Each category = one data point; each team = one Radar line
  // Score = inverted rank percentile (100 = best, 0 = worst)
  const data = CATEGORY_KEYS.map(key => {
    const point: Record<string, string | number> = { category: CATEGORY_LABELS[key] };
    standings.forEach(team => {
      point[team.ownerName] = Math.round(((teamCount + 1 - team[key].rank) / teamCount) * 100);
    });
    return point;
  });

  return (
    <div className="border border-border rounded-lg bg-surface p-4">
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={data} margin={{ top: 12, right: 32, bottom: 4, left: 32 }}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: 'var(--foreground-muted)', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {standings.map((team, i) => (
            <Radar
              key={team.teamId}
              name={team.ownerName}
              dataKey={team.ownerName}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.06}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          <Tooltip
            contentStyle={{
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: 'var(--foreground)' }}
            formatter={(value, name) => [`${value ?? ''}`, String(name)]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--foreground-muted)', paddingTop: 8 }}
            iconType="line"
            iconSize={12}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-secondary text-center mt-1">
        Score = rank percentile · 100 = league leader in that category · TO: lower is better (inverted)
      </p>
    </div>
  );
}
