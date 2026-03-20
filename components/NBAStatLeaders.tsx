import type { NBAStatLeader, NBAStatLeadersData } from '@/lib/types';

interface Props {
  leaders: NBAStatLeadersData;
}

const STAT_CONFIGS: {
  key: keyof NBAStatLeadersData;
  label: string;
  unit: string;
  color: string;
}[] = [
  { key: 'pts', label: 'Points', unit: 'PPG', color: '#F4212E' },
  { key: 'reb', label: 'Rebounds', unit: 'RPG', color: '#FF7A00' },
  { key: 'ast', label: 'Assists', unit: 'APG', color: '#1D9BF0' },
  { key: 'stl', label: 'Steals', unit: 'SPG', color: '#00BA7C' },
  { key: 'blk', label: 'Blocks', unit: 'BPG', color: '#7C3AED' },
  { key: 'tpm', label: '3-Pointers', unit: '3PG', color: '#D97706' },
];

function StatCard({
  label,
  unit,
  color,
  players,
}: {
  label: string;
  unit: string;
  color: string;
  players: NBAStatLeader[];
}) {
  return (
    <div className="rounded-2xl border border-[#1E3050] overflow-hidden">
      {/* Card header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <span className="text-[13px] font-bold text-[#F0F4F8]">{label}</span>
        <span className="text-[11px] font-semibold text-[#64748B]">{unit}</span>
      </div>

      <div className="divide-y divide-[#F3F4F6]">
        {players.length === 0 ? (
          <div className="px-4 py-3 text-[12px] text-[#64748B]">No data</div>
        ) : (
          players.map((p) => (
            <div key={p.playerId} className="px-4 py-2.5 flex items-center gap-3">
              {/* Rank medal */}
              <span
                className="text-[11px] font-bold w-5 text-center shrink-0"
                style={{
                  color:
                    p.rank === 1
                      ? '#D97706'
                      : p.rank === 2
                      ? '#9CA3AF'
                      : '#92400E',
                }}
              >
                {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}
              </span>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#F0F4F8] truncate leading-tight">
                  {p.playerName}
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  {p.team} · {p.gp} GP
                </p>
              </div>

              {/* Value */}
              <span
                className="text-[15px] font-bold tabular-nums shrink-0"
                style={{ color }}
              >
                {p.value.toFixed(1)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function NBAStatLeaders({ leaders }: Props) {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
        Season Stat Leaders · Per Game
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CONFIGS.map((cfg) => (
          <StatCard
            key={cfg.key}
            label={cfg.label}
            unit={cfg.unit}
            color={cfg.color}
            players={leaders[cfg.key]}
          />
        ))}
      </div>
    </section>
  );
}
