import { DraftBoardData, DraftPick, DraftGrade } from '@/lib/types';

interface DraftBoardProps {
  data: DraftBoardData;
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<DraftGrade, string> = {
  'A+': 'bg-[#34D399] text-white',
  'A':  'bg-[#34D399]/20 text-[#34D399]',
  'B':  'bg-[#C8956C]/15 text-[#C8956C]',
  'C':  'bg-[#6B7280]/10 text-[#94A3B8]',
  'D':  'bg-[#FB923C]/15 text-[#FB923C]',
  'F':  'bg-[#F87171]/15 text-[#F87171]',
  'INJ': 'bg-[#6B7280]/10 text-[#94A3B8]',
  '?':  'bg-[#6B7280]/10 text-[#94A3B8]',
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
      <p className="text-[9px] font-semibold text-[#64748B] tabular-nums">#{pick.overallPick}</p>

      <div className="flex-1">
        <p className={`text-[11px] font-semibold leading-tight truncate ${isINJ ? 'text-[#64748B] line-through' : 'text-[#F0F4F8]'}`}>
          {pick.playerName}
        </p>
        <p className="text-[10px] text-[#64748B] truncate">{pick.position} · {pick.proTeam}</p>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1">
        {hasStats && (
          <p className={`text-[10px] tabular-nums ${isINJ ? 'text-[#64748B]' : 'text-[#F0F4F8]'}`}>
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
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#1E3050] bg-[#0E1929]">
      {items.map(([g, label]) => (
        <div key={g} className="flex items-center gap-1">
          <GradeBadge grade={g} />
          <span className="text-[10px] text-[#94A3B8]">{label}</span>
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
    <div className="border border-[#1E3050] rounded-lg overflow-hidden bg-[#142035]">
      <div className="overflow-x-auto">
        <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-[#1E3050] bg-[#0E1929]">
              <th className="sticky left-0 bg-[#0E1929] w-[64px] px-2 py-2 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Rd</span>
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
            {Array.from({ length: rounds }, (_, i) => i + 1).map(round => (
              <tr key={round} className="border-b border-[#1E3050] last:border-0">
                <td className="sticky left-0 bg-[#142035] px-2 py-1.5 border-r border-[#1E3050] align-middle">
                  <span className="text-[11px] font-semibold text-[#64748B]">{round}</span>
                </td>

                {teams.map(t => {
                  const pick = grid.get(`${round}-${t.draftSlot}`);
                  return (
                    <td
                      key={t.teamId}
                      style={{ width: CELL_W, minWidth: CELL_W }}
                      className="px-2 py-1.5 border-l border-[#1E3050] align-top h-[80px]"
                    >
                      {pick ? (
                        <PickCell pick={pick} hasStats={hasStats} />
                      ) : (
                        <span className="text-[10px] text-[#E4E7ED]">—</span>
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
        <div className="px-4 py-2 border-t border-[#1E3050] bg-[#0E1929]">
          <span className="text-[11px] text-[#94A3B8]">Player stats unavailable for this season — grades will appear once the season ends.</span>
        </div>
      )}
    </div>
  );
}
