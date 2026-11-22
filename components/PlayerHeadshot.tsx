'use client';

import { useState } from 'react';

/** ESPN headshot (fantasy player ids are ESPN athlete ids); initials when ESPN has none. */
export default function PlayerHeadshot({ playerId, name, size = 40 }: { playerId: number; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('');
  return (
    <span
      className="shrink-0 rounded-full overflow-hidden bg-surface-secondary border border-border flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span className="text-[11px] font-bold text-secondary">{initials}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- remote ESPN headshot, fixed size
        <img
          src={`https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${playerId}.png&w=96&h=70&cb=1`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover object-top"
        />
      )}
    </span>
  );
}
