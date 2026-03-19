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
    <div className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 ${team.isYou ? 'bg-[#1d9bf0]/[0.03]' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-[#f7f9f9] border ${team.isYou ? 'border-[#1d9bf0]' : 'border-[#eff3f4]'}`}>
        <span className="text-[18px]">🏀</span>
      </div>
      <div className="text-center">
        <p className={`text-[13px] font-bold tracking-tight truncate max-w-[110px] ${team.isYou ? 'text-[#1d9bf0]' : 'text-[#0f1419]'}`}>
          {team.teamName}
        </p>
        <div className="flex items-center justify-center gap-1">
          <p className="text-[11px] text-[#536471] font-medium">{team.ownerName}</p>
          {team.isYou && (
            <span className="text-[10px] font-bold text-[#1d9bf0] bg-[#1d9bf0]/10 rounded px-1 shrink-0">You</span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className={`text-[24px] font-bold tracking-tight ${isWinning && isLive ? 'text-[#0f1419]' : 'text-[#536471]'}`}>
          {isLive ? team.actualScore.toFixed(1) : team.projectedScore.toFixed(1)}
        </p>
        {isLive && (
          <p className="text-[11px] text-[#536471]">
            proj. {team.projectedScore.toFixed(1)}
          </p>
        )}
        {!isLive && (
          <p className="text-[11px] text-[#536471]">projected</p>
        )}
      </div>
    </div>
  );
}

export default function MatchupCard({ matchup }: MatchupCardProps) {
  const homeWinning = matchup.home.actualScore > matchup.away.actualScore;
  const awayWinning = matchup.away.actualScore > matchup.home.actualScore;

  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      {/* Live indicator row */}
      {matchup.isLive && (
        <div className="px-4 py-2 border-b border-[#eff3f4] flex items-center justify-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ba7c]"></span>
          </span>
          <span className="text-[12px] font-bold text-[#00ba7c]">Live</span>
        </div>
      )}

      {/* Match */}
      <div className="flex items-stretch">
        <TeamSide team={matchup.home} isWinning={homeWinning} isLive={matchup.isLive} />

        {/* VS divider */}
        <div className="flex items-center justify-center px-2 border-x border-[#eff3f4]">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">vs</span>
        </div>

        <TeamSide team={matchup.away} isWinning={awayWinning} isLive={matchup.isLive} />
      </div>
    </div>
  );
}
