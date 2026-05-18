import type { OwnerPlayoffBets, PlayoffResults, SeriesResult } from '@/lib/types';
import { getTeamMeta } from '@/lib/team-meta';
import { getOwnerColor } from '@/lib/owner-meta';
import { Avatar, TeamMark } from './PlayoffPrimitives';

// ─── Pill styles ──────────────────────────────────────────────────────────────

type PillStatus = 'exact' | 'correct' | 'wrong' | 'pending';

function pillStyle(status: PillStatus): React.CSSProperties {
  switch (status) {
    case 'exact':   return { background: '#FEF9C3', color: '#713F12', border: '1px solid #EAB308' };
    case 'correct': return { background: '#DCFCE7', color: '#14532D', border: '1px solid transparent' };
    case 'wrong':   return { background: '#FEE2E2', color: '#7F1D1D', border: '1px solid transparent' };
    case 'pending': return { background: '#FFFFFF', color: '#475569', border: '1px solid #E2E8F0' };
  }
}

function getPickStatus(
  pick: string,
  pickScore: string | null | undefined,
  winner: string | null,
  seriesScore: string | null,
): PillStatus {
  if (!winner) return 'pending';
  const correct = pick.trim().toLowerCase() === winner.trim().toLowerCase();
  if (correct) {
    return pickScore && seriesScore && pickScore === seriesScore ? 'exact' : 'correct';
  }
  return 'wrong';
}

// ─── Backer row ───────────────────────────────────────────────────────────────

interface Backer {
  ownerName: string;
  color: string;
  pickScore: string | null;
  status: PillStatus;
}

function BackerRow({ backer, exact }: { backer: Backer; exact: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar name={backer.ownerName} size={26} color={backer.color} />
      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
        {backer.ownerName.split(' ')[0]}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 6,
          fontVariantNumeric: 'tabular-nums',
          ...pillStyle(backer.status),
        }}
      >
        {backer.pickScore || '—'}{exact && <span style={{ marginLeft: 3 }}>★</span>}
      </div>
    </div>
  );
}

// ─── Backer column ────────────────────────────────────────────────────────────

