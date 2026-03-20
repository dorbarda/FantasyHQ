import { StandingEntry } from '@/lib/types';

interface StatCardsProps {
  standings: StandingEntry[];
  currentWeek: number;
  totalWeeks: number;
}

export default function StatCards({ standings, currentWeek, totalWeeks }: StatCardsProps) {
  const myTeam = standings.find((s) => s.isYou);
  if (!myTeam) return null;

  const weeksRemaining = totalWeeks - currentWeek;
  const isWinStreak = myTeam.streak.type === 'W';

  const cards = [
    {
      label: 'YOUR RANK',
      value: `#${myTeam.rank}`,
      delta: myTeam.rank === 1 ? '1st place' : `${myTeam.rank - 1} back from 1st`,
      deltaColor: myTeam.rank === 1 ? 'text-[#D97706]' : 'text-[#6B7280]',
    },
    {
      label: 'WIN STREAK',
      value: `${myTeam.streak.count}${myTeam.streak.type}`,
      delta: isWinStreak ? 'On a roll' : 'Bounce back time',
      deltaColor: isWinStreak ? 'text-[#059669]' : 'text-[#DC2626]',
    },
    {
      label: 'TOTAL PTS',
      value: myTeam.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      delta: `${myTeam.wins}W – ${myTeam.losses}L`,
      deltaColor: 'text-[#6B7280]',
    },
    {
      label: 'WEEKS LEFT',
      value: String(weeksRemaining),
      delta: `Week ${currentWeek} of ${totalWeeks}`,
      deltaColor: 'text-[#6B7280]',
    },
  ];

  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">
      <div className="grid grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`p-4 ${i < cards.length - 1 ? 'border-r border-[#E4E7ED]' : ''}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-1">
              {card.label}
            </p>
            <p className="text-[24px] font-bold tracking-tight text-[#111827] leading-none mb-1 tabular-nums">
              {card.value}
            </p>
            <p className={`text-[12px] font-medium ${card.deltaColor}`}>
              {card.delta}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
