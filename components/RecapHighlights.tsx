import type { Highlight } from '@/lib/highlightly';
import HighlightPlayer from './HighlightPlayer';

/**
 * Highlight clips for the recap week.
 *
 * Clips come from the official NBA YouTube channel, picked for the week's best
 * fantasy games on our rosters (lib/highlights-data.ts), and only ones that
 * play embedded in Israel are stored. Renders nothing at all when there are
 * none, so the recap is unchanged on weeks with no usable video.
 */
/** "2026-04-08" → "Apr 8" */
function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function sourceLabel(source: string): string {
  return source === 'nba on youtube' ? 'NBA on YouTube' : `via ${source}`;
}

export default function RecapHighlights({ clips }: { clips: Highlight[] }) {
  if (clips.length === 0) return null;

  return (
    <section className="mb-6">
      <p className="type-section-label mb-3">Highlights</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clips.map(clip => (
          <figure
            key={clip.id}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              <HighlightPlayer embedUrl={clip.embedUrl} title={clip.title} />
            </div>
            <figcaption className="px-3.5 py-2.5">
              {clip.player && (
                <p className="text-[13px] font-semibold text-foreground leading-snug">
                  {clip.player}
                  {clip.fantasyPoints !== undefined && (
                    <span className="text-secondary font-medium"> · {clip.fantasyPoints} fantasy pts</span>
                  )}
                  {clip.ownerName && <span className="text-muted font-normal"> · {clip.ownerName}</span>}
                </p>
              )}
              <p className={clip.player ? 'text-[12px] text-secondary leading-snug mt-0.5' : 'text-[13px] font-medium text-foreground leading-snug'}>
                {clip.title}
              </p>
              <p className="text-[11px] text-muted mt-1">
                {clip.match ? `${clip.match} · ` : ''}
                {shortDate(clip.date)}
                {clip.source !== 'unknown' ? ` · ${sourceLabel(clip.source)}` : ''}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
