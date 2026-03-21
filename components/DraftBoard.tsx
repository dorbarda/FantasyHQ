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
      <p className="text-[9px] font-semibold text-[#475569] tabular-nums">#{pick.overallPick}</p>

      <div className="flex-1">
        <p className={`text-[11px] font-semibold leading-tight truncate ${isINJ ? 'text-[#475569] line-through' : 'text-[#0F172A]'}`}>
          {pick.playerName}
        </p>
        <p className="text-[10px] text-[#475569] truncate">{pick.position} · {pick.proTeam}</p>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1">
        {hasStats && (
          <p className={`text-[10px] tabular-nums ${isINJ ? 'text-[#475569]' : 'text-[#0F172A]'}`}>
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
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-[#E2E8F0] bg-[#F1F5F9]">
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
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table style={{ minWidth: totalWidth, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
              <th className="sticky left-0 bg-[#F1F5F9] w-[64px] px-2 py-2 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Rd</span>
              </th>
              {teams.map(t => (
                <th
                  key={t.teamId}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="px-2 py-2 border-l border-[#E2E8F0] text-left"
                >
                  <p className="text-[11px] font-semibold text-[#0F172A] truncate">{t.ownerName.split(' ')[0]}</p>
                  <p className="text-[10px] text-[#475569] truncate">{t.teamName}</p>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map(round => (
              <tr key={round} className="border-b border-[#E2E8F0] last:border-0">
                <td className="sticky left-0 bg-white px-2 py-1.5 border-r border-[#E2E8F0] align-middle">
                  <span className="text-[11px] font-semibold text-[#475569]">{round}</span>
                </td>

                {teams.map(t => {
                  const pick = grid.get(`${round}-${t.draftSlot}`);
                  return (
                    <td
                      key={t.teamId}
                      style={{ width: CELL_W, minWidth: CELL_W }}
                      className="px-2 py-1.5 border-l border-[#E2E8F0] align-top h-[80px]"
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
        <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F1F5F9]">
          <span className="text-[11px] text-[#94A3B8]">Player stats unavailable for this season — grades will appear once the season ends.</span>
        </div>
      )}
    </div>
  );
}