function BackerColumn({
  team,
  backers,
  side,
}: {
  team: string;
  backers: Backer[];
  side: 'A' | 'B';
}) {
  const meta = getTeamMeta(team);
  return (
    <div
      style={{
        flex: 1,
        padding: '14px 16px',
        background: side === 'A' ? 'rgba(248,250,252,0.6)' : 'rgba(241,245,249,0.5)',
        borderTop: `3px solid ${meta.primary}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {backers.length === 0 ? (
        <div style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>No backers</div>
      ) : (
        backers.map(b => (
          <BackerRow key={b.ownerName} backer={b} exact={b.status === 'exact'} />
        ))
      )}
    </div>
  );
}

// ─── H2H Card ─────────────────────────────────────────────────────────────────

function H2HCard({
  series,
  allBets,
}: {
  series: SeriesResult;
  allBets: OwnerPlayoffBets[];
}) {
  const [teamA, teamB] = series.teams;
  if (!teamA && !teamB) return null;

  const metaA = getTeamMeta(teamA);
  const metaB = getTeamMeta(teamB);

  const backersA: Backer[] = [];
  const backersB: Backer[] = [];

  for (const owner of allBets) {
    const bet = owner.series.find(s => s.seriesId === series.seriesId);
    if (!bet?.pick) continue;
    const color = getOwnerColor(owner.ownerName);
    const status = getPickStatus(bet.pick, bet.score, series.winner, series.score);
    const backer: Backer = { ownerName: owner.ownerName, color, pickScore: bet.score ?? null, status };
    if (bet.pick === teamA) backersA.push(backer);
    else if (bet.pick === teamB) backersB.push(backer);
  }

  const total = backersA.length + backersB.length;
  const pctA  = total ? (backersA.length / total) * 100 : 50;
  const pctB  = total ? (backersB.length / total) * 100 : 50;

  const winnerSide = series.winner === teamA ? 'A' : series.winner === teamB ? 'B' : null;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 150ms ease',
      }}
    >
      {/* Status bar */}
      <div
        style={{
          padding: '10px 16px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {series.label}
        </div>
        {series.winner ? (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>
            ✓ {getTeamMeta(series.winner).abbr} in {series.score}
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#F59E0B',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#92400E',
                letterSpacing: '0.05em',
              }}
            >
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Matchup head */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {/* Team A */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            <TeamMark team={teamA} size={30} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {teamA.split(' ').slice(-1)[0]}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>
                {backersA.length} backer{backersA.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', flexShrink: 0 }}>vs</div>

          {/* Team B (reversed) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ minWidth: 0, textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {teamB.split(' ').slice(-1)[0]}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>
                {backersB.length} backer{backersB.length !== 1 ? 's' : ''}
              </div>
            </div>
            <TeamMark team={teamB} size={30} />
          </div>
        </div>

        {/* Vote bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: metaA.primary,
              width: 32,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(pctA)}%
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              height: 10,
              borderRadius: 999,
              overflow: 'hidden',
              background: '#F1F5F9',
            }}
          >
            <div
              style={{
                width: `${pctA}%`,
                background: metaA.primary,
                opacity: winnerSide === 'B' ? 0.4 : 1,
              }}
            />
            <div
              style={{
                width: `${pctB}%`,
                background: metaB.primary,
                opacity: winnerSide === 'A' ? 0.4 : 1,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: metaB.primary,
              width: 32,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(pctB)}%
          </div>
        </div>
      </div>

      {/* Backer columns */}
      <div style={{ display: 'flex', borderTop: '1px solid #F1F5F9' }}>
        <BackerColumn team={teamA} backers={backersA} side="A" />
        <div style={{ width: 1, background: '#E2E8F0' }} />
        <BackerColumn team={teamB} backers={backersB} side="B" />
      </div>
    </div>
  );
}

// ─── Round section ────────────────────────────────────────────────────────────

function RoundSection({
  kicker,
  title,
  countLabel,
  seriesList,
  allBets,
}: {
  kicker: string;
  title: string;
  countLabel: string;
  seriesList: SeriesResult[];
  allBets: OwnerPlayoffBets[];
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#94A3B8',
          }}
        >
          {kicker}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>· {countLabel}</div>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      {/* 2-col grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
        className="max-[720px]:grid-cols-1"
      >
        {seriesList.map(s => (
          <H2HCard key={s.seriesId} series={s} allBets={allBets} />
        ))}
      </div>
    </div>
  );
}

// ─── Exported tab ─────────────────────────────────────────────────────────────

export default function BetsTabV2({
  allBets,
  results,
}: {
  allBets: OwnerPlayoffBets[];
  results: PlayoffResults;
}) {
  if (allBets.length === 0) {
    return (
      <div className="text-center py-16 text-[#94A3B8] text-[14px]">
        No bets entered yet — data/playoff-bets.json is empty.
      </div>
    );
  }

  // Group by round, latest round first
  const byRound = new Map<number, SeriesResult[]>();
  for (const s of results.series) {
    if (!s.teams[0] && !s.teams[1]) continue;
    if (!byRound.has(s.round)) byRound.set(s.round, []);
    byRound.get(s.round)!.push(s);
  }

  const roundLabels: Record<number, string> = {
    1: 'First Round',
    2: 'Conference Semifinals',
    3: 'Conference Finals',
    4: 'NBA Finals',
  };

  const roundKickers: Record<number, string> = {
    1: 'Round 1',
    2: 'Round 2',
    3: 'Round 3',
    4: 'Round 4',
  };

  const sortedRounds = Array.from(byRound.keys()).sort((a, b) => b - a);

  return (
    <div className="px-3 sm:px-6" style={{ paddingTop: 20, paddingBottom: 20, background: '#F8FAFC', minHeight: 600 }}>
      {sortedRounds.map(round => {
        const seriesList = byRound.get(round)!;
        const settled    = seriesList.filter(s => s.winner !== null).length;
        const active     = seriesList.filter(s => s.winner === null).length;
        const countLabel = active > 0
          ? `${active} active series`
          : `${settled} settled`;

        return (
          <RoundSection
            key={round}
            kicker={roundKickers[round] ?? `Round ${round}`}
            title={roundLabels[round] ?? `Round ${round}`}
            countLabel={countLabel}
            seriesList={seriesList}
            allBets={allBets}
          />
        );
      })}
    </div>
  );
}
