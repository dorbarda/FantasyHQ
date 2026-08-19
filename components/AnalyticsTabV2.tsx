import type { OwnerPlayoffBets, PlayoffResults, PlayoffFine } from '@/lib/types';
import { getTeamMeta } from '@/lib/team-meta';
import { getOwnerColor } from '@/lib/owner-meta';
import { computeAllScores } from '@/lib/playoff-scoring';
import {
  computeAnalyticsStandings,
  pickDistribution,
  topUpset,
  teamPickCounts,
  type OwnerAnalytics,
} from '@/lib/playoff-analytics';
import { Avatar, TeamMark, Streak } from './PlayoffPrimitives';

// ─── Panel 1: Editorial header ────────────────────────────────────────────────

function BigStat({
  label,
  value,
  sub,
  color = 'var(--foreground)',
}: {
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--foreground-muted)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color,
          lineHeight: 0.95,
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--foreground-tertiary)', maxWidth: 200 }}>{sub}</div>
    </div>
  );
}

interface FullScoreEntry { ownerName: string; total: number; }

function EditorialHeader({
  standings,
  fullScores,
}: {
  standings: OwnerAnalytics[];
  fullScores: FullScoreEntry[];
}) {
  const totalPicks   = standings.reduce((a, s) => a + s.picks, 0);
  const totalCorrect = standings.reduce((a, s) => a + s.correct, 0);
  const groupAcc     = totalPicks ? Math.round((totalCorrect / totalPicks) * 100) : 0;
  const totalExact   = standings.reduce((a, s) => a + s.exact, 0);

  const leader       = fullScores[0];
  const second       = fullScores[1];
  const leaderColor  = leader ? getOwnerColor(leader.ownerName) : '#94A3B8';

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 28,
        marginBottom: 18,
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
        gap: 32,
        alignItems: 'end',
      }}
      className="max-[720px]:grid-cols-2"
    >
      {/* Pool leader */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--foreground-muted)',
            marginBottom: 8,
          }}
        >
          Pool Leader
        </div>
        {leader && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <Avatar name={leader.ownerName} size={56} color={leaderColor} />
            <div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: 'var(--foreground)',
                  lineHeight: 1,
                }}
              >
                {leader.ownerName.split(' ')[0]}
              </div>
              {second && (
                <div style={{ fontSize: 13, color: 'var(--foreground-tertiary)', marginTop: 4 }}>
                  +{leader.total - second.total} pts ahead of {second.ownerName.split(' ')[0]}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BigStat
        label="Points"
        value={leader?.total ?? 0}
        sub="Total accumulated"
        color={leaderColor}
      />
      <BigStat
        label="Accuracy"
        value={`${groupAcc}%`}
        sub={`${totalCorrect} of ${totalPicks} picks correct group-wide`}
      />
      <BigStat
        label="Exacts"
        value={totalExact}
        sub="Series scores called perfectly"
        color="#EAB308"
      />
    </div>
  );
}

// ─── Panel 2: Trajectory chart ────────────────────────────────────────────────

