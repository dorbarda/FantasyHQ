import { HistoricalSeason } from '@/lib/types';

interface SeasonCardProps {
  season: HistoricalSeason;
}

export default function SeasonCard({ season }: SeasonCardProps) {
  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">

      {/* ── Season header ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-[#E4E7ED] bg-[#F3F4F6] flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
          {season.seasonLabel} Season
        </p>
        {season.mvpPlayer && (
          <p className="text-[11px] font-medium text-[#6B7280]">
            MVP: {season.mvpPlayer}
          </p>
        )}
      </div>

      {/* ── Champion ──────────────────────────────────────────────── */}
      {season.champion && (
        <div className="px-4 py-3 border-b border-[#E4E7ED]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[15px] font-semibold tracking-tight text-[#111827]">
                  {season.champion.teamName}
                </p>
                <span className="text-[10px] font-semibold text-[#D97706] bg-[#D97706]/10 rounded px-1.5 py-0.5">
                  Champion
                </span>
              </div>
              <p className="text-[13px] text-[#6B7280]">
                {season.champion.ownerName}
                {season.champion.wins > 0 && ` · ${season.champion.wins}–${season.champion.losses}`}
                {season.champion.pf > 0 && ` · ${season.champion.pf.toLocaleString()} PF`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Runner-up ─────────────────────────────────────────────── */}
      {season.runnerUp && (
        <div className="px-4 py-3 border-b border-[#E4E7ED]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] font-semibold tracking-tight text-[#111827]">
                {season.runnerUp.teamName}
              </p>
              <span className="text-[10px] font-semibold text-[#6B7280] border border-[#E4E7ED] rounded px-1.5 py-0.5">
                Runner-up
              </span>
            </div>
            <p className="text-[13px] text-[#6B7280]">
              {season.runnerUp.ownerName}
              {season.runnerUp.wins > 0 && ` · ${season.runnerUp.wins}–${season.runnerUp.losses}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Final Standings ───────────────────────────────────────── */}
      {season.finalStandings.length > 0 && (
        <div className="border-b border-[#E4E7ED]">
          <div className="grid grid-cols-[28px_1fr_64px_64px] gap-x-2 px-4 py-2 border-b border-[#E4E7ED] bg-[#F3F4F6]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">#</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">Team</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">W–L</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] text-right">PF</span>
          </div>

          {season.finalStandings.map((team, idx) => {
            const isChamp    = team.teamName === season.champion?.teamName;
            const isRunnerup = team.teamName === season.runnerUp?.teamName;
            const isLast     = team.teamName === season.lastPlace?.teamName;

            return (
              <div
                key={`${team.teamName}-${idx}`}
                className={`
                  grid grid-cols-[28px_1fr_64px_64px] gap-x-2 items-center px-4 py-2.5
                  ${idx < season.finalStandings.length - 1 ? 'border-b border-[#E4E7ED]' : ''}
                `}
              >
                <span className="text-[13px] font-semibold text-[#6B7280]">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-[13px] font-semibold truncate ${isChamp ? 'text-[#D97706]' : isLast ? 'text-[#DC2626]' : 'text-[#111827]'}`}>
                      {team.teamName}
                    </p>
                    {isChamp    && <span className="text-[10px] font-semibold text-[#D97706] bg-[#D97706]/10 rounded px-1 py-0.5 shrink-0">1st</span>}
                    {isRunnerup && <span className="text-[10px] font-semibold text-[#6B7280] border border-[#E4E7ED] rounded px-1 py-0.5 shrink-0">2nd</span>}
                    {isLast     && <span className="text-[10px] font-semibold text-[#DC2626] bg-[#DC2626]/10 rounded px-1 py-0.5 shrink-0">Last</span>}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] truncate">{team.ownerName}</p>
                </div>
                <span className="text-[13px] font-medium text-[#111827] text-right tabular-nums">
                  {team.wins > 0 || team.losses > 0 ? `${team.wins}–${team.losses}` : '—'}
                </span>
                <span className="text-[13px] font-medium text-[#6B7280] text-right tabular-nums">
                  {team.pf > 0 ? team.pf.toLocaleString() : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Notes ─────────────────────────────────────────────────── */}
      {season.notes && (
        <div className="px-4 py-3">
          <p className="text-[13px] text-[#6B7280] italic">
            &ldquo;{season.notes}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
