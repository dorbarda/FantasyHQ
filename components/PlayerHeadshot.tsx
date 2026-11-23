'use client';

import { useState } from 'react';

/**
 * Player headshot; initials when there is no photo.
 * source 'espn' (default): ESPN ids — fantasy player ids are ESPN athlete ids.
 * source 'nba': NBA.com ids (stats.nba.com data, e.g. the NBA stat leaders).
 */
export default function PlayerHeadshot({ playerId, name, size = 40, className = '', source = 'espn' }: {
  playerId?: number | string | null; name: string; size?: number; className?: string; source?: 'espn' | 'nba';
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
          src={source === 'nba'
            ? `https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`
            : `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=96&h=70&cb=1`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      )}
    </span>
  );
}
