'use client';
import { useState } from 'react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AnalyticsAccordionSection({ title, defaultOpen = false, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-[#E2E8F0] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[#F8FAFC] transition-colors"
        onClick={() => setIsOpen(o => !o)}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">{title}</span>
        <span className="text-[#94A3B8] text-[13px] font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          {children}
        </div>
      )}
    </div>
  );
}
