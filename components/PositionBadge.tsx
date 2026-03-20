interface PositionBadgeProps {
  position: 'G' | 'F' | 'C';
}

const positionStyles: Record<string, string> = {
  G: 'bg-[#C8956C] text-white',
  F: 'bg-[#34D399] text-white',
  C: 'bg-[#FB923C] text-white',
};

export default function PositionBadge({ position }: PositionBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        text-[10px] font-semibold px-1.5 py-0.5 rounded
        ${positionStyles[position]}
      `}
    >
      {position}
    </span>
  );
}
