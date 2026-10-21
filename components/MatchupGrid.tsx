'use client';

import { useCallback, useState } from 'react';
import type { Matchup } from '@/lib/types';
import type { TeamProjection } from '@/lib/week-projections';
import type { MatchupDaily } from '@/lib/week-daily';
import MatchupCard from './MatchupCard';
import MatchupDetail from './MatchupDetail';

export interface MatchupDetailData {
  projection: { home: TeamProjection; away: TeamProjection } | null;
  notes: string[];
  /** Future week: computed from today's rosters, not the frozen file. */
  isPreview?: boolean;
  /** Win probability by day + daily lines; null for a future week. */
  daily?: MatchupDaily | null;
}

/** A grid of matchup cards; tapping one opens its detail pop-up. */
export default function MatchupGrid({ matchups, details }: {
  matchups: Matchup[];
  /** Keyed by matchup id. */
  details: Record<string, MatchupDetailData>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const open = matchups.find(m => m.id === openId);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchups.map(matchup => (
          <button
            key={matchup.id}
            type="button"
            onClick={() => setOpenId(matchup.id)}
            className="block w-full text-left rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={`${matchup.home.teamName} vs ${matchup.away.teamName} — details`}
          >
            <MatchupCard matchup={matchup} daily={details[matchup.id]?.daily ?? null} />
          </button>
        ))}
      </div>
      {open && (
        <MatchupDetail
          matchup={open}
          projection={details[open.id]?.projection ?? null}
          notes={details[open.id]?.notes ?? []}
          isPreview={details[open.id]?.isPreview ?? false}
          daily={details[open.id]?.daily ?? null}
          onClose={close}
        />
      )}
    </>
  );
}
