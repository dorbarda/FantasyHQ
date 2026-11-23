import NbaLogo from './NbaLogo';
import type { WeeklyTopPlayer } from '@/lib/types';
import PlayerHeadshot from '@/components/PlayerHeadshot';

/**
 * The week's top 10 NBA players on league rosters, by total fantasy points
 * in every game they played (bench included). AVG = total ÷ games.
 */
export default function RecapTopPlayers({ players }: { players: WeeklyTopPlayer[] }) {
  if (players.length === 0) return null;

  return (
    <section className="mb-6">
      <p className="type-section-label mb-3">Top 10 Players</p>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span className="w-5 text-right">#</span>
          <span className="flex-1">Player</span>
          <span className="w-8 text-right">GP</span>
          <span className="w-14 text-right">Total</span>
          <span className="w-12 text-right">AVG</span>
        </div>
        {players.map((p, i) => (
          <div
            key={p.playerId}
            className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-secondary tabular-nums"
          >
            <span className="w-5 text-right text-[12px] font-bold text-muted">{i + 1}</span>
            <PlayerHeadshot playerId={p.playerId} name={p.playerName} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <NbaLogo team={p.proTeam} size={16} />
                <span className="text-[13px] font-bold text-foreground truncate">{p.playerName}</span>
              </div>
              <p className="text-[11px] text-secondary truncate">{p.ownerNames.join(' / ')}</p>
            </div>
            <span className="w-8 text-right text-[12px] text-secondary">{p.games}</span>
            <span className="w-14 text-right text-[14px] font-black text-foreground">{p.totalPoints.toFixed(1)}</span>
            <span className="w-12 text-right text-[13px] font-semibold text-secondary">{p.avgPoints.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
