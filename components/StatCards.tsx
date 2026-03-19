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
      delta: myTeam.rank === 1 ? '1st place 🏆' : `${myTeam.rank - 1} back from 1st`,
      deltaColor: myTeam.rank === 1 ? 'text-[#ff7a00]' : 'text-[#536471]',
    },
    {
      label: 'WIN STREAK',
      value: `${myTeam.streak.count}${myTeam.streak.type}`,
      delta: isWinStreak ? 'On a roll!' : 'Bounce back time',
      deltaColor: isWinStreak ? 'text-[#00ba7c]' : 'text-[#f4212e]',
    },
    {
      label: 'TOTAL PTS',
      value: myTeam.points.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      delta: `${myTeam.wins}W – ${myTeam.losses}L`,
      deltaColor: 'text-[#536471]',
    },
    {
      label: 'WEEKS LEFT',
      value: String(weeksRemaining),
      delta: `Week ${currentWeek} of ${totalWeeks}`,
      deltaColor: 'text-[#536471]',
    },
  ];

  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-4">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`
              p-4 bg-white
              ${i < cards.length - 1 ? 'border-r border-[#eff3f4]' : ''}
            `}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-1">
              {card.label}
            </p>
            <p className="text-[26px] font-bold tracking-tight text-[#0f1419] leading-none mb-1">
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
