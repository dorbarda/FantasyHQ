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
  pending: { bar: 'bg-[#CBD5E1]', bg: 'bg-[#F8FAFC]',   border: 'border-[#E2E8F0]',   header: 'bg-[#F8FAFC]',   icon: '',  text: 'text-[#475569]'  },
  correct: { bar: 'bg-[#10B981]', bg: 'bg-[#F0FDF4]',   border: 'border-[#86EFAC]',   header: 'bg-[#DCFCE7]',   icon: '✓', text: 'text-[#059669]'  },
  exact:   { bar: 'bg-[#EAB308]', bg: 'bg-[#FEFCE8]',   border: 'border-[#FDE047]',   header: 'bg-[#FEF9C3]',   icon: '★', text: 'text-[#CA8A04]'  },
  wrong43: { bar: 'bg-[#F59E0B]', bg: 'bg-[#FFFBEB]',   border: 'border-[#FCD34D]',   header: 'bg-[#FEF3C7]',   icon: '~', text: 'text-[#D97706]'  },
  wrong:   { bar: 'bg-[#EF4444]', bg: 'bg-[#FEF2F2]',   border: 'border-[#FCA5A5]',   header: 'bg-[#FEE2E2]',   icon: '✗', text: 'text-[#DC2626]'  },
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          {series.label}
        </span>
        {cfg.icon && (
          <span className={`text-[12px] font-bold ${cfg.text}`}>{cfg.icon}</span>
        )}
      </div>

      {/* Teams */}
      <div className="bg-white divide-y divide-[#F1F5F9]">
        {[teamA, teamB].map((team, i) => {
          if (!team) return null;
          const isPicked = !!pick && pick.trim().toLowerCase() === team.trim().toLowerCase();
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${isPicked ? cfg.bg : ''}`}>
              <span className={`shrink-0 w-2 h-2 rounded-full ${isPicked ? cfg.bar : 'bg-[#E2E8F0]'}`} />
              <span className={`flex-1 text-[12px] truncate ${isPicked ? `font-bold ${cfg.text}` : 'font-medium text-[#94A3B8]'}`}>
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
        <div className="px-3 py-1.5 bg-[#F8FAFC] border-t border-[#F1F5F9]">
          <span className="text-[10px] text-[#64748B]">
            Result:{' '}
            <span className="font-semibold text-[#0F172A]">{series.winner}</span>
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
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">{label}</p>
      <p className={`text-[13px] font-bold truncate ${status === 'pending' ? 'text-[#0F172A]' : cfg.text}`}>
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
      <p className="text-[12px] font-black uppercase tracking-[0.15em] text-[#475569] mb-3 border-t border-[#E2E8F0] pt-4">
        {label}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {eastVisible.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">
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
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">
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
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm'
                  : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#0F172A]'
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
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">
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
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] mb-3">
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
                  className={`text-[11px] font-medium rounded-lg px-2.5 py-1 border ${cfg.bg} ${cfg.border} ${s !== 'pending' ? cfg.text : 'text-[#94A3B8]'}`}
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
