import { DraftBoardData, DraftPick, DraftGrade } from '@/lib/types';

interface Props {
  data: DraftBoardData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<DraftGrade, string> = {
  'A+': 'bg-positive-bright text-white',
  'A':  'bg-positive-bright/20 text-positive-bright',
  'B':  'bg-accent/15 text-accent',
  'C':  'bg-tertiary/10 text-muted',
  'D':  'bg-warning-bright/15 text-warning-bright',
  'F':  'bg-negative-bright/15 text-negative-bright',
  'INJ': 'bg-tertiary/10 text-muted',
  '?':  'bg-tertiary/10 text-muted',
};

function GradeBadge({ grade, label }: { grade: DraftGrade; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[9px] uppercase tracking-wide text-secondary">{label}</span>
      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${GRADE_STYLES[grade]}`}>
        {grade}
      </span>
    </span>
  );
}

function fmtRank(rank: number | null, pool: number): string {
  if (rank == null) return '—';
  return rank > pool ? `>${pool}` : `#${rank}`;
}

function fmtDelta(n: number | null): string {
  if (n == null) return '—';
  return `${n > 0 ? '+' : ''}${n}`;
}

function deltaColor(n: number | null): string {
  if (n == null || n === 0) return 'text-secondary';
  return n > 0 ? 'text-positive-bright' : 'text-negative-bright';
}

function firstName(owner: string) {
  return owner.split(' ')[0];
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

interface StatBox {
  label: string;
  name: string;
  sub: string;
  accent: string; // tailwind text color
}

function StatCard({ box }: { box: StatBox }) {
  return (
    <div className="flex-1 min-w-[170px] bg-surface-secondary border border-border rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-1">{box.label}</p>
      <p className={`text-[14px] font-bold leading-tight ${box.accent}`}>{box.name}</p>
      <p className="text-[11px] text-muted mt-0.5">{box.sub}</p>
    </div>
  );
}

// ─── Grid cell ────────────────────────────────────────────────────────────────

function PickCell({ pick, pool, hasStats, hasProjections }: {
  pick: DraftPick; pool: number; hasStats: boolean; hasProjections: boolean;
}) {
  const isINJ = pick.grade === 'INJ';
  return (
    <div className="h-full flex flex-col justify-between gap-0.5">
      <div>
        <p className={`text-[11px] font-semibold leading-tight truncate ${isINJ ? 'text-secondary line-through' : 'text-foreground'}`}>
          {pick.playerName}
        </p>
        <p className="text-[10px] text-secondary truncate">{pick.position} · {pick.proTeam}</p>
      </div>
      <p className="text-[10px] text-muted tabular-nums">
        {hasProjections && <>Proj {fmtRank(pick.projRank, pool)} · </>}
        Pick #{pick.overallPick}
        {hasStats && <> · End {isINJ ? 'DNP' : fmtRank(pick.actualRank, pool)}</>}
      </p>
      <div className="flex items-center justify-between gap-1">
        {hasProjections && <GradeBadge grade={pick.decisionGrade} label="Pick" />}
        {hasStats && <GradeBadge grade={pick.grade} label="Result" />}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DraftValueAnalysis({ data }: Props) {
  const { teams, picks, rounds, hasStats, hasProjections, poolSize } = data;

  const grid = new Map<string, DraftPick>();
  for (const pick of picks) grid.set(`${pick.round}-${pick.draftSlot}`, pick);

  // Per-manager totals. Draft IQ = sum of (projected rank − pick);
  // Results = sum of (pick − final rank). Picks without a number are skipped.
  const iq = new Map<number, number>();
  const results = new Map<number, number>();
  for (const pick of picks) {
    if (pick.decision != null) iq.set(pick.teamId, (iq.get(pick.teamId) ?? 0) + pick.decision);
    if (pick.result != null) results.set(pick.teamId, (results.get(pick.teamId) ?? 0) + pick.result);
  }

  const teamById = new Map(teams.map(t => [t.teamId, t]));
  const ownerOf = (teamId: number) => firstName(teamById.get(teamId)?.ownerName ?? '—');

  const extreme = <T,>(items: T[], value: (x: T) => number | null, dir: 'max' | 'min'): T | null => {
    let best: T | null = null;
    let bestVal = dir === 'max' ? -Infinity : Infinity;
    for (const it of items) {
      const v = value(it);
      if (v == null) continue;
      if (dir === 'max' ? v > bestVal : v < bestVal) { best = it; bestVal = v; }
    }
    return best;
  };

  const steal  = extreme(picks, p => p.decision, 'max');
  const reach  = extreme(picks, p => p.decision, 'min');
  const gem    = extreme(picks, p => p.result, 'max');
  const bust   = extreme(picks, p => p.result, 'min');
  const teamIds = teams.map(t => t.teamId);
  const bestIQ  = extreme(teamIds, id => iq.get(id) ?? null, 'max');
  const worstIQ = extreme(teamIds, id => iq.get(id) ?? null, 'min');

  const pickSub = (p: DraftPick | null, v: number | null) =>
    p && v != null ? `${ownerOf(p.teamId)} · pick #${p.overallPick} · ${fmtDelta(v)}` : '';

  const statBoxes: StatBox[] = [];
  if (hasProjections) {
    statBoxes.push(
      { label: 'Biggest Steal', name: steal?.playerName ?? '—', sub: pickSub(steal, steal?.decision ?? null), accent: 'text-positive-bright' },
      { label: 'Biggest Reach', name: reach?.playerName ?? '—', sub: pickSub(reach, reach?.decision ?? null), accent: 'text-negative-bright' },
      { label: 'Smartest Drafter', name: bestIQ != null ? ownerOf(bestIQ) : '—', sub: bestIQ != null ? `${fmtDelta(iq.get(bestIQ) ?? 0)} Draft IQ` : '', accent: 'text-info-bright' },
      { label: 'Worst Draft IQ', name: worstIQ != null ? ownerOf(worstIQ) : '—', sub: worstIQ != null ? `${fmtDelta(iq.get(worstIQ) ?? 0)} Draft IQ` : '', accent: 'text-warning-bright' },
    );
  }
  if (hasStats) {
    statBoxes.push(
      { label: 'Best Pick (Result)', name: gem?.playerName ?? '—', sub: pickSub(gem, gem?.result ?? null), accent: 'text-positive-bright' },
      { label: 'Biggest Bust', name: bust?.playerName ?? '—', sub: pickSub(bust, bust?.result ?? null), accent: 'text-negative-bright' },
    );
  }

  const leaderboard = [...teams].sort(
    (a, b) => (iq.get(b.teamId) ?? -Infinity) - (iq.get(a.teamId) ?? -Infinity),
  );
  const picksByDraftPos = [...picks].sort((a, b) => a.overallPick - b.overallPick);

  const CELL_W = 150;
  const totalWidth = 56 + teams.length * CELL_W;

  return (
    <div className="space-y-5">
      {/* Status notes */}
      {data.inProgress && (
        <p className="text-[12px] text-warning-bright font-medium">
          Season in progress — through {data.gamesPlayed} games. Final ranks are by fantasy points per game
          (players with fewer than {Math.max(1, Math.round(data.gamesPlayed * 0.25))} games are not ranked).
        </p>
      )}
      {!hasStats && hasProjections && (
        <p className="text-[12px] text-muted">Season hasn&apos;t started — only the draft decision scores are available.</p>
      )}
      {!hasProjections && (
        <p className="text-[12px] text-warning-bright font-medium">ESPN projections unavailable for this season — draft decision scores can&apos;t be calculated.</p>
      )}

      {/* ── Stat cards ── */}
      {statBoxes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {statBoxes.map(box => <StatCard key={box.label} box={box} />)}
        </div>
      )}

      {/* ── Manager leaderboard ── */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary">
          <p className="text-[13px] font-semibold text-foreground">Manager Scores</p>
          <p className="text-[11px] text-secondary mt-0.5">
            Draft IQ = sum of (ESPN projected rank − pick) · Results = sum of (pick − final rank) · positive = good
          </p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Manager</th>
              {hasProjections && <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">Draft IQ</th>}
              {hasStats && <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">Results</th>}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(t => {
              const a = iq.get(t.teamId) ?? null;
              const b = results.get(t.teamId) ?? null;
              return (
                <tr key={t.teamId} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <p className="text-[12px] font-semibold text-foreground">{firstName(t.ownerName)}</p>
                    <p className="text-[10px] text-secondary">{t.teamName}</p>
                  </td>
                  {hasProjections && (
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[13px] font-bold tabular-nums ${deltaColor(a)}`}>{fmtDelta(a)}</span>
                    </td>
                  )}
                  {hasStats && (
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[13px] font-bold tabular-nums ${deltaColor(b)}`}>{fmtDelta(b)}</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Board grid ── */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="sticky left-0 bg-surface-secondary w-[56px] px-2 py-2 text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Rd</span>
                </th>
                {teams.map(t => (
                  <th key={t.teamId} style={{ width: CELL_W, minWidth: CELL_W }} className="px-2 py-2 border-l border-border text-left">
                    <p className="text-[11px] font-semibold text-foreground truncate">{firstName(t.ownerName)}</p>
                    <p className="text-[10px] text-secondary truncate">{t.teamName}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rounds }, (_, i) => i + 1).map(round => (
                <tr key={round} className="border-b border-border last:border-0">
                  <td className="sticky left-0 bg-surface px-2 py-1.5 border-r border-border align-middle">
                    <span className="text-[11px] font-semibold text-secondary">{round}</span>
                  </td>
                  {teams.map(t => {
                    const pick = grid.get(`${round}-${t.draftSlot}`);
                    return (
                      <td key={t.teamId} style={{ width: CELL_W, minWidth: CELL_W }} className="px-2 py-1.5 border-l border-border align-top h-[84px]">
                        {pick
                          ? <PickCell pick={pick} pool={poolSize} hasStats={hasStats} hasProjections={hasProjections} />
                          : <span className="text-[10px] text-border">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-t border-border bg-surface-secondary text-[11px] text-muted">
          <span><b>Proj</b> = rank by ESPN preseason projection</span>
          <span><b>Pick</b> = where the manager took the player</span>
          <span><b>End</b> = final rank by actual season output ({data.rankBasis === 'perGame' ? 'FP per game' : 'total FP'}), all players</span>
          <span><b>Pick grade</b> = projected rank vs. pick · <b>Result grade</b> = pick vs. final rank</span>
          <span>A+ ≥ +20 · A ≥ +10 · B ≥ +4 · C within ±3 · D ≥ −10 · F worse</span>
        </div>
      </div>

      {/* ── Pick-by-pick table ── */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary">
          <p className="text-[13px] font-semibold text-foreground">Every Pick</p>
          <p className="text-[11px] text-secondary mt-0.5">
            Decision = projected rank − pick · Result = pick − final rank · ranks are among all league players
          </p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-[10px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-4 py-2 text-left">Player</th>
                {hasProjections && <th className="px-3 py-2 text-center">Proj rank</th>}
                <th className="px-3 py-2 text-center">Pick</th>
                {hasStats && <th className="px-3 py-2 text-center">Final rank</th>}
                {hasProjections && <th className="px-3 py-2 text-center">Decision</th>}
                {hasStats && <th className="px-3 py-2 text-center">Result</th>}
              </tr>
            </thead>
            <tbody>
              {picksByDraftPos.map(pick => {
                const isINJ = pick.grade === 'INJ';
                return (
                  <tr key={pick.playerId} className="border-b border-border last:border-0 hover:bg-panel/40">
                    <td className="px-4 py-2">
                      <p className={`text-[12px] font-semibold ${isINJ ? 'text-secondary line-through' : 'text-foreground'}`}>{pick.playerName}</p>
                      <p className="text-[10px] text-secondary">{pick.position} · {pick.proTeam} · {firstName(pick.ownerName)}</p>
                    </td>
                    {hasProjections && (
                      <td className="px-3 py-2 text-center text-[12px] tabular-nums text-muted">{fmtRank(pick.projRank, poolSize)}</td>
                    )}
                    <td className="px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-muted">#{pick.overallPick}</td>
                    {hasStats && (
                      <td className="px-3 py-2 text-center text-[12px] tabular-nums text-muted">
                        {isINJ ? 'DNP' : fmtRank(pick.actualRank, poolSize)}
                      </td>
                    )}
                    {hasProjections && (
                      <td className={`px-3 py-2 text-center text-[12px] font-semibold tabular-nums ${deltaColor(pick.decision)}`}>{fmtDelta(pick.decision)}</td>
                    )}
                    {hasStats && (
                      <td className={`px-3 py-2 text-center text-[12px] font-semibold tabular-nums ${deltaColor(pick.result)}`}>{fmtDelta(pick.result)}</td>
                    )}
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
