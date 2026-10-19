'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { Matchup, MatchupTeam } from '@/lib/types';
import type { TeamProjection } from '@/lib/week-projections';
import { teamLogoSrc } from '@/lib/team-logos';

interface Props {
  matchup: Matchup;
  /** Frozen start-of-week numbers, sides matching `matchup`; null if the week wasn't frozen. */
  projection: { home: TeamProjection; away: TeamProjection } | null;
  notes: string[];
  isPreview: boolean;
  onClose: () => void;
}

function fmt(n: number) {
  return n.toFixed(1);
}

function TeamHead({ team }: { team: MatchupTeam }) {
  const logo = teamLogoSrc(team.teamName);
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1">
      {logo && (
        <Image src={logo} alt="" width={56} height={56} className="rounded-full object-cover object-top w-14 h-14" priority />
      )}
      <p className="text-[14px] font-semibold text-foreground leading-tight break-words">{team.teamName}</p>
      <p className="text-[11px] text-secondary">
        {team.ownerName}
        {(team.wins > 0 || team.losses > 0) && <span> · {team.wins}-{team.losses}</span>}
      </p>
    </div>
  );
}

/** One "left vs right" tile. `higherWins` false means the lower number is better (injuries). */
function Tile({ label, left, right, format = String, higherWins = true }: {
  label: string;
  left: number;
  right: number;
  format?: (n: number) => string;
  higherWins?: boolean;
}) {
  const leftLeads = higherWins ? left > right : left < right;
  const rightLeads = higherWins ? right > left : right < left;
  const cls = (leads: boolean) => `tabular-nums text-[17px] font-bold ${leads ? 'text-foreground' : 'text-secondary'}`;
  return (
    <div className="rounded-lg border border-border bg-surface-secondary px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-1">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cls(leftLeads)}>{format(left)}</span>
        <span className={cls(rightLeads)}>{format(right)}</span>
      </div>
    </div>
  );
}

function KeyPlayers({ team }: { team: TeamProjection }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-semibold text-foreground truncate mb-1.5">{team.teamName}</p>
      <ul className="space-y-1.5">
        {team.keyPlayers.map(p => (
          <li key={p.name} className="rounded-md bg-surface-secondary px-2.5 py-1.5">
            <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
            <p className="text-[11px] text-secondary tabular-nums">
              {p.pos} · {p.nba} · avg {fmt(p.avg)} ·{' '}
              <span className={p.games <= 2 ? 'text-warning font-semibold' : 'text-foreground font-semibold'}>
                {p.games} {p.games === 1 ? 'game' : 'games'}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MatchupDetail({ matchup, projection, notes, isPreview, onClose }: Props) {
  // Esc closes; the page behind doesn't scroll while the pop-up is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const { home, away, isLive, isFinal } = matchup;
  const started = isLive || isFinal;
  const homeScore = started ? home.actualScore : projection?.home.projectedPoints ?? home.projectedScore;
  const awayScore = started ? away.actualScore : projection?.away.projectedPoints ?? away.projectedScore;
  const scoreCls = (mine: number, theirs: number) =>
    `tabular-nums text-[28px] font-bold ${isFinal && mine < theirs ? 'text-secondary' : 'text-foreground'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${home.teamName} vs ${away.teamName}`}
        className="relative w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-surface border border-border rounded-t-2xl sm:rounded-2xl px-4 sm:px-6 pt-4 pb-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 inline-flex items-center justify-center rounded-full text-secondary hover:text-foreground hover:bg-surface-secondary"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 pt-4">
          <TeamHead team={home} />
          <span className="pt-5 text-[11px] font-semibold uppercase tracking-widest text-secondary">vs</span>
          <TeamHead team={away} />
        </div>

        <div className="mt-3 flex items-baseline justify-around">
          <span className={scoreCls(homeScore, awayScore)}>{fmt(homeScore)}</span>
          <span className="text-[11px] text-secondary">
            {isFinal ? 'Final' : isLive ? 'Live' : 'Projected'}
          </span>
          <span className={scoreCls(awayScore, homeScore)}>{fmt(awayScore)}</span>
        </div>
        {started && projection && (
          <p className="text-center text-[11px] text-secondary mt-1 tabular-nums">
            Projected at start: {fmt(projection.home.projectedPoints)} – {fmt(projection.away.projectedPoints)}
          </p>
        )}

        {isPreview && projection && (
          <p className="text-center text-[11px] text-warning mt-1">
            Preview from today&apos;s rosters — saved for real on the Sunday before the week.
          </p>
        )}

        {!projection ? (
          <p className="mt-6 text-center text-[13px] text-secondary">
            No start-of-week numbers were saved for this week.
          </p>
        ) : (
          <>
            {/* Key numbers — whole points here so both fit on a phone; the header has the decimals */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <Tile label="Games" left={projection.home.games} right={projection.away.games} />
              <Tile label="Projected" left={projection.home.projectedPoints} right={projection.away.projectedPoints} format={n => Math.round(n).toString()} />
              <Tile label="Injuries" left={projection.home.injuries.length} right={projection.away.injuries.length} higherWins={false} />
            </div>

            {/* Key players */}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-6 mb-2">Key players</p>
            <div className="grid grid-cols-2 gap-3">
              <KeyPlayers team={projection.home} />
              <KeyPlayers team={projection.away} />
            </div>

            {/* Watch list */}
            {notes.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mt-6 mb-2">Watch list</p>
                <ul className="space-y-1.5">
                  {notes.map(n => (
                    <li key={n} className="text-[13px] text-foreground leading-snug flex gap-2">
                      <span className="text-warning">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
