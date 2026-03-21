import { DraftBoardData, DraftPick } from '@/lib/types';

interface Props {
  data: DraftBoardData;
}

const TIER_SIZE = 10;

// Sort all picks by fp desc, split into tiers of TIER_SIZE, compute avg per tier
function computeBenchmarks(picks: DraftPick[]): number[] {
  const sorted = [...picks].sort((a, b) => b.fp - a.fp);
  const tierCount = Math.ceil(sorted.length / TIER_SIZE);
  return Array.from({ length: tierCount }, (_, t) => {
    const tier = sorted.slice(t * TIER_SIZE, (t + 1) * TIER_SIZE);
    return tier.reduce((sum, p) => sum + p.fp, 0) / tier.length;
  });
}

function PickCell({
  pick,
  benchmark,
}: {
  pick: DraftPick;
  benchmark: number;
}) {
  const isINJ = pick.grade === 'INJ';
  const isUnknown = pick.grade === '?';
  const delta = pick.fp - benchmark;
  const isGood = !isINJ && !isUnknown && delta >= 0;
  const isBad = !isINJ && !isUnknown && delta < 0;

  const bg = isGood
    ? 'bg-[#34D399]/10 border-[#34D399]/20'
    : isBad
    ? 'bg-[#F87171]/10 border-[#F87171]/20'
    : 'bg-[#6B7280]/10 border-[#1E3050]';

  const fpColor = isGood
    ? 'text-[#34D399]'
    : isBad
    ? 'text-[#F87171]'
    : 'text-[#64748B]';

  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <div className={`h-full flex flex-col justify-between gap-0.5 px-2 py-1.5 rounded border ${bg}`}>
      <p className={`text-[11px] font-semibold leading-tight truncate ${isINJ ? 'text-[#64748B] line-through' : 'text-[#F0F4F8]'}`}>
        {pick.playerName}
      </p>
      <p className="text-[10px] text-[#64748B] truncate">{pick.position} · {pick.proTeam}</p>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <span className={`text-[10px] font-semibold tabular-nums ${fpColor}`}>
          {isINJ ? 'DNP' : isUnknown ? '—' : `${pick.fp.toFixed(0)} fp`}
        </span>
        {!isINJ && !isUnknown && (
          <span className={`text-[10px] tabular-nums ${fpColor}`}>
            {deltaSign}{delta.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DraftValueAnalysis({ data }: Props) {
  const { teams, picks, rounds, hasStats } = data;

  if (!hasStats) {
    return (
      <div className="border border-[#1E3050] rounded-lg px-6 py-10 text-center bg-[#142035]">
        <p className="text-[15px] font-bold text-[#F0F4F8]">Season stats not yet available</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">Value analysis will appear once the season ends and FP totals are finalized.</p>
      </div>
    );
  }

  const benchmarks = computeBenchmarks(picks);

  // Build pick lookup: round → draftSlot → pick
  const grid = new Map<string, DraftPick>();
  for (const pick of picks) {
    grid.set(`${pick.round}-${pick.draftSlot}`, pick);
  }

  // Per-manager surplus (sum of deltas, excluding INJ/?)
  const surplusMap = new Map<number, number>();
  for (const pick of picks) {
    if (pick.grade === 'INJ' || pick.grade === '?') continue;
    const benchmark = benchmarks[pick.round - 1] ?? 0;
    const prev = surplusMap.get(pick.teamId) ?? 0;
    surplusMap.set(pick.teamId, prev + (pick.fp - benchmark));
  }

  const CELL_W = 132;
  const totalWidth = 100 + teams.length * CELL_W;

  return (
    <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
      <div className="overflow-x-auto">
        <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-[#1E3050] bg-[#0E1929]">
              {/* Benchmark column header */}
              <th className="sticky left-0 bg-[#0E1929] w-[100px] px-2 py-2 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Rd / Avg</span>
              </th>
              {teams.map(t => (
                <th
                  key={t.teamId}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="px-2 py-2 border-l border-[#1E3050] text-left"
                >
                  <p className="text-[11px] font-semibold text-[#F0F4F8] truncate">{t.ownerName.split(' ')[0]}</p>
                  <p className="text-[10px] text-[#64748B] truncate">{t.teamName}</p>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map(round => {
              const benchmark = benchmarks[round - 1] ?? 0;
              return (
                <tr key={round} className="border-b border-[#1E3050] last:border-0">
                  {/* Round label + benchmark avg */}
                  <td className="sticky left-0 bg-[#142035] px-2 py-2 border-r border-[#1E3050] align-top">
                    <p className="text-[11px] font-bold text-[#94A3B8]">Rd {round}</p>
                    <p className="text-[10px] text-[#64748B] tabular-nums mt-0.5">{benchmark.toFixed(0)} avg</p>
                  </td>

                  {teams.map(t => {
                    const pick = grid.get(`${round}-${t.draftSlot}`);
                    return (
                      <td
                        key={t.teamId}
                        style={{ width: CELL_W, minWidth: CELL_W }}
                        className="px-1.5 py-1.5 border-l border-[#1E3050] align-top h-[76px]"
                      >
                        {pick ? (
                          <PickCell pick={pick} benchmark={benchmark} />
                        ) : (
                          <span className="text-[10px] text-[#64748B]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total surplus row */}
            <tr className="bg-[#0E1929] border-t-2 border-[#2A4066]">
              <td className="sticky left-0 bg-[#0E1929] px-2 py-2 border-r border-[#1E3050]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Surplus</p>
              </td>
              {teams.map(t => {
                const surplus = surplusMap.get(t.teamId) ?? 0;
                const isPos = surplus >= 0;
                return (
                  <td
                    key={t.teamId}
                    style={{ width: CELL_W, minWidth: CELL_W }}
                    className="px-2 py-2 border-l border-[#1E3050] text-center"
                  >
                    <span className={`text-[13px] font-bold tabular-nums ${isPos ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                      {isPos ? '+' : ''}{surplus.toFixed(0)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-[#1E3050] bg-[#0E1929] text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#34D399]/20 border border-[#34D399]/30 inline-block" />
          Beat round benchmark
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#F87171]/20 border border-[#F87171]/30 inline-block" />
          Below round benchmark
        </div>
        <span className="text-[#64748B]">
          Benchmark = avg FP of top-{TIER_SIZE} players per performance tier · delta shown per pick · Surplus = sum of all deltas
        </span>
      </div>
    </div>
  );
}