function TrajectoryChart({ standings }: { standings: OwnerAnalytics[] }) {
  const completedCount = standings.length > 0 ? standings[0].trajectory.length - 1 : 0;
  const W = 520, H = 200, P = 12;
  const maxY = Math.max(...standings.flatMap(s => s.trajectory), 10);
  const stepX = completedCount > 0 ? (W - 2 * P) / completedCount : W - 2 * P;

  const sortedForLegend = standings
    .slice()
    .sort((a, b) => b.trajectory[b.trajectory.length - 1] - a.trajectory[a.trajectory.length - 1]);

  return (
    <div
      style={{
        background: 'var(--panel)',
        borderRadius: 16,
        padding: 24,
        color: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--panel-text-muted)',
              marginBottom: 6,
            }}
          >
            Trajectory
          </div>
          <div
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            The race so far
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--panel-text-muted)' }}>
          Cumulative pts · Round 1
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line
            key={t}
            x1={P}
            x2={W - P}
            y1={P + (H - 2 * P) * t}
            y2={P + (H - 2 * P) * t}
            stroke="rgba(255,255,255,0.08)"
          />
        ))}
        {/* Owner lines */}
        {standings.map(s => {
          const pts = s.trajectory.map((y, i) => {
            const px = P + i * stepX;
            const py = P + (H - 2 * P) * (1 - y / maxY);
            return `${px},${py}`;
          });
          const lastX = P + (s.trajectory.length - 1) * stepX;
          const lastY = P + (H - 2 * P) * (1 - s.trajectory[s.trajectory.length - 1] / maxY);
          return (
            <g key={s.ownerName}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                points={pts.join(' ')}
                opacity="0.9"
              />
              <circle cx={lastX} cy={lastY} r="3.5" fill={s.color} />
            </g>
          );
        })}
      </svg>

      {/* Legend chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {sortedForLegend.map(s => (
          <div
            key={s.ownerName}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px 3px 3px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 999,
            }}
          >
            <Avatar name={s.ownerName} size={20} color={s.color} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {s.ownerName.split(' ')[0]}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: s.color,
                marginLeft: 4,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.trajectory[s.trajectory.length - 1]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel 3: Form strip ──────────────────────────────────────────────────────

function FormStrip({ standings }: { standings: OwnerAnalytics[] }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--foreground-muted)',
            marginBottom: 6,
          }}
        >
          Form
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--foreground)',
          }}
        >
          Last 8 picks
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {standings.map(s => (
          <div key={s.ownerName} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={s.ownerName} size={24} color={s.color} />
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--foreground)',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.ownerName}
            </div>
            <Streak items={s.streak} max={8} />
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--foreground)',
                width: 38,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.total}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--surface-secondary)',
        }}
      >
        {[
          { label: 'Exact',   color: 'var(--gold)' },
          { label: 'Correct', color: 'var(--positive)' },
          { label: 'Wrong',   color: 'var(--negative)' },
        ].map(l => (
          <div
            key={l.label}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <div
              style={{
                width: 8,
                height: 12,
                borderRadius: 2,
                background: l.color,
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--foreground-tertiary)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel 4: Upset of the round ──────────────────────────────────────────────

function UpsetPanel({ allBets, results }: { allBets: OwnerPlayoffBets[]; results: PlayoffResults }) {
  const upset = topUpset(allBets, results);

  if (!upset) {
    return (
      <div
        style={{
          background: 'var(--warning-surface)',
          border: '1px solid var(--warning-bright)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--warning-text)',
            marginBottom: 12,
          }}
        >
          Upset of the round
        </div>
        <div style={{ fontSize: 16, color: 'var(--warning-text)' }}>No upsets yet.</div>
      </div>
    );
  }

  const { series, callerCount, totalCallers } = upset;
  const winner = series.winner!;
  const loser  = series.teams[0]; // upset = teams[1] won, so loser = teams[0]

  const winnerLastWord = winner.split(' ').slice(-1)[0];
  const loserLastWord  = loser.split(' ').slice(-1)[0];

  return (
    <div
      style={{
        background: 'var(--warning-surface)',
        border: '1px solid var(--warning-bright)',
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--warning-text)',
            marginBottom: 6,
          }}
        >
          Upset of the round
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            color: 'var(--foreground)',
            lineHeight: 1.05,
          }}
        >
          {winnerLastWord} over {loserLastWord},<br />in {series.score ?? '?'}.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <TeamMark team={winner} size={48} />
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--foreground-muted)' }}>over</div>
        <TeamMark team={loser} size={48} />
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: 'var(--foreground)',
            marginLeft: 'auto',
            letterSpacing: '-0.02em',
          }}
        >
          {series.score ?? '—'}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: 'var(--foreground)',
          lineHeight: 1.5,
          marginBottom: 14,
        }}
      >
        {callerCount === 0
          ? `Nobody in the pool called it — the bracket-wide miss cost the room ${totalCallers * 2} potential points.`
          : `Only ${callerCount} of ${totalCallers} friends called it. The rest missed out on points.`}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 10,
          border: '1px solid rgba(146,64,14,0.15)',
        }}
      >
        <div style={{ fontSize: 18 }}>🚫</div>
        <div style={{ fontSize: 12, color: 'var(--warning-text)', fontWeight: 600 }}>
          <strong>{callerCount} of {totalCallers}</strong> friends called it.{' '}
          {callerCount === 0 ? 'Group blind spot of the playoffs.' : 'Contrarian minority.'}
        </div>
      </div>
    </div>
  );
}

// ─── Panel 5: Consensus meters ────────────────────────────────────────────────

function ConsensusFever({
  allBets,
  results,
}: {
  allBets: OwnerPlayoffBets[];
  results: PlayoffResults;
}) {
  const active = results.series.filter(s => s.winner === null && s.teams[0] && s.teams[1]);

  if (active.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 22,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--foreground-muted)' }}>No active series.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--foreground-muted)',
            marginBottom: 6,
          }}
        >
          Consensus
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--foreground)',
          }}
        >
          Where the room agrees
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {active.map(s => {
          const counts  = pickDistribution(s.seriesId, allBets);
          const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          const total   = entries.reduce((a, [, v]) => a + v, 0);
          const top     = entries[0];
          if (!top) return null;
          const meta    = getTeamMeta(top[0]);
          const topPct  = total ? Math.round((top[1] / total) * 100) : 0;

          return (
            <div key={s.seriesId}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--foreground-muted)', fontWeight: 600 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>{total} picks</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TeamMark team={top[0]} size={28} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--foreground)',
                      marginBottom: 4,
                    }}
                  >
                    {top[0].split(' ').slice(-1)[0]}{' '}
                    <span style={{ color: 'var(--foreground-muted)', fontWeight: 500 }}>favored</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: 'var(--surface-secondary)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${topPct}%`,
                        height: '100%',
                        background: meta.primary,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: meta.primary,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {topPct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel 6: Picks heatmap ───────────────────────────────────────────────────

function HeatmapRow({
  team,
  picks,
  maxPicks,
}: {
  team: string;
  picks: number;
  maxPicks: number;
}) {
  const meta = getTeamMeta(team);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--surface-secondary)',
      }}
    >
      <TeamMark team={team} size={24} />
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--foreground)',
          flex: 1,
        }}
      >
        {team.split(' ').slice(-1)[0]}
      </div>
      <div
        style={{
          width: 80,
          height: 5,
          background: 'var(--surface-secondary)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${(picks / maxPicks) * 100}%`,
            height: '100%',
            background: meta.primary,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--foreground)',
          width: 24,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {picks}
      </div>
    </div>
  );
}

function PicksHeatmap({
  allBets,
  results,
}: {
  allBets: OwnerPlayoffBets[];
  results: PlayoffResults;
}) {
  const ranked  = teamPickCounts(allBets, results);
  if (ranked.length === 0) return null;

  const top5    = ranked.slice(0, 5);
  const bottom5 = ranked.slice(-5).reverse();
  const maxPicks = top5[0][1];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
        className="max-[500px]:grid-cols-1"
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--foreground-muted)',
              marginBottom: 6,
            }}
          >
            Most loved
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', marginBottom: 10 }}>
            Bracket favorites
          </div>
          {top5.map(([team, picks]) => (
            <HeatmapRow key={team} team={team} picks={picks} maxPicks={maxPicks} />
          ))}
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--foreground-muted)',
              marginBottom: 6,
            }}
          >
            Least loved
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', marginBottom: 10 }}>
            Lonely calls
          </div>
          {bottom5.map(([team, picks]) => (
            <HeatmapRow key={team} team={team} picks={picks} maxPicks={maxPicks} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Exported tab ─────────────────────────────────────────────────────────────

export default function AnalyticsTabV2({
  allBets,
  results,
  fines = [],
}: {
  allBets: OwnerPlayoffBets[];
  results: PlayoffResults;
  fines?: PlayoffFine[];
}) {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  const standings = computeAnalyticsStandings(allBets, results);

  const rawFull = computeAllScores(allBets, results);
  const fullScores = rawFull
    .map(s => {
      const fine = fines.find(f => f.ownerName === s.ownerName);
      return { ownerName: s.ownerName, total: s.total + (fine?.points ?? 0) };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{ padding: 24, background: 'var(--background)', minHeight: 600 }}>
      {/* Panel 1: Editorial header */}
      <EditorialHeader standings={standings} fullScores={fullScores} />

      {/* Panel 2+3: Trajectory + Form strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 16,
          marginBottom: 18,
        }}
        className="max-[720px]:grid-cols-1"
      >
        <TrajectoryChart standings={standings} />
        <FormStrip standings={standings} />
      </div>

      {/* Panel 4+5: Upset + Consensus */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 18,
        }}
        className="max-[720px]:grid-cols-1"
      >
        <UpsetPanel allBets={allBets} results={results} />
        <ConsensusFever allBets={allBets} results={results} />
      </div>

      {/* Panel 6: Heatmap */}
      <PicksHeatmap allBets={allBets} results={results} />
    </div>
  );
}
