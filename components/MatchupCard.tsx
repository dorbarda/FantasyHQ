import { Matchup } from '@/lib/types';

interface MatchupCardProps {
  matchup: Matchup;
}

function TeamSide({ team, isWinning, isLive }: {
  team: Matchup['home'];
  isWinning: boolean;
  isLive: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-4 px-3">
      <div className="text-center">
        <p className="text-[13px] font-semibold tracking-tight truncate max-w-[120px] text-[#111827]">
          {team.teamName}
        </p>
        <p className="text-[11px] text-[#9CA3AF]">{team.ownerName}</p>
      </div>
      <div className="text-center mt-1">
        <p className={`text-[26px] font-bold tracking-tight tabular-nums ${isWinning && isLive ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
          {isLive ? team.actualScore.toFixed(1) : team.projectedScore.toFixed(1)}
        </p>
        {isLive && (
          <p className="text-[11px] text-[#9CA3AF]">
            proj. {team.projectedScore.toFixed(1)}
          </p>
        )}
        {!isLive && (
          <p className="text-[11px] text-[#9CA3AF]">projected</p>
        )}
      </div>
    </div>
  );
}

export default function MatchupCard({ matchup }: MatchupCardProps) {
  const homeWinning = matchup.home.actualScore > matchup.away.actualScore;
  const awayWinning = matchup.away.actualScore > matchup.home.actualScore;

  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">
      {/* Live indicator row */}
      {matchup.isLive && (
        <div className="px-4 py-1.5 border-b border-[#E4E7ED] flex items-center justify-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#059669]"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#059669]">Live</span>
        </div>
      )}

      {/* Match */}
      <div className="flex items-stretch">
        <TeamSide team={matchup.home} isWinning={homeWinning} isLive={matchup.isLive} />

        {/* VS divider */}
        <div className="flex items-center justify-center px-3 border-x border-[#E4E7ED]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">vs</span>
        </div>

        <TeamSide team={matchup.away} isWinning={awayWinning} isLive={matchup.isLive} />
      </div>
    </div>
  );
}
