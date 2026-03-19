interface PositionBadgeProps {
  position: 'G' | 'F' | 'C';
}

const positionStyles: Record<string, string> = {
  G: 'bg-[#1d9bf0] text-white',
  F: 'bg-[#00ba7c] text-white',
  C: 'bg-[#ff7a00] text-white',
};

export default function PositionBadge({ position }: PositionBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        text-[10px] font-bold px-1.5 py-0.5 rounded
        ${positionStyles[position]}
      `}
    >
      {position}
    </span>
  );
}
