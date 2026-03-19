import type { TransactionsData } from '@/lib/types';

// ─── Shared bar chart primitives ──────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 bg-[#f7f9f9] rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TeamBadge({ team }: { team: string }) {
  return (
    <span className="inline-flex items-center justify-center text-[9px] font-black rounded px-1.5 py-0.5 bg-[#0f1419] text-white tracking-wide min-w-[30px]">
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
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-[17px] font-bold text-[#0f1419]">{title}</h2>
        {subtitle && <p className="text-[13px] text-[#536471] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
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
          {/* Rank */}
          <span className="text-[12px] font-black text-[#536471] w-4 text-right shrink-0">
            {i + 1}
          </span>

          {/* Player info */}
          <div className="w-[170px] shrink-0">
            <p className="text-[13px] font-bold text-[#0f1419] leading-tight truncate">
              {p.playerName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <TeamBadge team={p.proTeam} />
              <span className="text-[10px] text-[#536471]">{p.position}</span>
            </div>
          </div>

          {/* Bar */}
          <Bar value={p.addCount} max={max} color={i === 0 ? 'bg-[#1d9bf0]' : 'bg-[#1d9bf0]/60'} />

          {/* Count */}
          <span className="text-[13px] font-black tabular-nums text-[#0f1419] w-8 text-right shrink-0">
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
          <span className="text-[12px] font-black text-[#536471] w-4 text-right shrink-0">
            {i + 1}
          </span>
          <TeamBadge team={t.team} />
          <Bar value={t.count} max={max} color={i < 3 ? 'bg-[#00ba7c]' : 'bg-[#00ba7c]/60'} />
          <span className="text-[13px] font-black tabular-nums text-[#0f1419] w-8 text-right shrink-0">
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
          className={`rounded-xl border p-4 ${team.isYou ? 'border-[#1d9bf0]/40 bg-[#1d9bf0]/5' : 'border-[#eff3f4] bg-white'}`}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-[#536471]">#{rank + 1}</span>
                <p className={`text-[14px] font-bold truncate ${team.isYou ? 'text-[#1d9bf0]' : 'text-[#0f1419]'}`}>
                  {team.ownerName.split(' ')[0]}
                </p>
              </div>
              <p className="text-[11px] text-[#536471] truncate">{team.teamName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[22px] font-black text-[#0f1419] leading-none">{team.totalAdds}</p>
              <p className="text-[10px] text-[#536471] uppercase tracking-wide">total adds</p>
            </div>
          </div>

          {/* Activity bar */}
          <div className="mb-3">
            <div className="bg-[#f7f9f9] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${team.isYou ? 'bg-[#1d9bf0]' : 'bg-[#536471]/40'}`}
                style={{ width: `${(team.totalAdds / maxAdds) * 100}%` }}
              />
            </div>
          </div>

          {/* Most targeted player */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#536471] shrink-0">Top target</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <TeamBadge team={team.topPlayerProTeam} />
              <span className="text-[12px] font-bold text-[#0f1419] truncate">{team.topPlayer}</span>
            </div>
            <span className="text-[11px] font-black text-[#536471] shrink-0 ml-auto">
              ×{team.topPlayerCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TransactionsCharts({ data }: { data: TransactionsData }) {
  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="flex gap-4 flex-wrap">
        <div className="border border-[#eff3f4] rounded-xl px-5 py-3">
          <p className="text-[24px] font-black text-[#0f1419] leading-none">{data.totalAdds}</p>
          <p className="text-[11px] text-[#536471] uppercase tracking-wide mt-0.5">Total adds this season</p>
        </div>
        <div className="border border-[#eff3f4] rounded-xl px-5 py-3">
          <p className="text-[24px] font-black text-[#0f1419] leading-none">{data.topAddedPlayers[0]?.playerName?.split(' ').pop() ?? '—'}</p>
          <p className="text-[11px] text-[#536471] uppercase tracking-wide mt-0.5">Most added player</p>
        </div>
        <div className="border border-[#eff3f4] rounded-xl px-5 py-3">
          <p className="text-[24px] font-black text-[#0f1419] leading-none">{data.addsByNbaTeam[0]?.team ?? '—'}</p>
          <p className="text-[11px] text-[#536471] uppercase tracking-wide mt-0.5">Hottest NBA team</p>
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
            : <p className="text-[13px] text-[#536471]">No data yet.</p>
          }
        </Section>

        <Section
          title="Adds by NBA Team"
          subtitle="Which franchises' players get picked up most"
        >
          {data.addsByNbaTeam.length > 0
            ? <NbaTeamChart teams={data.addsByNbaTeam} />
            : <p className="text-[13px] text-[#536471]">No data yet.</p>
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
          : <p className="text-[13px] text-[#536471]">No data yet.</p>
        }
      </Section>
    </div>
  );
}
