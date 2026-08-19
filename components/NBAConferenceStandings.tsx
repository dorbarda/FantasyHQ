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
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            label === 'East'
              ? 'bg-accent/20 text-accent'
              : 'bg-warning-surface text-warning-text'
          }`}
        >
          {label === 'East' ? 'Eastern' : 'Western'} Conference
        </span>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[20px_1fr_52px_44px_36px] gap-x-2 px-3 py-2 bg-surface border-b border-border">
          <span className="text-[11px] text-secondary font-semibold">#</span>
          <span className="text-[11px] text-secondary font-semibold">Team</span>
          <span className="text-[11px] text-secondary font-semibold text-right">W-L</span>
          <span className="text-[11px] text-secondary font-semibold text-right">GB</span>
          <span className="text-[11px] text-secondary font-semibold text-right">L10</span>
        </div>

        {rows.map((row, i) => {
          const isPlayInBorder = i === 5; // line after 6th seed
          return (
            <div
              key={row.teamTricode + row.rank}
              className={`grid grid-cols-[20px_1fr_52px_44px_36px] gap-x-2 px-3 py-2.5 items-center transition-colors hover:bg-surface
                ${i < rows.length - 1 ? 'border-b border-surface-secondary' : ''}
                ${isPlayInBorder ? 'border-b-2 border-dashed border-border-strong' : ''}
              `}
            >
              {/* Rank */}
              <span className="text-[12px] font-medium text-secondary tabular-nums">{row.rank}</span>

              {/* Team */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12px] font-bold text-foreground tabular-nums shrink-0">
                  {row.teamTricode || row.teamName.slice(0, 3).toUpperCase()}
                </span>
                <span className="text-[12px] text-muted truncate hidden sm:block">
                  {row.teamName}
                </span>
                {row.clinched && (
                  <span className="text-[10px] font-semibold text-positive-bright shrink-0">
                    {row.clinched}
                  </span>
                )}
              </div>

              {/* W-L */}
              <span className="text-[12px] font-medium text-foreground text-right tabular-nums">
                {row.wins}-{row.losses}
              </span>

              {/* GB */}
              <span className="text-[12px] text-muted text-right tabular-nums">
                {row.gb === '0' || row.gb === '0.0' ? '-' : row.gb}
              </span>

              {/* L10 */}
              <span className="text-[12px] text-muted text-right tabular-nums">
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
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
        Conference Standings
      </p>
      <div className="flex gap-4 flex-col">
        <ConferenceTable label="East" rows={east} />
        <ConferenceTable label="West" rows={west} />
      </div>
      <p className="text-[11px] text-secondary mt-2">
        Dashed line separates play-in (7–10) from guaranteed playoff seeds (1–6)
      </p>
    </section>
  );
}
