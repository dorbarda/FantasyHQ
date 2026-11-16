import OwnerAvatar from './OwnerAvatar';
import NbaLogo from './NbaLogo';
import type { SeasonHighlight } from '@/lib/recap';

/**
 * Records, upsets and bench blunders for the week. Renders nothing on a week
 * without any, so a quiet week just shows the luck awards.
 */
export default function RecapSeasonHighlights({ highlights }: { highlights: SeasonHighlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <section className="mb-6">
      <p className="type-section-label mb-3">Season Highlights</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {highlights.map((h, i) => (
          <div key={`${h.id}-${i}`} className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-[17px] font-black leading-tight tracking-tight text-foreground">
              <span className="mr-1.5">{h.emoji}</span>{h.title}
            </p>
            <div className="flex items-center gap-2.5">
              {h.playerName && h.id === 'playerRecord' ? (
                <NbaLogo team={h.proTeam} size={32} />
              ) : (
                <OwnerAvatar ownerName={h.ownerName} teamName={h.teamName} size={32} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-foreground truncate">
                  {h.id === 'playerRecord' ? h.playerName : h.ownerName}
                </p>
                <p className="text-[11px] text-muted leading-snug">
                  {h.id === 'playerRecord' && h.ownerName ? `${h.ownerName} · ` : ''}{h.detail}
                </p>
              </div>
              <span className="text-[20px] font-black tabular-nums text-accent shrink-0">
                {h.value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
