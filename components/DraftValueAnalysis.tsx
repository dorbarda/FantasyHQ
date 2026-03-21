import { DraftBoardData, DraftPick } from '@/lib/types';

interface Props {
  data: DraftBoardData;
}

const TIER_SIZE = 10;

function computeBenchmarks(picks: DraftPick[]): number[] {
  const sorted = [...picks].sort((a, b) => b.fp - a.fp);
  const tierCount = Math.ceil(sorted.length / TIER_SIZE);
  return Array.from({ length: tierCount }, (_, t) => {
    const tier = sorted.slice(t * TIER_SIZE, (t + 1) * TIER_SIZE);
    return tier.reduce((sum, p) => sum + p.fp, 0) / tier.length;
  });
}

// ─── Stat boxes ───────────────────────────────────────────────────────────────

interface StatBox {
  label: string;
  name: string;
  sub: string;
  accent: string; // tailwind text color
}

function StatCard({ box }: { box: StatBox }) {
  return (
    <div className="flex-1 min-w-[160px] bg-[#0E1929] border border-[#1E3050] rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B] mb-1">{box.label}</p>
      <p className={`text-[14px] font-bold leading-tight ${box.accent}`}>{box.name}</p>
      <p className="text-[11px] text-[#94A3B8] mt-0.5">{box.sub}</p>
    </div>
  );
}

// ─── Pick cell ────────────────────────────────────────────────────────────────

