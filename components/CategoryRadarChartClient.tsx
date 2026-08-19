'use client';

import { useState } from 'react';
import CategoryRadarChart from './CategoryRadarChart';
import type { CategoryStanding } from '@/lib/types';

const COLORS = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#E879F9', '#F87171',
];

interface Props {
  standings: CategoryStanding[];
}

export default function CategoryRadarChartClient({ standings }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(standings.map(s => s.ownerName))
  );

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(standings.map(s => s.ownerName)));
  }

  const allSelected = selected.size === standings.length;
  const filtered = standings.filter(s => selected.has(s.ownerName));

  return (
    <div>
      {/* Team filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={selectAll}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border ${
            allSelected
              ? 'bg-foreground text-white border-foreground'
              : 'bg-surface text-secondary border-border hover:border-muted'
          }`}
        >
          All
        </button>
        {standings.map((s, i) => {
          const active = selected.has(s.ownerName);
          const color = COLORS[i % COLORS.length];
          return (
            <button
              key={s.ownerName}
              onClick={() => toggle(s.ownerName)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border"
              style={{
                backgroundColor: active ? color : 'transparent',
                borderColor: color,
                color: active ? '#fff' : color,
              }}
            >
              {s.ownerName}
            </button>
          );
        })}
      </div>
      <CategoryRadarChart standings={filtered} teamCount={standings.length} />
    </div>
  );
}
