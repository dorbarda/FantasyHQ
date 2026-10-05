import { DraftBoardData, DraftPick, DraftGrade } from '@/lib/types';

interface Props {
  data: DraftBoardData;
}

/** Manager IQ and highlight cards only count these rounds (late picks are noise). */
const SCORE_ROUNDS = 10;

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

function GradeBadge({ grade }: { grade: DraftGrade }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${GRADE_STYLES[grade]}`}>
      {grade}
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

function PickCell({ pick, pool }: { pick: DraftPick; pool: number }) {
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
        Pick #{pick.overallPick} → {isINJ ? 'DNP' : `Finished ${fmtRank(pick.actualRank, pool)}`}
      </p>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[11px] font-bold tabular-nums ${deltaColor(pick.result)}`}>{fmtDelta(pick.result)}</span>
        <GradeBadge grade={pick.grade} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DraftValueAnalysis({ data }: Props) {
  const { teams, picks, rounds, hasStats, poolSize } = data;

  if (!hasStats) {
    return (
      <div className="border border-border rounded-lg px-6 py-10 text-center bg-surface">
        <p className="text-[15px] font-bold text-foreground">Season hasn&apos;t started</p>
        <p className="text-[13px] text-muted mt-1">
          Draft IQ appears once players have played games and can be ranked.
        </p>
      </div>
    );
  }

  const grid = new Map<string, DraftPick>();
  for (const pick of picks) grid.set(`${pick.round}-${pick.draftSlot}`, pick);

  // Draft IQ per pick = pick number − final rank (positive = finished better than drafted).
  // Manager IQ = sum over rounds 1..SCORE_ROUNDS, every pick weighted equally.
  const scored = picks.filter(p => p.round <= SCORE_ROUNDS && p.result != null);
  const iq = new Map<number, number>();
  for (const p of scored) iq.set(p.teamId, (iq.get(p.teamId) ?? 0) + (p.result as number));

  const teamById = new Map(teams.map(t => [t.teamId, t]));
  const ownerOf = (teamId: number) => firstName(teamById.get(teamId)?.ownerName ?? '—');

  const extreme = <T,>(items: T[], value: (x: T) => number, dir: 'max' | 'min'): T | null => {
    let best: T | null = null;
    let bestVal = dir === 'max' ? -Infinity : Infinity;
    for (const it of items) {
      const v = value(it);
      if (dir === 'max' ? v > bestVal : v < bestVal) { best = it; bestVal = v; }
    }
    return best;
  };

  const gem  = extreme(scored, p => p.result as number, 'max');
  const bust = extreme(scored, p => p.result as number, 'min');
  const teamIds = teams.map(t => t.teamId).filter(id => iq.has(id));
  const bestMgr  = extreme(teamIds, id => iq.get(id) as number, 'max');
  const worstMgr = extreme(teamIds, id => iq.get(id) as number, 'min');

  const pickSub = (p: DraftPick | null) =>
    p ? `${ownerOf(p.teamId)} · pick #${p.overallPick} → finished ${fmtRank(p.actualRank, poolSize)} · ${fmtDelta(p.result)}` : '';

  const statBoxes: StatBox[] = [
    { label: 'Best Pick', name: gem?.playerName ?? '—', sub: pickSub(gem), accent: 'text-positive-bright' },
    { label: 'Biggest Bust', name: bust?.playerName ?? '—', sub: pickSub(bust), accent: 'text-negative-bright' },
    { label: 'Highest Draft IQ', name: bestMgr != null ? ownerOf(bestMgr) : '—', sub: bestMgr != null ? `${fmtDelta(iq.get(bestMgr) ?? 0)} total` : '', accent: 'text-info-bright' },
    { label: 'Lowest Draft IQ', name: worstMgr != null ? ownerOf(worstMgr) : '—', sub: worstMgr != null ? `${fmtDelta(iq.get(worstMgr) ?? 0)} total` : '', accent: 'text-warning-bright' },
  ];

  const picksByDraftPos = [...picks].sort((a, b) => a.overallPick - b.overallPick);

  const CELL_W = 150;
  const totalWidth = 56 + teams.length * CELL_W;

  return (
    <div className="space-y-5">
      {data.inProgress && (
        <p className="text-[12px] text-warning-bright font-medium">
          Season in progress — through {data.gamesPlayed} games. Final ranks are by fantasy points per game
          (players with fewer than {Math.max(1, Math.round(data.gamesPlayed * 0.25))} games are not ranked).
        </p>
      )}

      {/* ── Stat cards ── */}
      <div className="flex flex-wrap gap-3">
        {statBoxes.map(box => <StatCard key={box.label} box={box} />)}
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
                {teams.map(t => {
                  const score = iq.get(t.teamId) ?? null;
                  return (
                    <th key={t.teamId} style={{ width: CELL_W, minWidth: CELL_W }} className="px-2 py-2 border-l border-border text-left">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[11px] font-semibold text-foreground truncate">{firstName(t.ownerName)}</p>
                        <span className={`text-[13px] font-bold tabular-nums ${deltaColor(score)}`} title={`Draft IQ, rounds 1–${SCORE_ROUNDS}`}>
                          {fmtDelta(score)}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary truncate">{t.teamName}</p>
                    </th>
                  );
                })}
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
                      <td key={t.teamId} style={{ width: CELL_W, minWidth: CELL_W }} className="px-2 py-1.5 border-l border-border align-top h-[78px]">
                        {pick ? <PickCell pick={pick} pool={poolSize} /> : <span className="text-[10px] text-border">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-t border-border bg-surface-secondary text-[11px] text-muted">
          <span><b>Draft IQ</b> = pick number − final rank (rank among all league players by {data.rankBasis === 'perGame' ? 'FP per game' : 'total FP'}). Positive = finished better than drafted.</span>
          <span>Number next to each manager = total IQ of rounds 1–{SCORE_ROUNDS}.</span>
          <span>A+ ≥ +20 · A ≥ +10 · B ≥ +4 · C within ±3 · D ≥ −10 · F worse</span>
        </div>
      </div>

      {/* ── Pick-by-pick table ── */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary">
          <p className="text-[13px] font-semibold text-foreground">Every Pick</p>
          <p className="text-[11px] text-secondary mt-0.5">Draft IQ = pick number − final rank</p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-[10px] font-semibold uppercase tracking-widest text-muted">
                <th className="px-4 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-center">Pick</th>
                <th className="px-3 py-2 text-center">Final rank</th>
                <th className="px-3 py-2 text-center">Draft IQ</th>
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
                    <td className="px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-muted">#{pick.overallPick}</td>
                    <td className="px-3 py-2 text-center text-[12px] tabular-nums text-muted">
                      {isINJ ? 'DNP' : fmtRank(pick.actualRank, poolSize)}
                    </td>
                    <td className={`px-3 py-2 text-center text-[12px] font-semibold tabular-nums ${deltaColor(pick.result)}`}>{fmtDelta(pick.result)}</td>
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
