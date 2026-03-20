import { Streak } from '@/lib/types';

interface StreakBadgeProps {
  streak: Streak;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const isWin = streak.type === 'W';
  return (
    <span
      className={`
        inline-flex items-center rounded px-2 py-0.5 text-[12px] font-semibold
        ${isWin
          ? 'bg-[#34D399]/10 text-[#34D399]'
          : 'bg-[#F87171]/10 text-[#F87171]'
        }
      `}
    >
      {streak.type}{streak.count}
    </span>
  );
}
