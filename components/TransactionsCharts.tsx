import type { TransactionsData, TradeEvent, TradedPlayer } from '@/lib/types';
import PlayerHeadshot from '@/components/PlayerHeadshot';
import NbaLogo from '@/components/NbaLogo';

// ─── Shared bar chart primitives ──────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 bg-surface-secondary rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TeamBadge({ team }: { team: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary tracking-wide min-w-[44px]">
      <NbaLogo team={team} size={16} />
      {team}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Chart 1: Top 10 most added players ──────────────────────────────────────

function TopPlayersChart({ players }: { players: TransactionsData['topAddedPlayers'] }) {
  const max = players[0]?.addCount ?? 1;
  return (
    <div className="space-y-3">
      {players.map((p, i) => (
        <div key={p.playerId} className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-secondary w-4 text-right shrink-0">
            {i + 1}
          </span>

          <PlayerHeadshot playerId={p.playerId} name={p.playerName} size={32} />
          <div className="w-[130px] sm:w-[170px] shrink-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
              {p.playerName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <TeamBadge team={p.proTeam} />
              <span className="text-[10px] text-muted">{p.position}</span>
            </div>
          </div>

          <Bar value={p.addCount} max={max} color={i === 0 ? 'bg-accent' : 'bg-accent/50'} />

          <span className="text-[13px] font-bold tabular-nums text-foreground w-8 text-right shrink-0">
            {p.addCount}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart 2: Adds by NBA team ───────────────────────────────────────────────

function NbaTeamChart({ teams }: { teams: TransactionsData['addsByNbaTeam'] }) {
  const max = teams[0]?.count ?? 1;
  return (
    <div className="space-y-2.5">
      {teams.map((t, i) => (
        <div key={t.team} className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-secondary w-4 text-right shrink-0">
            {i + 1}
          </span>
          <TeamBadge team={t.team} />
          <Bar value={t.count} max={max} color={i < 3 ? 'bg-positive-bright' : 'bg-positive-bright/50'} />
          <span className="text-[13px] font-bold tabular-nums text-foreground w-8 text-right shrink-0">
            {t.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart 3: Per fantasy team most-added player ─────────────────────────────

function FantasyTeamGrid({ teams }: { teams: TransactionsData['byFantasyTeam'] }) {
  const maxAdds = teams[0]?.totalAdds ?? 1;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {teams.map((team, rank) => (
        <div
          key={team.teamId}
          className="rounded-lg border border-border bg-surface p-4"
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-secondary">#{rank + 1}</span>
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {team.ownerName.split(' ')[0]}
                </p>
              </div>
              <p className="text-[11px] text-muted truncate">{team.teamName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[22px] font-bold text-foreground leading-none tabular-nums">{team.totalAdds}</p>
              <p className="text-[10px] text-secondary uppercase tracking-wide">total adds</p>
            </div>
          </div>

          {/* Activity bar */}
          <div className="mb-3">
            <div className="bg-surface-secondary rounded-full h-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/60"
                style={{ width: `${(team.totalAdds / maxAdds) * 100}%` }}
              />
            </div>
          </div>

          {/* Most targeted player */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-secondary shrink-0">Top target</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamBadge team={team.topPlayerProTeam} />
              <span className="text-[12px] font-semibold text-foreground truncate">{team.topPlayer}</span>
            </div>
            <span className="text-[11px] font-semibold text-secondary shrink-0 ml-auto">
              x{team.topPlayerCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chart 4: Trades tracker ──────────────────────────────────────────────────

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>;
  const cls = value > 0 ? 'text-positive-text' : value < 0 ? 'text-negative-text' : 'text-secondary';
  return <span className={`font-semibold tabular-nums ${cls}`}>{value > 0 ? '+' : ''}{fmt(value)}</span>;
}

function TrackedPlayerRow({ p }: { p: TradedPlayer }) {
  const t = p.tracker;
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2">
      <PlayerHeadshot playerId={p.playerId} name={p.playerName} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground leading-tight break-words">{p.playerName}</p>
        <TeamBadge team={p.proTeam} />
      </div>
      {t ? (
        <div className="grid grid-cols-[36px_48px_34px] sm:grid-cols-[44px_44px_44px] gap-1.5 sm:gap-2 text-right text-[12px] tabular-nums shrink-0">
          <div>
            <p className="font-semibold text-foreground">{fmt(t.after.pts)}</p>
            <p className="text-[10px] text-muted whitespace-nowrap">{t.after.gp} GP</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{t.after.avg != null ? fmt(t.after.avg) : '—'}</p>
            <p className="text-[10px] text-muted whitespace-nowrap">was {t.before.avg != null ? fmt(t.before.avg) : '—'}</p>
          </div>
          <div className="pt-px"><Change value={t.avgChange} /></div>
        </div>
      ) : (
        <span className="text-[11px] text-muted">no stats</span>
      )}
    </div>
  );
}

function sideTotals(players: TradedPlayer[]) {
  const pts = players.reduce((s, p) => s + (p.tracker?.after.pts ?? 0), 0);
  const gp = players.reduce((s, p) => s + (p.tracker?.after.gp ?? 0), 0);
  return { pts: Math.round(pts * 10) / 10, gp };
}

function TradeSide({ team, received, totalPts, leading }: {
  team: TradeEvent['teamA']; received: TradedPlayer[]; totalPts: number; leading: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${leading ? 'border-border bg-positive-surface' : 'border-border'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foreground truncate">{team.ownerName}</p>
          <p className="text-[11px] text-muted truncate">{team.teamName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-bold text-foreground tabular-nums leading-none">{fmt(totalPts)}</p>
          <p className="text-[10px] text-muted uppercase tracking-wide">pts since trade</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-secondary uppercase tracking-wide">
        <span>Received</span>
        <span className="grid grid-cols-[36px_48px_34px] sm:grid-cols-[44px_44px_44px] gap-1.5 sm:gap-2 text-right">
          <span>Pts</span><span>Avg</span><span>Δ Avg</span>
        </span>
      </div>
      <div className="divide-y divide-border">
        {received.map(p => <TrackedPlayerRow key={p.playerId} p={p} />)}
      </div>
    </div>
  );
}

function TradeCard({ trade }: { trade: TradeEvent }) {
  const date = new Date(trade.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/New_York',
  });
  const a = sideTotals(trade.teamAReceived);
  const b = sideTotals(trade.teamBReceived);
  const hasStats = a.gp + b.gp > 0;
  const diff = Math.round(Math.abs(a.pts - b.pts) * 10) / 10;
  const leader = !hasStats || a.pts === b.pts ? null : a.pts > b.pts ? trade.teamA : trade.teamB;

  return (
    <div className="border border-border rounded-lg bg-surface p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[12px] text-secondary font-medium">Traded {date}</span>
        <span className="text-[12px] text-secondary">
          {!hasStats
            ? 'No games since the trade yet'
            : leader
              ? <><span className="font-semibold text-foreground">{leader.ownerName.split(' ')[0]}</span> ahead by {fmt(diff)} pts</>
              : 'Even so far'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TradeSide team={trade.teamA} received={trade.teamAReceived} totalPts={a.pts} leading={leader === trade.teamA} />
        <TradeSide team={trade.teamB} received={trade.teamBReceived} totalPts={b.pts} leading={leader === trade.teamB} />
      </div>
    </div>
  );
}

function TradeHistory({ trades }: { trades: TradeEvent[] }) {
  if (trades.length === 0) {
    return <p className="text-[13px] text-muted">No trades this season.</p>;
  }
  return (
    <div className="space-y-3">
      {trades.map(t => <TradeCard key={t.tradeId} trade={t} />)}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TransactionsCharts({ data }: { data: TransactionsData }) {
  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="flex gap-4 flex-wrap">
        <div className="border border-border rounded-lg px-5 py-3 bg-surface">
          <p className="text-[24px] font-bold text-foreground leading-none tabular-nums">{data.totalAdds}</p>
          <p className="text-[11px] text-muted uppercase tracking-wide mt-0.5">Total adds this season</p>
        </div>
        <div className="border border-border rounded-lg px-5 py-3 bg-surface">
          <p className="text-[24px] font-bold text-foreground leading-none">{data.topAddedPlayers[0]?.playerName?.split(' ').pop() ?? '—'}</p>
          <p className="text-[11px] text-muted uppercase tracking-wide mt-0.5">Most added player</p>
        </div>
        <div className="border border-border rounded-lg px-5 py-3 bg-surface">
          <p className="text-[24px] font-bold text-foreground leading-none">{data.addsByNbaTeam[0]?.team ?? '—'}</p>
          <p className="text-[11px] text-muted uppercase tracking-wide mt-0.5">Hottest NBA team</p>
        </div>
      </div>

      {/* Chart 1 + Chart 2 side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          title="Most Added Players"
          subtitle="Top 10 pickups across all teams this season"
        >
          {data.topAddedPlayers.length > 0
            ? <TopPlayersChart players={data.topAddedPlayers} />
            : <p className="text-[13px] text-muted">No data yet.</p>
          }
        </Section>

        <Section
          title="Adds by NBA Team"
          subtitle="Which franchises' players get picked up most"
        >
          {data.addsByNbaTeam.length > 0
            ? <NbaTeamChart teams={data.addsByNbaTeam} />
            : <p className="text-[13px] text-muted">No data yet.</p>
          }
        </Section>
      </div>

      {/* Chart 3: full width */}
      <Section
        title="Most Active Managers"
        subtitle="Total adds per fantasy team · with their most-targeted player"
      >
        {data.byFantasyTeam.length > 0
          ? <FantasyTeamGrid teams={data.byFantasyTeam} />
          : <p className="text-[13px] text-muted">No data yet.</p>
        }
      </Section>

      {/* Trade history */}
      <Section
        title="Trades Tracker"
        subtitle={`${data.trades.length} trade${data.trades.length !== 1 ? 's' : ''} this season · points each player scored since the trade (from the day after) · Δ Avg = avg since trade minus avg before`}
      >
        <TradeHistory trades={data.trades} />
      </Section>
    </div>
  );
}
