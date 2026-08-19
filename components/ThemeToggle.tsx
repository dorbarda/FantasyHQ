'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Theme toggle. The initial theme is applied by the inline script in
 * app/layout.tsx before first paint (so there's no flash); this component
 * only reflects and changes it afterwards.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('fhq-theme', next);
    } catch {
      /* private mode — theme just won't persist */
    }
  }

  // Render a stable placeholder until mounted so server and client markup match
  const label = !mounted ? 'Theme' : theme === 'dark' ? 'Light mode' : 'Dark mode';

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        compact
          ? 'flex items-center justify-center w-9 h-9 rounded-lg text-panel-text hover:text-panel-text-strong hover:bg-white/10 transition-colors'
          : 'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-panel-text hover:text-panel-text-strong hover:bg-white/5 transition-colors'
      }
    >
      <span className="shrink-0" suppressHydrationWarning>
        {mounted && theme === 'dark' ? (
          // Sun
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 2.5v1.5M10 16v1.5M17.5 10H16M4 10H2.5M15.3 4.7l-1 1M5.7 14.3l-1 1M15.3 15.3l-1-1M5.7 5.7l-1-1"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          // Moon
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
            <path d="M16 11.5A6.5 6.5 0 018.5 4a6.5 6.5 0 100 13 6.5 6.5 0 007.5-5.5z"
              stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {!compact && <span suppressHydrationWarning>{label}</span>}
    </button>
  );
}
