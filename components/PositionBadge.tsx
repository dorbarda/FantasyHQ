interface PositionBadgeProps {
  position: 'G' | 'F' | 'C';
}

const positionStyles: Record<string, string> = {
  G: 'bg-[#2563EB] text-white',
  F: 'bg-[#059669] text-white',
  C: 'bg-[#D97706] text-white',
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
