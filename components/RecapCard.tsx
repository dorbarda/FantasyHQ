import OwnerAvatar from './OwnerAvatar';
import type { Award, AwardWinner } from '@/lib/recap';

/** Numbers mean different things per award, so format them per award. */
function formatValue(w: AwardWinner): string {
  switch (w.format) {
    case 'margin':  return `+${w.value.toFixed(1)}`;
    case 'score':   return w.value.toFixed(1);
    case 'decimal': return w.value.toFixed(2);
    case 'count':   return String(w.value);
  }
}

/** The line under the name that says what earned the award. */
function detailOf(award: Award, w: AwardWinner): string {
  switch (award.id) {
    case 'beatdown':
    case 'heartAttack':
      return `${w.teamScore?.toFixed(1)} – ${w.opponentScore?.toFixed(1)} vs ${w.opponentName}`;
    case 'ceiling':
      return `vs ${w.opponentName}`;
    case 'noLuck':
      return `Lost with ${w.teamScore?.toFixed(1)} — beat ${w.value} other team${w.value === 1 ? '' : 's'}`;
    case 'slotzki':
      return `Won with ${w.teamScore?.toFixed(1)} — ${w.value} team${w.value === 1 ? '' : 's'} scored more`;
    case 'grinder':
      return `${w.value} starter games used`;
    case 'sniper':
      return `${w.teamScore?.toFixed(1)} points`;
    case 'hotPickup':
      return w.proTeam ? `${w.proTeam} · added ${w.value}×` : `Added ${w.value}×`;
  }
}

export default function RecapCard({ award }: { award: Award }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3 h-full">
      {/* Award name — Hebrew names get their own direction and face */}
      <div>
        {award.rtl ? (
          <p dir="rtl" className="type-he text-[19px] leading-tight text-foreground text-left">
            {award.name}
          </p>
        ) : (
          <p className="text-[19px] font-black leading-tight tracking-tight text-foreground">
            {award.name}
          </p>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mt-1">
          {award.gloss}
        </p>
      </div>

      {/* Recipients — all of them when tied */}
      <div className="flex flex-col gap-2.5 mt-auto">
        {award.winners.map((w, i) => (
          <div key={`${w.ownerName}-${w.playerName ?? ''}-${i}`} className="flex items-center gap-2.5">
            {w.playerName ? (
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-foreground truncate">{w.playerName}</p>
                <p className="text-[11px] text-muted leading-snug">{detailOf(award, w)}</p>
              </div>
            ) : (
              <>
                <OwnerAvatar ownerName={w.ownerName} teamName={w.teamName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-foreground truncate">{w.ownerName}</p>
                  <p className="text-[11px] text-muted leading-snug">{detailOf(award, w)}</p>
                </div>
              </>
            )}
            <span className="text-[20px] font-black tabular-nums text-accent shrink-0">
              {formatValue(w)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
