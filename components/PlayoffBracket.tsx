import type { PlayoffBracketData, BracketMatchup, BracketTeam } from '@/lib/types';

// ─── Team row inside a matchup card ──────────────────────────────────────────

function TeamRow({
  team,
  isWinner,
  isLoser,
}: {
  team: BracketTeam;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded transition-colors
        ${isWinner ? 'bg-[#059669]/10' : isLoser ? 'bg-transparent opacity-40' : 'bg-transparent'}
      `}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-semibold text-[#9CA3AF] w-4 shrink-0">
          {team.seed > 0 ? `#${team.seed}` : ''}
        </span>
        <div className="min-w-0">
          <p className={`text-[13px] font-semibold truncate ${isWinner ? 'text-[#059669]' : 'text-[#111827]'}`}>
            {team.ownerName.split(' ')[0]}
          </p>
          <p className="text-[10px] text-[#9CA3AF] truncate">{team.teamName}</p>
        </div>
      </div>
      <span className={`text-[14px] font-bold tabular-nums shrink-0 ${isWinner ? 'text-[#059669]' : 'text-[#111827]'}`}>
        {team.score > 0 ? team.score.toFixed(1) : '—'}
      </span>
    </div>
  );
}

// ─── Single matchup card ──────────────────────────────────────────────────────

function MatchupCard({ matchup, label }: { matchup: BracketMatchup; label?: string }) {
  const { home, away, winner, isCurrentRound } = matchup;

  const homeWon = winner === 'home';
  const awayWon = winner === 'away';
  const ongoing = winner === null;

  return (
    <div
      className={`rounded-lg border overflow-hidden min-w-[200px]
        ${isCurrentRound ? 'border-[#2563EB]/40 shadow-sm' : 'border-[#E4E7ED]'}
      `}
    >
      {label && (
        <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest
          ${isCurrentRound ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#F3F4F6] text-[#6B7280]'}
        `}>
          {label}
        </div>
      )}
      <div className="p-1 bg-white">
        <TeamRow team={home} isWinner={homeWon} isLoser={!ongoing && awayWon} />
        <div className="border-t border-[#E4E7ED] mx-2" />
        {away ? (
          <TeamRow team={away} isWinner={awayWon} isLoser={!ongoing && homeWon} />
        ) : (
          <div className="px-3 py-2 text-[12px] text-[#9CA3AF] italic">BYE</div>
        )}
      </div>
      {ongoing && isCurrentRound && (
        <div className="flex items-center gap-1 px-3 pb-2 bg-white">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2563EB]" />
          </span>
          <span className="text-[10px] font-semibold text-[#2563EB]">Live</span>
        </div>
      )}
    </div>
  );
}

// ─── Connector arrow between rounds ──────────────────────────────────────────

function Connector() {
  return (
    <div className="flex items-center self-stretch px-1 text-[#E4E7ED] select-none">
      <svg width="20" height="100%" viewBox="0 0 20 60" fill="none" className="h-full min-h-[60px]">
        <path d="M2 30 L18 30" stroke="#E4E7ED" strokeWidth="1.5" />
        <path d="M14 26 L18 30 L14 34" stroke="#E4E7ED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Round column ─────────────────────────────────────────────────────────────

function RoundLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
      {label}
    </p>
  );
}

function roundName(round: number, totalRounds: number) {
  if (round === totalRounds)     return 'Finals';
  if (round === totalRounds - 1) return 'Semi-Finals';
  if (round === totalRounds - 2) return 'Quarter-Finals';
  return `Round ${round}`;
}

// ─── Main bracket ─────────────────────────────────────────────────────────────

export default function PlayoffBracket({ data }: { data: PlayoffBracketData }) {
  const { winners, consolation, champion, totalRounds } = data;

  const rounds: BracketMatchup[][] = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push(winners.filter(m => m.round === r));
  }

  const hasConsolation = consolation.length > 0;

  return (
    <div>
      {/* Main bracket header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-[22px] font-bold tracking-tight text-[#111827]">Playoff Bracket</h2>
        {data.isPlayoffs && (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
            </span>
            In Progress
          </span>
        )}
      </div>

      {/* Winners bracket */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max">
          {rounds.map((roundMatchups, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col" style={{ width: 220 }}>
                <RoundLabel label={roundName(i + 1, totalRounds)} />
                <div
                  className="flex flex-col"
                  style={{
                    gap: i === 0 ? 12 : `${(rounds[0]?.length ?? 1) * 0}px`,
                    justifyContent: 'space-around',
                    minHeight: i === 0 ? 'auto' : `${(rounds[0]?.length ?? 1) * 108 + ((rounds[0]?.length ?? 1) - 1) * 12}px`,
                  }}
                >
                  {roundMatchups.map(m => (
                    <MatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </div>

              {i < rounds.length - 1 ? (
                <Connector />
              ) : champion ? (
                <div className="flex items-center pl-4 self-stretch">
                  <div className="flex items-center gap-3 bg-[#059669]/10 border border-[#059669]/30 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#059669]">Champion</p>
                      <p className="text-[15px] font-bold text-[#111827]">{champion.ownerName.split(' ')[0]}</p>
                      <p className="text-[11px] text-[#6B7280]">{champion.teamName}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Consolation bracket */}
      {hasConsolation && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
            3rd Place
          </p>
          <div className="flex flex-wrap gap-3">
            {consolation.map(m => (
              <MatchupCard key={m.id} matchup={m} />
            ))}
          </div>
        </div>
      )}

      {/* Playoff seeds */}
      {winners.length > 0 && (
        <div className="mt-8 border-t border-[#E4E7ED] pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
            Playoff Seeds
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Map([
              ...winners.flatMap(m => [m.home, m.away].filter(Boolean) as BracketTeam[]),
              ...consolation.flatMap(m => [m.home, m.away].filter(Boolean) as BracketTeam[]),
            ].map(t => [t!.teamId, t!])).values())
              .sort((a, b) => a.seed - b.seed)
              .map(team => (
                <div
                  key={team.teamId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[12px]
                    ${champion?.teamId === team.teamId ? 'border-[#059669] bg-[#059669]/5' : 'border-[#E4E7ED] bg-white'}
                  `}
                >
                  <span className="text-[#9CA3AF] font-semibold">#{team.seed}</span>
                  <span className="text-[#111827]">{team.ownerName.split(' ')[0]}</span>
                  {champion?.teamId === team.teamId && (
                    <span className="text-[10px] font-semibold text-[#059669]">Champion</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
