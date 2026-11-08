import Link from 'next/link';
import OwnerAvatar from '@/components/OwnerAvatar';
import type { Matchup } from '@/lib/types';
import { shortName, type TonightTeam, type WinPulse } from '@/lib/week-pulse';

/**
 * Home "This week" card: every matchup in one list — score, win %, last
 * night's swing, and who still plays today. Replaces the closest-game hero.
 */

export interface PulseRow {
  matchup: Matchup;
  /** Left = ESPN home. */
  pulse: WinPulse | null;
  tonight: { left: TonightTeam; right: TonightTeam } | null;
}

/** "Dor Barda" → "Dor" — keeps a phone row on one line. */
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

const pct = (p: number) => `${Math.round(p * 100)}%`;

function Swing({ delta }: { delta: number }) {
  const pts = Math.round(delta * 100);
  if (pts === 0) return <span className="text-muted">±0</span>;
  return (
    <span className={pts > 0 ? 'text-positive-text' : 'text-negative-text'}>
      {pts > 0 ? '▲' : '▼'} {Math.abs(pts)}
    </span>
  );
}

function TonightLine({ team, align }: { team: TonightTeam; align: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-[11px] text-secondary">
        <span className="font-semibold text-foreground tabular-nums">{team.games}</span> playing today
      </p>
      <p className="text-[11px] text-muted truncate">
        {team.top.length > 0 ? team.top.map(p => shortName(p.name)).join(', ') : '—'}
      </p>
    </div>
  );
}

function Row({ row, biggestSwing }: { row: PulseRow; biggestSwing: boolean }) {
  const { home, away, isFinal } = row.matchup;
  const hasScores = home.actualScore > 0 || away.actualScore > 0;
  const homeAhead = home.actualScore >= away.actualScore;
  const left = row.pulse?.now ?? null;

  return (
    <li className="px-4 sm:px-5 py-4 border-b border-border last:border-b-0">
      {biggestSwing && row.pulse?.lastNight != null && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-text mb-2">
          🎢 Biggest swing last night
        </p>
      )}

      {/* Owners + scores */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <OwnerAvatar ownerName={home.ownerName} teamName={home.teamName} size={28} />
          <p className="text-[13px] font-semibold text-foreground truncate">{first(home.ownerName)}</p>
        </div>
        <p className="text-[17px] font-bold tabular-nums shrink-0">
          <span className={homeAhead ? 'text-foreground' : 'text-secondary'}>
            {hasScores ? home.actualScore.toFixed(1) : '—'}
          </span>
          <span className="text-muted font-light mx-1.5">–</span>
          <span className={!homeAhead ? 'text-foreground' : 'text-secondary'}>
            {hasScores ? away.actualScore.toFixed(1) : '—'}
          </span>
        </p>
        <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate text-right">{first(away.ownerName)}</p>
          <OwnerAvatar ownerName={away.ownerName} teamName={away.teamName} size={28} />
        </div>
      </div>

      {/* Win % bar */}
      {left !== null && !isFinal && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] font-bold tabular-nums mb-1">
            <span className={left >= 0.5 ? 'text-foreground' : 'text-secondary'}>{pct(left)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Win chance</span>
            <span className={left < 0.5 ? 'text-foreground' : 'text-secondary'}>{pct(1 - left)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-secondary overflow-hidden flex">
            <div className="h-full bg-accent" style={{ width: `${left * 100}%` }} />
          </div>
          {row.pulse?.lastNight != null && (
            <div className="flex items-center justify-between text-[11px] font-semibold tabular-nums mt-1">
              <Swing delta={row.pulse.lastNight} />
              <span className="text-[10px] font-medium text-muted">last night</span>
              <Swing delta={-row.pulse.lastNight} />
            </div>
          )}
        </div>
      )}

      {/* Today */}
      {row.tonight && !isFinal && (
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/60">
          <TonightLine team={row.tonight.left} align="left" />
          <TonightLine team={row.tonight.right} align="right" />
        </div>
      )}
    </li>
  );
}

export default function WeekPulseCard({ rows, week }: { rows: PulseRow[]; week: number }) {
  // Closest race first: win % nearest 50/50, then smallest score gap.
  const sorted = [...rows].sort((a, b) => {
    const ca = a.pulse ? Math.abs(a.pulse.now - 0.5) : 1;
    const cb = b.pulse ? Math.abs(b.pulse.now - 0.5) : 1;
    if (ca !== cb) return ca - cb;
    const ga = Math.abs(a.matchup.home.actualScore - a.matchup.away.actualScore);
    const gb = Math.abs(b.matchup.home.actualScore - b.matchup.away.actualScore);
    return ga - gb;
  });
  const swings = sorted.map(r => Math.abs(r.pulse?.lastNight ?? 0));
  const maxSwing = Math.max(0, ...swings);

  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
        <p className="type-section-label">Week {week} · Every matchup</p>
        <Link href="/matchups" className="text-[11px] font-semibold text-accent hover:underline shrink-0">
          Details →
        </Link>
      </div>
      <ul>
        {sorted.map((row, i) => (
          <Row key={row.matchup.id} row={row} biggestSwing={maxSwing >= 0.1 && swings[i] === maxSwing} />
        ))}
      </ul>
      <p className="px-4 sm:px-5 py-2 text-[11px] text-muted border-t border-border">
        Win chance as of this morning&apos;s update · ▲▼ = how much last night moved it
      </p>
    </section>
  );
}
