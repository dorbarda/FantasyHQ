'use client';

import { useState } from 'react';

/** ESPN headshot (fantasy player ids are ESPN athlete ids); initials when ESPN has none. */
export default function PlayerHeadshot({ playerId, name, size = 40, className = '' }: {
  playerId?: number | string | null; name: string; size?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Accepts ids like `p3112335` (lib/espn.ts getPlayers) as well as numbers.
  const id = typeof playerId === 'string' ? Number(playerId.replace(/^p/, '')) : playerId;
  const valid = typeof id === 'number' && Number.isFinite(id) && id > 0;
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('');
  return (
    <span
      className={`shrink-0 rounded-full overflow-hidden bg-surface-secondary border border-border flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {failed || !valid ? (
        <span className="font-bold text-secondary" style={{ fontSize: Math.max(8, Math.round(size * 0.3)) }}>{initials}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote ESPN headshot, fixed size
        <img
          src={`https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70&cb=1`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      )}
    </span>
  );
}
