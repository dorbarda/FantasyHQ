'use client';

import { useId, useState } from 'react';
import { weekdayLabel, type MatchupDaily } from '@/lib/week-daily';

/**
 * Win probability through the week, one point per finished day (Start = the
 * Sunday projection). Above the middle line the left team is favoured, below
 * it the right team. Spec: docs/MATCHUP-DETAIL-SPEC.md §5.
 */

const W = 300;
const H = 72;

/** 0% and 100% only when it's settled — 99.9% is not a sure thing. */
function pct(p: number) {
  const n = Math.round(p * 100);
  if (n >= 100 && p < 1) return '>99%';
  if (n <= 0 && p > 0) return '<1%';
  return `${n}%`;
}

export default function WinProbChart({ daily, leftName, rightName }: {
  daily: MatchupDaily;
  leftName: string;
  rightName: string;
}) {
  const points = daily.winProb;
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  if (points.length === 0) return null;

  // x slots: Start, then every day of the week — the line grows across the week.
  const slots = ['Start', ...daily.weekDays.map(weekdayLabel)];
  const slotOf = (i: number) => (points[i].date ? daily.weekDays.indexOf(points[i].date!) + 1 : 0);
  const x = (slot: number) => (slots.length > 1 ? (slot / (slots.length - 1)) * W : W / 2);
  const y = (p: number) => (1 - p) * H;
  const coords = points.map((p, i) => [x(slotOf(i)), y(p.left)] as const);

  const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx},${cy}`).join(' ');
  const area = coords.length > 1
    ? `${line} L${coords[coords.length - 1][0]},${H / 2} L${coords[0][0]},${H / 2} Z`
    : '';

  const shown = points[hover ?? points.length - 1];
  const leftFav = shown.left >= 0.5;

  return (
    <div className="px-4 pt-3 pb-3 border-t border-border">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Win probability{hover !== null && ` · ${shown.label}`}
        </p>
        <p className="flex items-center gap-1.5 min-w-0 text-[12px] text-foreground">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `var(${leftFav ? '--wp-left' : '--wp-right'})` }} />
          <span className="truncate text-secondary">{leftFav ? leftName : rightName}</span>
          <span className="font-bold tabular-nums">{pct(leftFav ? shown.left : 1 - shown.left)}</span>
        </p>
      </div>

      <div
        className="relative"
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const slot = Math.round(((e.clientX - r.left) / r.width) * (slots.length - 1));
          let best = 0;
          points.forEach((_, i) => { if (Math.abs(slotOf(i) - slot) < Math.abs(slotOf(best) - slot)) best = i; });
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full h-[72px] overflow-visible" aria-hidden="true">
          <defs>
            <clipPath id={`${id}top`}><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
            <clipPath id={`${id}bottom`}><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
          </defs>
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {area && (
            <>
              <path d={area} fill="var(--wp-left)" fillOpacity="0.28" clipPath={`url(#${id}top)`} />
              <path d={area} fill="var(--wp-right)" fillOpacity="0.28" clipPath={`url(#${id}bottom)`} />
            </>
          )}
          {hover !== null && (
            <line x1={coords[hover][0]} x2={coords[hover][0]} y1="0" y2={H} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
          <path d={line} fill="none" stroke="var(--foreground-secondary)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Dot in HTML so the stretched SVG doesn't squash it. */}
        {[hover ?? coords.length - 1].map(i => (
          <span
            key={i}
            className="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-foreground ring-2 ring-surface"
            style={{ left: `${(coords[i][0] / W) * 100}%`, top: `${(coords[i][1] / H) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-1 text-[9px] text-muted tabular-nums">
        {slots.map((s, i) => <span key={i}>{s}</span>)}
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-secondary">
        <span className="flex items-center gap-1 min-w-0"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: 'var(--wp-left)' }} /><span className="truncate">{leftName}</span></span>
        <span className="flex items-center gap-1 min-w-0"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: 'var(--wp-right)' }} /><span className="truncate">{rightName}</span></span>
      </div>
    </div>
  );
}
