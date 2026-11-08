'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky chapter menu for the home page: tap to glide to a chapter; the
 * chapter on screen is highlighted as you scroll.
 */
export default function HomeChapterNav({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [active, setActive] = useState(chapters[0]?.id);

  useEffect(() => {
    const els = chapters.map(c => document.getElementById(c.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    // A chapter is "on screen" once its top passes ~40% down the viewport.
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [chapters]);

  return (
    <nav
      aria-label="Home sections"
      className="sticky top-14 md:top-0 z-30 bg-background/90 backdrop-blur border-b border-border"
    >
      <div className="flex gap-2 px-4 sm:px-6 py-2.5 overflow-x-auto">
        {chapters.map(c => (
          <a
            key={c.id}
            href={`#${c.id}`}
            aria-current={active === c.id ? 'true' : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              active === c.id
                ? 'bg-foreground text-background'
                : 'bg-surface border border-border text-secondary hover:text-foreground'
            }`}
          >
            {c.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
