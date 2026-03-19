import { DraftBoardData, DraftPick, DraftGrade } from '@/lib/types';

interface DraftBoardProps {
  data: DraftBoardData;
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<DraftGrade, string> = {
  'A+': 'bg-[#00ba7c] text-white',
  'A':  'bg-[#00ba7c]/20 text-[#00ba7c]',
  'B':  'bg-[#1d9bf0]/15 text-[#1d9bf0]',
  'C':  'bg-[#536471]/10 text-[#536471]',
  'D':  'bg-[#ff7a00]/15 text-[#ff7a00]',
  'F':  'bg-[#f4212e]/15 text-[#f4212e]',
  'INJ': 'bg-[#536471]/10 text-[#536471]',
  '?':  'bg-[#536471]/10 text-[#536471]',
};

function GradeBadge({ grade }: { grade: DraftGrade }) {
  return (
    <span className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded leading-none ${GRADE_STYLES[grade]}`}>
      {grade}
    </span>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function PickCell({ pick, hasStats }: { pick: DraftPick; hasStats: boolean }) {
  const isINJ = pick.grade === 'INJ';
  return (
    <div className="h-full flex flex-col justify-between gap-1">
      {/* Pick number */}
      <p className="text-[9px] font-bold text-[#536471] tabular-nums">#{pick.overallPick}</p>

      {/* Player name */}
      <div className="flex-1">
        <p className={`text-[11px] font-bold leading-tight truncate ${isINJ ? 'text-[#536471] line-through' : 'text-[#0f1419]'}`}>
          {pick.playerName}
        </p>
        <p className="text-[10px] text-[#536471] truncate">{pick.position} · {pick.proTeam}</p>
      </div>

      {/* Stats row + grade */}
      <div className="flex items-center justify-between gap-1 mt-1">
        {hasStats && (
          <p className={`text-[10px] tabular-nums ${isINJ ? 'text-[#536471]' : 'text-[#0f1419]'}`}>
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
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#eff3f4] bg-[#f7f9f9]">
      {items.map(([g, label]) => (
        <div key={g} className="flex items-center gap-1">
          <GradeBadge grade={g} />
          <span className="text-[10px] text-[#536471]">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export default function DraftBoard({ data }: DraftBoardProps) {
  const { teams, picks, rounds, hasStats } = data;

  // Build lookup: round → draftSlot → pick
  const grid = new Map<string, DraftPick>();
  for (const pick of picks) {
    grid.set(`${pick.round}-${pick.draftSlot}`, pick);
  }

  const CELL_W = 128; // px per cell
  const totalWidth = 64 + teams.length * CELL_W; // 64px for round label col

  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
          {/* Column headers — team names */}
          <thead>
            <tr className="border-b border-[#eff3f4] bg-[#f7f9f9]">
              <th className="sticky left-0 bg-[#f7f9f9] w-[64px] px-2 py-2 text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#536471]">Rd</span>
              </th>
              {teams.map(t => (
                <th
                  key={t.teamId}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="px-2 py-2 border-l border-[#eff3f4] text-left"
                >
                  <p className="text-[11px] font-bold text-[#0f1419] truncate">{t.ownerName.split(' ')[0]}</p>
                  <p className="text-[10px] text-[#536471] truncate">{t.teamName}</p>
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows — one per round */}
          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map(round => (
              <tr key={round} className="border-b border-[#eff3f4] last:border-0">
                {/* Round label */}
                <td className="sticky left-0 bg-white px-2 py-1.5 border-r border-[#eff3f4] align-middle">
                  <span className="text-[11px] font-black text-[#536471]">{round}</span>
                </td>

                {/* Cells */}
                {teams.map(t => {
                  const pick = grid.get(`${round}-${t.draftSlot}`);
                  return (
                    <td
                      key={t.teamId}
                      style={{ width: CELL_W, minWidth: CELL_W }}
                      className="px-2 py-1.5 border-l border-[#eff3f4] align-top h-[80px]"
                    >
                      {pick ? (
                        <PickCell pick={pick} hasStats={hasStats} />
                      ) : (
                        <span className="text-[10px] text-[#eff3f4]">—</span>
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
        <div className="px-4 py-2 border-t border-[#eff3f4] bg-[#f7f9f9]">
          <span className="text-[11px] text-[#536471]">Player stats unavailable for this season — grades will appear once the season ends.</span>
        </div>
      )}
    </div>
  );
}
