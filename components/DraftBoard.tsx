import { DraftBoardData, DraftPick, DraftGrade } from '@/lib/types';

interface DraftBoardProps {
  data: DraftBoardData;
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

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

// ─── Cell ─────────────────────────────────────────────────────────────────────

function PickCell({ pick, hasStats }: { pick: DraftPick; hasStats: boolean }) {
  const isINJ = pick.grade === 'INJ';
  return (
    <div className="h-full flex flex-col justify-between gap-1">
      <p className="text-[9px] font-semibold text-secondary tabular-nums">#{pick.overallPick}</p>

      <div className="flex-1">
        <p className={`text-[11px] font-semibold leading-tight truncate ${isINJ ? 'text-secondary line-through' : 'text-foreground'}`}>
          {pick.playerName}
        </p>
        <p className="text-[10px] text-secondary truncate">{pick.position} · {pick.proTeam}</p>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1">
        {hasStats && (
          <p className={`text-[10px] tabular-nums ${isINJ ? 'text-secondary' : 'text-foreground'}`}>
            {isINJ ? 'DNP' : `${pick.fp.toFixed(0)} fp`}
          </p>
        )}
        <div className="ml-auto">
          <GradeBadge grade={pick.grade} />
        </div>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items: [DraftGrade, string][] = [
    ['A+', 'Outperformed slot by 20+'],
    ['A',  'Outperformed by 10–19'],
    ['B',  'Outperformed by 4–9'],
    ['C',  'Matched slot (±3)'],
    ['D',  'Underperformed by 4–10'],
    ['F',  'Underperformed by 11+'],
    ['INJ','Did not play'],
  ];
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border bg-surface-secondary">
      {items.map(([g, label]) => (
        <div key={g} className="flex items-center gap-1">
          <GradeBadge grade={g} />
          <span className="text-[10px] text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function DraftBoard({ data }: DraftBoardProps) {
  const { teams, picks, rounds, hasStats } = data;

  const grid = new Map<string, DraftPick>();
  for (const pick of picks) {
    grid.set(`${pick.round}-${pick.draftSlot}`, pick);
  }

  const CELL_W = 128;
  const totalWidth = 64 + teams.length * CELL_W;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="sticky left-0 bg-surface-secondary w-[64px] px-2 py-2 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Rd</span>
              </th>
              {teams.map(t => (
                <th
                  key={t.teamId}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="px-2 py-2 border-l border-border text-left"
                >
                  <p className="text-[11px] font-semibold text-foreground truncate">{t.ownerName.split(' ')[0]}</p>
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
                    <td
                      key={t.teamId}
                      style={{ width: CELL_W, minWidth: CELL_W }}
                      className="px-2 py-1.5 border-l border-border align-top h-[80px]"
                    >
                      {pick ? (
                        <PickCell pick={pick} hasStats={hasStats} />
                      ) : (
                        <span className="text-[10px] text-border">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasStats && <Legend />}
      {!hasStats && (
        <div className="px-4 py-2 border-t border-border bg-surface-secondary">
          <span className="text-[11px] text-muted">Player stats unavailable for this season — grades will appear once the season ends.</span>
        </div>
      )}
    </div>
  );
}
