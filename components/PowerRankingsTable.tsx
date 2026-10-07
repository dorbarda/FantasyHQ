import type { PowerRankings, PowerRankingEntry } from '@/lib/power-rankings';

function weekRange(weeks: number[]): string {
  if (!weeks.length) return '';
  return weeks.length === 1 ? `Wk ${weeks[0]}` : `Wk ${weeks[0]}–${weeks[weeks.length - 1]}`;
}

function RankMove({ move }: { move: number | null }) {
  if (move === null) return <span className="text-[11px] text-secondary">—</span>;
  if (move === 0) return <span className="text-[11px] text-secondary">=</span>;
  return (
    <span className={`text-[11px] font-bold font-mono ${move > 0 ? 'text-positive-bright' : 'text-negative-bright'}`}>
      {move > 0 ? '▲' : '▼'}{Math.abs(move)}
    </span>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-secondary">—</span>;
  // Round before picking sign/colour so -0.04 shows as a neutral 0.0, not -0.0.
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return <span className="text-[12px] font-mono text-secondary">0.0</span>;
  return (
    <span className={`text-[12px] font-mono ${rounded > 0 ? 'text-positive-bright' : 'text-negative-bright'}`}>
      {rounded > 0 ? '+' : ''}{rounded.toFixed(1)}
    </span>
  );
}

/** Tiny line of score/player per week; the recent window is drawn solid. */
function Sparkline({ entry, recentWeeks }: { entry: PowerRankingEntry; recentWeeks: number[] }) {
  const pts = entry.weekly;
  if (pts.length < 2) return null;
  const w = 72, h = 22, pad = 2;
  const vals = pts.map(p => p.scorePP);
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) * (h - pad * 2)) / (max - min));
  const coords = pts.map((p, i) => `${x(i)},${y(p.scorePP)}`);
  const firstRecent = pts.findIndex(p => recentWeeks.includes(p.week));
  const priorPart = firstRecent > 0 ? coords.slice(0, firstRecent + 1) : [];
  const recentPart = firstRecent >= 0 ? coords.slice(firstRecent) : coords;
  const trendUp = entry.change !== null ? Math.round(entry.change * 10) >= 0 : true;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {priorPart.length > 1 && (
        <polyline points={priorPart.join(' ')} fill="none" stroke="var(--foreground-secondary)" strokeWidth={1.5} strokeDasharray="2 2" />
      )}
      <polyline
        points={recentPart.join(' ')}
        fill="none"
        stroke={trendUp ? 'var(--positive-bright)' : 'var(--negative-bright)'}
        strokeWidth={2}
      />
    </svg>
  );
}

export default function PowerRankingsTable({ data }: { data: PowerRankings }) {
  const { entries, recentWeeks, priorWeeks } = data;
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-secondary">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted w-[28px]">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Team</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted whitespace-nowrap">Score/PP</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted">Change</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted">Trend</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.teamId} className="border-b border-border/50 last:border-0 hover:bg-surface-secondary/60">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-secondary font-mono">{e.rank}</span>
                    <RankMove move={e.rankMove} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{e.ownerName}</p>
                  <p className="text-[11px] text-secondary truncate max-w-[160px]">{e.teamName}</p>
                </td>
                <td className="px-3 py-2 text-right text-[13px] font-mono text-foreground">{e.recentScorePP.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">
                  <Change value={e.change} />
                </td>
                <td className="px-3 py-2">
                  <Sparkline entry={e} recentWeeks={recentWeeks} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-secondary">
        Ranked by points per player started in {weekRange(recentWeeks)}
        {priorWeeks.length > 0 && <> · Change and ▲▼ compare with {weekRange(priorWeeks)}</>}
      </p>
    </div>
  );
}
