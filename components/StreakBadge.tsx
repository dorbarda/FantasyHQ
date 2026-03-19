import { Streak } from '@/lib/types';

interface StreakBadgeProps {
  streak: Streak;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const isWin = streak.type === 'W';
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold
        ${isWin
          ? 'bg-[#00ba7c]/10 text-[#00ba7c]'
          : 'bg-[#f4212e]/10 text-[#f4212e]'
        }
      `}
    >
      {streak.type}{streak.count}
    </span>
  );
}
