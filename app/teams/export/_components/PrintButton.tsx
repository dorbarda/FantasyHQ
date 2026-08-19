'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-accent hover:bg-accent-hover text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-colors"
    >
      Print / Save PDF
    </button>
  );
}
