import type { NBAConferenceStanding } from '@/lib/types';

interface Props {
  east: NBAConferenceStanding[];
  west: NBAConferenceStanding[];
}

function ConferenceTable({
  label,
  rows,
}: {
  label: string;
  rows: NBAConferenceStanding[];
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Conference header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
          {label}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            label === 'East'
              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
              : 'bg-[#FFF7ED] text-[#C2410C]'
          }`}
        >
          {label === 'East' ? 'Eastern' : 'Western'} Conference
        </span>
      </div>

      <div className="rounded-2xl border border-[#E4E7ED] overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[20px_1fr_52px_44px_36px] gap-x-2 px-3 py-2 bg-[#F8F9FB] border-b border-[#E4E7ED]">
          <span className="text-[11px] text-[#9CA3AF] font-semibold">#</span>
          <span className="text-[11px] text-[#9CA3AF] font-semibold">Team</span>
          <span className="text-[11px] text-[#9CA3AF] font-semibold text-right">W-L</span>
          <span className="text-[11px] text-[#9CA3AF] font-semibold text-right">GB</span>
          <span className="text-[11px] text-[#9CA3AF] font-semibold text-right">L10</span>
        </div>

        {rows.map((row, i) => {
          const isPlayInBorder = i === 5; // line after 6th seed
          return (
            <div
              key={row.teamTricode + row.rank}
              className={`grid grid-cols-[20px_1fr_52px_44px_36px] gap-x-2 px-3 py-2.5 items-center transition-colors hover:bg-[#F8F9FB]
                ${i < rows.length - 1 ? 'border-b border-[#F3F4F6]' : ''}
                ${isPlayInBorder ? 'border-b-2 border-dashed border-[#D1D5DB]' : ''}
              `}
            >
              {/* Rank */}
              <span className="text-[12px] font-medium text-[#9CA3AF] tabular-nums">{row.rank}</span>

              {/* Team */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] font-bold text-[#374151] tabular-nums shrink-0">
                  {row.teamTricode || row.teamName.slice(0, 3).toUpperCase()}
                </span>
                <span className="text-[12px] text-[#6B7280] truncate hidden sm:block">
                  {row.teamName}
                </span>
                {row.clinched && (
                  <span className="text-[10px] font-semibold text-[#059669] shrink-0">
                    {row.clinched}
                  </span>
                )}
              </div>

              {/* W-L */}
              <span className="text-[12px] font-medium text-[#374151] text-right tabular-nums">
                {row.wins}-{row.losses}
              </span>

              {/* GB */}
              <span className="text-[12px] text-[#6B7280] text-right tabular-nums">
                {row.gb === '0' || row.gb === '0.0' ? '-' : row.gb}
              </span>

              {/* L10 */}
              <span className="text-[12px] text-[#6B7280] text-right tabular-nums">
                {row.l10}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NBAConferenceStandings({ east, west }: Props) {
  if (east.length === 0 && west.length === 0) return null;

  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
        Conference Standings
      </p>
      <div className="flex gap-4 flex-col lg:flex-row">
        <ConferenceTable label="East" rows={east} />
        <ConferenceTable label="West" rows={west} />
      </div>
      <p className="text-[11px] text-[#9CA3AF] mt-2">
        Dashed line separates play-in (7–10) from guaranteed playoff seeds (1–6)
      </p>
    </section>
  );
}
