'use client';

import { useState } from 'react';

type SeriesStatus = 'pending' | 'correct' | 'exact' | 'wrong43' | 'wrong';

interface SeriesResult {
  seriesId: string;
  round: number;
  conference: string;
  label: string;
  teams: [string, string];
  winner: string | null;
  score: string | null;
}

interface OwnerBets {
  ownerName: string;
  bonusBets: { westChampion: string; eastChampion: string; nbaChampion: string };
  playIn: { gameId: string; pick: string }[];
  series: { seriesId: string; pick: string; score: string }[];
}

interface Props {
  owners: OwnerBets[];
  r1Series: SeriesResult[];
  r2Series: SeriesResult[];
  r3Series: SeriesResult[];
  championResults: { west: string | null; east: string | null; nba: string | null };
}

const STATUS: Record<SeriesStatus, { bar: string; bg: string; border: string; header: string; icon: string; text: string }> = {
  pending: { bar: 'bg-border-strong', bg: 'bg-background',   border: 'border-border',   header: 'bg-background',   icon: '',  text: 'text-secondary'  },
  correct: { bar: 'bg-positive', bg: 'bg-positive-surface',   border: 'border-positive-bright',   header: 'bg-positive-surface',   icon: '✓', text: 'text-positive'  },
  exact:   { bar: 'bg-gold', bg: 'bg-warning-surface',   border: 'border-warning-bright',   header: 'bg-gold-surface',   icon: '★', text: 'text-warning'  },
  wrong43: { bar: 'bg-warning', bg: 'bg-warning-surface',   border: 'border-warning-bright',   header: 'bg-warning-surface',   icon: '~', text: 'text-warning'  },
  wrong:   { bar: 'bg-negative', bg: 'bg-negative-surface',   border: 'border-negative-bright',   header: 'bg-negative-surface',   icon: '✗', text: 'text-negative'  },
};

function seriesStatus(
  pick: string,
  pickScore: string,
  winner: string | null,
  actualScore: string | null,
): SeriesStatus {
  if (!pick || winner === null) return 'pending';
  const correct = pick.trim().toLowerCase() === winner.trim().toLowerCase();
  if (correct) {
    return pickScore && actualScore && pickScore === actualScore ? 'exact' : 'correct';
  }
  return actualScore === '4-3' && pickScore === '4-3' ? 'wrong43' : 'wrong';
}

function shortName(team: string) {
  return team.trim().split(' ').at(-1) ?? team;
}

function getEliminatedTeams(allSeries: SeriesResult[]): Set<string> {
  const eliminated = new Set<string>();
  for (const s of allSeries) {
    if (s.winner) {
      for (const team of s.teams) {
        if (team && team.trim().toLowerCase() !== s.winner.trim().toLowerCase()) {
          eliminated.add(team.trim().toLowerCase());
        }
      }
    }
  }
  return eliminated;
}

// ── Series card ───────────────────────────────────────────────────────────────

