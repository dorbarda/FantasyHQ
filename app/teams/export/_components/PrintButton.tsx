'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#C8956C] hover:bg-[#D4A77C] text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-colors"
    >
      Print / Save PDF
    </button>
  );
}