function PickCell({ pick, benchmark }: { pick: DraftPick; benchmark: number }) {
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

  const fpColor = isGood ? 'text-[#34D399]' : isBad ? 'text-[#F87171]' : 'text-[#64748B]';
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DraftValueAnalysis({ data }: Props) {
  const { teams, picks, rounds, hasStats } = data;

  if (!hasStats) {
    return (
      <div className="border border-[#1E3050] rounded-lg px-6 py-10 text-center bg-[#142035]">
        <p className="text-[15px] font-bold text-[#F0F4F8]">Season stats not yet available</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">
          Value analysis will appear once the season ends and FP totals are finalized.
        </p>
      </div>
    );
  }

  const benchmarks = computeBenchmarks(picks);

  // Pick lookup: "round-draftSlot" → pick
  const grid = new Map<string, DraftPick>();
  for (const pick of picks) {
    grid.set(`${pick.round}-${pick.draftSlot}`, pick);
  }

  // Per-manager surplus & per-pick delta (excluding INJ/?)
  const surplusMap = new Map<number, number>();
  const activePicks = picks.filter(p => p.grade !== 'INJ' && p.grade !== '?');

  for (const pick of activePicks) {
    const benchmark = benchmarks[pick.round - 1] ?? 0;
    const prev = surplusMap.get(pick.teamId) ?? 0;
    surplusMap.set(pick.teamId, prev + (pick.fp - benchmark));
  }

  // ── Stat box values ─────────────────────────────────────────────────────────

  // Most surprising: largest positive (fp - benchmark)
  let mostSurprising: DraftPick | null = null;
  let mostSurprisingDelta = -Infinity;
  // Most disappointing: largest negative (fp - benchmark)
  let mostDisappointing: DraftPick | null = null;
  let mostDisappointingDelta = Infinity;

  for (const pick of activePicks) {
    const delta = pick.fp - (benchmarks[pick.round - 1] ?? 0);
    if (delta > mostSurprisingDelta) { mostSurprisingDelta = delta; mostSurprising = pick; }
    if (delta < mostDisappointingDelta) { mostDisappointingDelta = delta; mostDisappointing = pick; }
  }

  // Best / worst drafter by total surplus
  let bestDrafterId: number | null = null;
  let bestSurplus = -Infinity;
  let worstDrafterId: number | null = null;
  let worstSurplus = Infinity;

  for (const [teamId, surplus] of surplusMap) {
    if (surplus > bestSurplus) { bestSurplus = surplus; bestDrafterId = teamId; }
    if (surplus < worstSurplus) { worstSurplus = surplus; worstDrafterId = teamId; }
  }

  const teamById = new Map(teams.map(t => [t.teamId, t]));

  const statBoxes: StatBox[] = [
    {
      label: 'Most Surprising',
      name: mostSurprising?.playerName ?? '—',
      sub: mostSurprising
        ? `${mostSurprising.fp.toFixed(0)} fp · +${mostSurprisingDelta.toFixed(0)} vs benchmark`
        : '',
      accent: 'text-[#34D399]',
    },
    {
      label: 'Most Disappointing',
      name: mostDisappointing?.playerName ?? '—',
      sub: mostDisappointing
        ? `${mostDisappointing.fp.toFixed(0)} fp · ${mostDisappointingDelta.toFixed(0)} vs benchmark`
        : '',
      accent: 'text-[#F87171]',
    },
    {
      label: 'Best Drafter',
      name: bestDrafterId != null ? (teamById.get(bestDrafterId)?.ownerName ?? '—') : '—',
      sub: bestDrafterId != null ? `+${bestSurplus.toFixed(0)} total surplus` : '',
      accent: 'text-[#60A5FA]',
    },
    {
      label: 'Worst Drafter',
      name: worstDrafterId != null ? (teamById.get(worstDrafterId)?.ownerName ?? '—') : '—',
      sub: worstDrafterId != null ? `${worstSurplus.toFixed(0)} total surplus` : '',
      accent: 'text-[#FB923C]',
    },
  ];

  // ── Position comparison table data ──────────────────────────────────────────
  // Assign end-of-season rank: sort active picks by fp desc → rank 1 = best
  const rankedByFP = [...picks].sort((a, b) => b.fp - a.fp);
  const seasonRankMap = new Map<number, number>();
  rankedByFP.forEach((p, i) => seasonRankMap.set(p.playerId, i + 1));

  // Sort all picks by draft position
  const picksByDraftPos = [...picks].sort((a, b) => a.overallPick - b.overallPick);

  const CELL_W = 132;
  const totalWidth = 100 + teams.length * CELL_W;

  return (
    <div className="space-y-5">
      {/* ── 4 stat boxes ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {statBoxes.map(box => <StatCard key={box.label} box={box} />)}
      </div>

      {/* ── Main benchmark grid ───────────────────────────────────────────── */}
      <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
        <div className="overflow-x-auto">
          <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-[#1E3050] bg-[#0E1929]">
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

              {/* Surplus row */}
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

      {/* ── Position comparison table ─────────────────────────────────────── */}
      <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
        <div className="px-4 py-3 border-b border-[#1E3050] bg-[#0E1929]">
          <p className="text-[13px] font-semibold text-[#F0F4F8]">Draft Position vs. End-of-Season Rank</p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Sorted by draft position · green = ranked higher than drafted · red = ranked lower</p>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-[#1E3050] bg-[#0E1929]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-[40%]">
                  Player
                </th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-[30%]">
                  Draft Position
                </th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] w-[30%]">
                  End-of-Season Rank
                </th>
              </tr>
            </thead>
            <tbody>
              {picksByDraftPos.map(pick => {
                const seasonRank = seasonRankMap.get(pick.playerId) ?? pick.overallPick;
                const isINJ = pick.grade === 'INJ';
                const improved = !isINJ && seasonRank < pick.overallPick;
                const declined = !isINJ && seasonRank > pick.overallPick;
                const nameColor = isINJ
                  ? 'text-[#64748B] line-through'
                  : improved
                  ? 'text-[#34D399]'
                  : declined
                  ? 'text-[#F87171]'
                  : 'text-[#F0F4F8]';
                const movement = improved
                  ? `▲ ${pick.overallPick - seasonRank}`
                  : declined
                  ? `▼ ${seasonRank - pick.overallPick}`
                  : '—';
                const movColor = improved ? 'text-[#34D399]' : declined ? 'text-[#F87171]' : 'text-[#64748B]';

                return (
                  <tr key={pick.playerId} className="border-b border-[#1E3050] last:border-0 hover:bg-[#1a2d45]/40">
                    <td className="px-4 py-2">
                      <p className={`text-[12px] font-semibold ${nameColor}`}>{pick.playerName}</p>
                      <p className="text-[10px] text-[#64748B]">{pick.position} · {pick.proTeam} · {pick.ownerName.split(' ')[0]}</p>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-[12px] font-semibold tabular-nums text-[#94A3B8]">#{pick.overallPick}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {isINJ ? (
                        <span className="text-[11px] text-[#64748B]">DNP</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[12px] font-semibold tabular-nums text-[#94A3B8]">#{seasonRank}</span>
                          <span className={`text-[10px] font-medium ${movColor}`}>{movement}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
