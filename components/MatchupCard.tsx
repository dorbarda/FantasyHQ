import Image from 'next/image';
import { Matchup } from '@/lib/types';
import { teamLogoSrc } from '@/lib/team-logos';

interface MatchupCardProps {
  matchup: Matchup;
}

function TeamSide({ team, isWinning, isLive, isFinal }: {
  team: Matchup['home'];
  isWinning: boolean;
  isLive: boolean;
  isFinal: boolean;
}) {
  const scoreColor =
    isFinal
      ? isWinning ? 'text-[#0F172A]' : 'text-[#475569]'
      : isLive && isWinning ? 'text-[#0F172A]' : 'text-[#94A3B8]';

  const logoSrc = teamLogoSrc(team.teamName);

  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-4 px-3">
      {logoSrc && (
        <Image src={logoSrc} alt={team.teamName} width={48} height={48} className="rounded-full object-cover object-top w-12 h-12 mb-1" />
      )}
      <div className="text-center">
        <p className="text-[13px] font-semibold tracking-tight truncate max-w-[120px] text-[#0F172A]">
          {team.teamName}
        </p>
        <p className="text-[11px] text-[#475569]">
          {team.ownerName}
          {(team.wins > 0 || team.losses > 0) && (
            <span className="text-[#475569] ml-1">· {team.wins}-{team.losses}</span>
          )}
        </p>
      </div>
      <div className="text-center mt-1">
        <p className={`text-[26px] font-bold tracking-tight tabular-nums ${scoreColor}`}>
          {(isFinal || isLive) ? team.actualScore.toFixed(1) : team.projectedScore.toFixed(1)}
        </p>
        {isLive && (
          <p className="text-[11px] text-[#475569]">proj. {team.projectedScore.toFixed(1)}</p>
        )}
        {!isLive && !isFinal && (
          <p className="text-[11px] text-[#475569]">projected</p>
        )}
        {(isLive || (!isFinal && !isLive)) && team.playersRemainingToday > 0 && (
          <p className="text-[10px] text-[#34D399] mt-0.5">
            {team.playersRemainingToday} left today
          </p>
        )}
      </div>
    </div>
  );
}

export default function MatchupCard({ matchup }: MatchupCardProps) {
  const homeWinning = matchup.home.actualScore > matchup.away.actualScore;
  const awayWinning = matchup.away.actualScore > matchup.home.actualScore;
  const h2hTotal = matchup.h2h.homeWins + matchup.h2h.awayWins;

  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      {/* Battle of the Week banner */}
      {matchup.isBattleOfWeek && (
        <div className="px-4 py-1.5 bg-[#1a2a40] border-b border-[#E2E8F0] flex items-center justify-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#F59E0B]">⚔ Battle of the Week</span>
        </div>
      )}

      {/* Live indicator */}
      {matchup.isLive && (
        <div className="px-4 py-1.5 border-b border-[#E2E8F0] flex items-center justify-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34D399]"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#34D399]">Live</span>
        </div>
      )}

      {/* Final indicator */}
      {matchup.isFinal && (
        <div className="px-4 py-1.5 border-b border-[#E2E8F0] flex items-center justify-center">
          <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest">Final</span>
        </div>
      )}

      {/* Match */}
      <div className="flex items-stretch">
        <TeamSide
          team={matchup.home}
          isWinning={homeWinning}
          isLive={matchup.isLive}
          isFinal={matchup.isFinal}
        />

        {/* VS divider */}
        <div className="flex items-center justify-center px-3 border-x border-[#E2E8F0]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#475569]">vs</span>
        </div>

        <TeamSide
          team={matchup.away}
          isWinning={awayWinning}
          isLive={matchup.isLive}
          isFinal={matchup.isFinal}
        />
      </div>

      {/* H2H footer */}
      {h2hTotal > 0 && (
        <div className="px-4 py-2 border-t border-[#E2E8F0] flex items-center justify-center">
          <span className="text-[10px] text-[#475569]">
            Season H2H:&nbsp;
            <span className="text-[#475569] font-medium">
              {matchup.home.ownerName.split(' ')[0]} {matchup.h2h.homeWins}–{matchup.h2h.awayWins} {matchup.away.ownerName.split(' ')[0]}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
