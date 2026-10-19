import Link from 'next/link';
import OwnerAvatar from '@/components/OwnerAvatar';
import { rankGain, type TrendPlayer } from '@/lib/player-trends';
import type { PowerRankingEntry } from '@/lib/power-rankings';

/** Home page side column: last-30 leaders, surprises & busts, power rankings. */

function Card({ title, note, href, children }: { title: string; note?: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-4 py-3 border-b border-border">
        <p className="type-section-label">{title}</p>
        {href && (
          <Link href={href} className="text-[11px] font-semibold text-accent hover:underline shrink-0">
            More →
          </Link>
        )}
      </div>
      {children}
      {note && <p className="px-4 py-2 text-[11px] text-muted border-t border-border">{note}</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-5 text-[12px] text-secondary text-center">{text}</p>;
}

function PlayerLine({ p, i, children }: { p: TrendPlayer; i: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
      <span className={`w-4 text-[13px] font-bold tabular-nums ${i === 0 ? 'text-accent' : 'text-muted'}`}>{i + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">
          {p.name}
          {p.proTeam && <span className="text-[11px] font-medium text-muted"> · {p.proTeam}</span>}
        </p>
        <p className="text-[11px] text-secondary truncate">{p.ownerName ?? 'Free agent'}</p>
      </div>
      <div className="text-right shrink-0">{children}</div>
    </li>
  );
}

function Last30Card({ players }: { players: TrendPlayer[] | null }) {
  return (
    <Card title="Top 5 · last 30 days">
      {players && players.length > 0 ? (
        <ol>
          {players.map((p, i) => (
            <PlayerLine key={p.playerId} p={p} i={i}>
              <p className="text-[16px] font-bold tabular-nums text-foreground leading-none">{p.last30Pts.toFixed(1)}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-1">FPts</p>
            </PlayerLine>
          ))}
        </ol>
      ) : (
        <Empty text="Starts after opening night." />
      )}
    </Card>
  );
}

function MoverList({ label, players, up }: { label: string; players: TrendPlayer[]; up: boolean }) {
  return (
    <div>
      <p className={`px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider ${up ? 'text-positive-text' : 'text-negative-text'}`}>
        {label}
      </p>
      {players.length > 0 ? (
        <ol>
          {players.map((p, i) => (
            <PlayerLine key={p.playerId} p={p} i={i}>
              <p className={`text-[15px] font-bold tabular-nums leading-none ${up ? 'text-positive-text' : 'text-negative-text'}`}>
                {up ? '▲' : '▼'} {Math.abs(rankGain(p)!)}
              </p>
              <p className="text-[10px] text-muted mt-1 tabular-nums whitespace-nowrap">
                #{p.projRank} → #{p.rank}
              </p>
            </PlayerLine>
          ))}
        </ol>
      ) : (
        <Empty text="None yet." />
      )}
    </div>
  );
}

function MoversCard({ movers }: { movers: { surprises: TrendPlayer[]; busts: TrendPlayer[] } | null }) {
  return (
    <Card
      title="Surprises & busts"
      note={movers ? 'Rank by total points vs. ESPN preseason projected rank (top 100 only)' : undefined}
    >
      {movers ? (
        <div className="divide-y divide-border">
          <MoverList label="Surprises" players={movers.surprises} up />
          <MoverList label="Busts" players={movers.busts} up={false} />
        </div>
      ) : (
        <Empty text="Starts after opening night." />
      )}
    </Card>
  );
}

function PowerCard({ entries, weeks }: { entries: PowerRankingEntry[]; weeks: string | null }) {
  return (
    <Card title="Power rankings · top 3" href="/analysis" note={weeks ? `Points per player started, ${weeks}` : undefined}>
      {entries.length > 0 ? (
        <ol>
          {entries.map((e, i) => (
            <li key={e.teamId} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
              <span className={`w-4 text-[13px] font-bold tabular-nums ${i === 0 ? 'text-accent' : 'text-muted'}`}>{e.rank}</span>
              <OwnerAvatar ownerName={e.ownerName} teamName={e.teamName} size={24} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{e.ownerName}</p>
                <p className="text-[11px] text-secondary truncate">{e.teamName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[16px] font-bold tabular-nums text-foreground leading-none">{e.recentScorePP.toFixed(1)}</p>
                {e.rankMove !== null && e.rankMove !== 0 ? (
                  <p className={`text-[10px] font-semibold mt-1 ${e.rankMove > 0 ? 'text-positive-text' : 'text-negative-text'}`}>
                    {e.rankMove > 0 ? '▲' : '▼'} {Math.abs(e.rankMove)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Score/PP</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty text="Starts after week 1 is complete." />
      )}
    </Card>
  );
}

export default function HomeTrends({
  last30,
  movers,
  power,
  powerWeeks,
}: {
  last30: TrendPlayer[] | null;
  movers: { surprises: TrendPlayer[]; busts: TrendPlayer[] } | null;
  power: PowerRankingEntry[];
  powerWeeks: string | null;
}) {
  return (
    <aside className="space-y-4">
      <Last30Card players={last30} />
      <MoversCard movers={movers} />
      <PowerCard entries={power} weeks={powerWeeks} />
    </aside>
  );
}
