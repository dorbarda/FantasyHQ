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
    <div className="mb-4 border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-background transition-colors"
        onClick={() => setIsOpen(o => !o)}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{title}</span>
        <span className="text-muted text-[13px] font-bold">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-border bg-background">
          {children}
        </div>
      )}
    </div>
  );
}
