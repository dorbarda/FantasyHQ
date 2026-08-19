import type { TransactionsData, TradeEvent } from '@/lib/types';

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
    <span className="inline-flex items-center justify-center text-[9px] font-bold rounded px-1.5 py-0.5 bg-panel-border text-white tracking-wide min-w-[30px]">
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

          <div className="w-[170px] shrink-0">
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

// ─── Chart 4: Trade history ───────────────────────────────────────────────────

function TradeCard({ trade }: { trade: TradeEvent }) {
  const date = new Date(trade.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  return (
    <div className="border border-border rounded-lg bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-secondary font-medium">{date}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        {/* Team A side */}
        <div>
          <p className="text-[12px] font-semibold text-foreground truncate">
            {trade.teamA.ownerName.split(' ')[0]}
          </p>
          <p className="text-[10px] text-muted truncate mb-2">{trade.teamA.teamName}</p>
          <p className="text-[10px] text-secondary uppercase tracking-wide mb-1">Received</p>
          <div className="space-y-1">
            {trade.teamAReceived.map(p => (
              <div key={p.playerId} className="flex items-center gap-1.5">
                <TeamBadge team={p.proTeam} />
                <span className="text-[11px] text-foreground font-medium truncate">{p.playerName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center pt-4">
          <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4" />
          </svg>
        </div>

        {/* Team B side */}
        <div>
          <p className="text-[12px] font-semibold text-foreground truncate">
            {trade.teamB.ownerName.split(' ')[0]}
          </p>
          <p className="text-[10px] text-muted truncate mb-2">{trade.teamB.teamName}</p>
          <p className="text-[10px] text-secondary uppercase tracking-wide mb-1">Received</p>
          <div className="space-y-1">
            {trade.teamBReceived.map(p => (
              <div key={p.playerId} className="flex items-center gap-1.5">
                <TeamBadge team={p.proTeam} />
                <span className="text-[11px] text-foreground font-medium truncate">{p.playerName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeHistory({ trades }: { trades: TradeEvent[] }) {
  if (trades.length === 0) {
    return <p className="text-[13px] text-muted">No trades this season.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        title="Trade History"
        subtitle={`${data.trades.length} trade${data.trades.length !== 1 ? 's' : ''} this season · newest first`}
      >
        <TradeHistory trades={data.trades} />
      </Section>
    </div>
  );
}
