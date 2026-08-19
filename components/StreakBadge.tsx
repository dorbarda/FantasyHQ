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
          ? 'bg-positive-bright/10 text-positive-bright'
          : 'bg-negative-bright/10 text-negative-bright'
        }
      `}
    >
      {streak.type}{streak.count}
    </span>
  );
}
