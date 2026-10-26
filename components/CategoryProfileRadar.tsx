'use client';

import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  PROFILE_KEYS,
  PROFILE_LABELS,
  formatProfileValue,
  type CategoryProfile,
} from '@/lib/category-profile';

const COLORS = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#E879F9', '#F87171',
];

interface Props {
  profile: CategoryProfile;
}

export default function CategoryProfileRadar({ profile }: Props) {
  const { teams, leaders } = profile;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(teams.map(t => t.teamId))
  );

  function toggle(teamId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        if (next.size > 1) next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  const allSelected = selected.size === teams.length;
  const colorOf = (teamId: string) => COLORS[teams.findIndex(t => t.teamId === teamId) % COLORS.length];
  const shown = teams.filter(t => selected.has(t.teamId));

  // One data point per category; each team is one Radar line keyed by teamId.
  // The real value rides along under `<teamId>__value` for the tooltip.
  const data = PROFILE_KEYS.map(key => {
    const point: Record<string, string | number> = { category: PROFILE_LABELS[key], key };
    for (const t of teams) {
      point[t.teamId] = t.stats[key].score;
      point[`${t.teamId}__value`] = t.stats[key].value;
    }
    return point;
  });

  return (
    <div>
      {/* Team filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setSelected(new Set(teams.map(t => t.teamId)))}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
            allSelected
              ? 'bg-foreground text-white border-foreground'
              : 'bg-surface text-secondary border-border hover:border-muted'
          }`}
        >
          All
        </button>
        {teams.map(t => {
          const active = selected.has(t.teamId);
          const color = colorOf(t.teamId);
          return (
            <button
              key={t.teamId}
              onClick={() => toggle(t.teamId)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border"
              style={{
                backgroundColor: active ? color : 'transparent',
                borderColor: color,
                color: active ? '#fff' : color,
              }}
            >
              {t.ownerName}
            </button>
          );
        })}
      </div>

      <div className="border border-border rounded-lg bg-surface p-4">
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={data} margin={{ top: 12, right: 32, bottom: 4, left: 32 }}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: 'var(--foreground-muted)', fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {shown.map(t => (
              <Radar
                key={t.teamId}
                name={t.ownerName}
                dataKey={t.teamId}
                stroke={colorOf(t.teamId)}
                fill={colorOf(t.teamId)}
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
              formatter={(value, name, item) => {
                const p = item?.payload as Record<string, string | number> | undefined;
                const teamId = String(item?.dataKey ?? '');
                const raw = p?.[`${teamId}__value`];
                const key = p?.key as (typeof PROFILE_KEYS)[number] | undefined;
                const shownValue = key && typeof raw === 'number' ? formatProfileValue(key, raw) : '';
                return [`${shownValue} (score ${value ?? ''})`, String(name)];
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-secondary text-center mt-1">
          Score = rank percentile · 100 = league leader · STOCKS = STL + BLK · TO: lower is better (inverted)
        </p>
      </div>

      {/* Category leaders */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-5 mb-2">
        Category Leaders
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {leaders.map(l => (
          <div key={l.key} className="bg-surface border border-border rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{l.label}</p>
            <p className="text-[13px] font-bold text-foreground leading-tight mt-0.5">
              {l.ownerNames.join(' / ')}
            </p>
            <p className="text-[11px] text-secondary mt-0.5">{formatProfileValue(l.key, l.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
