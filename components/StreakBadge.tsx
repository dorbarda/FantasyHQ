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
          ? 'bg-[#059669]/10 text-[#059669]'
          : 'bg-[#DC2626]/10 text-[#DC2626]'
        }
      `}
    >
      {streak.type}{streak.count}
    </span>
  );
}