function SeriesCard({
  series,
  ownerBet,
}: {
  series: SeriesResult;
  ownerBet?: { pick: string; score: string };
}) {
  const pick = ownerBet?.pick ?? '';
  const pickScore = ownerBet?.score ?? '';
  const status = seriesStatus(pick, pickScore, series.winner, series.score);
  const cfg = STATUS[status];
  const [teamA, teamB] = series.teams;

  return (
    <div className={`rounded-xl border overflow-hidden ${cfg.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${cfg.header}`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {series.label}
        </span>
        {cfg.icon && (
          <span className={`text-[12px] font-bold ${cfg.text}`}>{cfg.icon}</span>
        )}
      </div>

      {/* Teams */}
      <div className="bg-surface divide-y divide-surface-secondary">
        {[teamA, teamB].map((team, i) => {
          if (!team) return null;
          const isPicked = !!pick && pick.trim().toLowerCase() === team.trim().toLowerCase();
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${isPicked ? cfg.bg : ''}`}>
              <span className={`shrink-0 w-2 h-2 rounded-full ${isPicked ? cfg.bar : 'bg-border'}`} />
              <span className={`flex-1 text-[12px] truncate ${isPicked ? `font-bold ${cfg.text}` : 'font-medium text-muted'}`}>
                {team}
              </span>
              {isPicked && pickScore && (
                <span className={`text-[11px] font-bold shrink-0 ${cfg.text}`}>{pickScore}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Result footer */}
      {series.winner && (
        <div className="px-3 py-1.5 bg-background border-t border-surface-secondary">
          <span className="text-[10px] text-tertiary">
            Result:{' '}
            <span className="font-semibold text-foreground">{series.winner}</span>
            {series.score ? ` (${series.score})` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Bonus bet pill ────────────────────────────────────────────────────────────

function BonusCard({
  label,
  pick,
  winner,
  isEliminated,
}: {
  label: string;
  pick: string;
  winner: string | null;
  isEliminated: boolean;
}) {
  const status: SeriesStatus =
    !pick ? 'pending' :
    winner !== null
      ? (pick.trim().toLowerCase() === winner.trim().toLowerCase() ? 'correct' : 'wrong')
      : isEliminated ? 'wrong' : 'pending';
  const cfg = STATUS[status];

  return (
    <div className={`flex-1 min-w-0 rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className={`text-[13px] font-bold truncate ${status === 'pending' ? 'text-foreground' : cfg.text}`}>
        {pick ? shortName(pick) : '—'}
      </p>
      {status !== 'pending' && (
        <span className={`text-[11px] font-bold ${cfg.text}`}>{cfg.icon}</span>
      )}
    </div>
  );
}

// ── Round section ─────────────────────────────────────────────────────────────

function RoundSection({
  label,
  eastSeries,
  westSeries,
  owner,
}: {
  label: string;
  eastSeries: SeriesResult[];
  westSeries: SeriesResult[];
  owner: OwnerBets;
}) {
  const hasTeams = (s: SeriesResult) => s.teams[0] || s.teams[1];
  const eastVisible = eastSeries.filter(hasTeams);
  const westVisible = westSeries.filter(hasTeams);
  if (eastVisible.length === 0 && westVisible.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-[12px] font-black uppercase tracking-[0.15em] text-secondary mb-3 border-t border-border pt-4">
        {label}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {eastVisible.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
              East Conference · {label}
            </p>
            <div className="space-y-3">
              {eastVisible.map(series => (
                <SeriesCard
                  key={series.seriesId}
                  series={series}
                  ownerBet={owner.series.find(s => s.seriesId === series.seriesId)}
                />
              ))}
            </div>
          </div>
        )}
        {westVisible.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
              West Conference · {label}
            </p>
            <div className="space-y-3">
              {westVisible.map(series => (
                <SeriesCard
                  key={series.seriesId}
                  series={series}
                  ownerBet={owner.series.find(s => s.seriesId === series.seriesId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OwnerBracketView({ owners, r1Series, r2Series, r3Series, championResults }: Props) {
  const [selected, setSelected] = useState(owners[0]?.ownerName ?? '');
  const owner = owners.find(o => o.ownerName === selected);

  const eastR1 = r1Series.filter(s => s.conference === 'east');
  const westR1 = r1Series.filter(s => s.conference === 'west');
  const eastR2 = r2Series.filter(s => s.conference === 'east');
  const westR2 = r2Series.filter(s => s.conference === 'west');
  const eastR3 = r3Series.filter(s => s.conference === 'east');
  const westR3 = r3Series.filter(s => s.conference === 'west');

  const allSeries = [...r1Series, ...r2Series, ...r3Series];
  const eliminatedTeams = getEliminatedTeams(allSeries);

  return (
    <div>
      {/* Owner selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {owners.map(o => {
          const first = o.ownerName.split(' ')[0];
          const active = o.ownerName === selected;
          return (
            <button
              key={o.ownerName}
              onClick={() => setSelected(o.ownerName)}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border ${
                active
                  ? 'bg-foreground text-white border-foreground shadow-sm'
                  : 'bg-surface text-secondary border-border hover:border-border-strong hover:text-foreground'
              }`}
            >
              {first}
            </button>
          );
        })}
      </div>

      {owner && (
        <>
          {/* Bonus bets */}
          <div className="flex gap-3 mb-6">
            <BonusCard
              label="West Champion"
              pick={owner.bonusBets.westChampion}
              winner={championResults.west}
              isEliminated={!!owner.bonusBets.westChampion && eliminatedTeams.has(owner.bonusBets.westChampion.trim().toLowerCase())}
            />
            <BonusCard
              label="East Champion"
              pick={owner.bonusBets.eastChampion}
              winner={championResults.east}
              isEliminated={!!owner.bonusBets.eastChampion && eliminatedTeams.has(owner.bonusBets.eastChampion.trim().toLowerCase())}
            />
            <BonusCard
              label="NBA Champion"
              pick={owner.bonusBets.nbaChampion}
              winner={championResults.nba}
              isEliminated={!!owner.bonusBets.nbaChampion && eliminatedTeams.has(owner.bonusBets.nbaChampion.trim().toLowerCase())}
            />
          </div>

          {/* Round 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
                East Conference · Round 1
              </p>
              <div className="space-y-3">
                {eastR1.map(series => (
                  <SeriesCard
                    key={series.seriesId}
                    series={series}
                    ownerBet={owner.series.find(s => s.seriesId === series.seriesId)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-3">
                West Conference · Round 1
              </p>
              <div className="space-y-3">
                {westR1.map(series => (
                  <SeriesCard
                    key={series.seriesId}
                    series={series}
                    ownerBet={owner.series.find(s => s.seriesId === series.seriesId)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Semifinals */}
          <RoundSection label="Semifinals" eastSeries={eastR2} westSeries={westR2} owner={owner} />

          {/* Conference Finals */}
          <RoundSection label="Conference Finals" eastSeries={eastR3} westSeries={westR3} owner={owner} />

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ['correct', 'Correct winner'],
                ['exact',   'Exact (winner + score)'],
                ['wrong43', '4-3 wrong winner'],
                ['wrong',   'Wrong / Eliminated'],
                ['pending', 'Pending'],
              ] as [SeriesStatus, string][]
            ).map(([s, label]) => {
              const cfg = STATUS[s];
              return (
                <span
                  key={s}
                  className={`text-[11px] font-medium rounded-lg px-2.5 py-1 border ${cfg.bg} ${cfg.border} ${s !== 'pending' ? cfg.text : 'text-muted'}`}
                >
                  {cfg.icon && `${cfg.icon} `}{label}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
