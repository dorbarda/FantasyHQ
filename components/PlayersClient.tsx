'use client';

import { useState, useMemo } from 'react';
import type { Player } from '@/lib/types';

// ─── Position badge ───────────────────────────────────────────────────────────

const POS_STYLE: Record<string, { bg: string; text: string }> = {
  G: { bg: '#C8956C', text: '#fff' },
  F: { bg: '#10B981', text: '#fff' },
  C: { bg: '#3B82F6', text: '#fff' },
};

function PosBadge({ pos }: { pos: string }) {
  const s = POS_STYLE[pos] ?? { bg: '#94A3B8', text: '#fff' };
  return (
    <span
      className="inline-flex items-center justify-center text-[10px] font-bold w-5 h-5 rounded shrink-0"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {pos}
    </span>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1 rounded-full bg-[#1E3050] overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Top 3 podium cards ───────────────────────────────────────────────────────

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#C8956C'];
const MEDAL_LABELS = ['1st', '2nd', '3rd'];

function PodiumCard({ player, rank }: { player: Player; rank: number }) {
  const medal = MEDAL_COLORS[rank] ?? '#64748B';
  const isFirst = rank === 0;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5 ${
        isFirst ? 'border-[#F59E0B]/40 bg-gradient-to-b from-[#1a2a10] to-[#0B1628]' : 'border-[#1E3050] bg-[#0B1628]'
      }`}
    >
      {/* Rank */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: medal }}
        >
          {MEDAL_LABELS[rank]}
        </span>
        <PosBadge pos={player.position} />
      </div>

      {/* Name + team */}
      <div>
        <p className="text-[17px] font-bold text-[#F0F4F8] leading-tight">{player.name}</p>
        <p className="text-[12px] text-[#64748B] mt-0.5">{player.team}</p>
      </div>

      {/* FP */}
      <div className="flex items-end gap-1.5">
        <span
          className="text-[36px] font-black tabular-nums leading-none"
          style={{ color: isFirst ? '#F59E0B' : '#C8956C' }}
        >
          {player.fp.toFixed(1)}
        </span>
        <span className="text-[11px] text-[#64748B] mb-1">FP/g</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1 pt-3 border-t border-[#1E3050]">
        {[
          { label: 'PTS', v: player.pts },
          { label: 'REB', v: player.reb },
          { label: 'AST', v: player.ast },
          { label: '3PM', v: player.tpm },
        ].map(({ label, v }) => (
          <div key={label} className="text-center">
            <p className="text-[14px] font-bold tabular-nums text-[#F0F4F8]">{v.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-wider text-[#475569] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sort config ──────────────────────────────────────────────────────────────

type SortKey = 'fp' | 'pts' | 'reb' | 'ast' | 'tpm';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'fp',  label: 'FP' },
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'tpm', label: '3PM' },
];

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({
  player,
  rank,
  maxes,
  sortKey,
}: {
  player: Player;
  rank: number;
  maxes: Record<SortKey, number>;
  sortKey: SortKey;
}) {
  const BAR_COLORS: Record<SortKey, string> = {
    fp:  '#C8956C',
    pts: '#F59E0B',
    reb: '#10B981',
    ast: '#3B82F6',
    tpm: '#A78BFA',
  };

  return (
    <div className="grid grid-cols-[32px_1fr_56px_56px_56px_56px_68px] gap-x-2 items-center px-4 py-3 border-b border-[#1E3050] last:border-0 hover:bg-[#0E1929] transition-colors group">
      {/* Rank */}
      <span className="text-[12px] font-semibold text-[#475569] tabular-nums">{rank}</span>

      {/* Player */}
      <div className="min-w-0 flex items-center gap-2">
        <PosBadge pos={player.position} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#F0F4F8] truncate leading-tight">{player.name}</p>
          <p className="text-[10px] text-[#475569]">{player.team}</p>
        </div>
      </div>

      {/* Stats with mini bars */}
      {(['pts', 'reb', 'ast', 'tpm'] as const).map((key) => (
        <div key={key} className="text-right">
          <p className={`text-[13px] tabular-nums font-semibold ${sortKey === key ? 'text-[#C8956C]' : 'text-[#94A3B8]'}`}>
            {player[key].toFixed(1)}
          </p>
          <div className="mt-1">
            <StatBar value={player[key]} max={maxes[key]} color={BAR_COLORS[key]} />
          </div>
        </div>
      ))}

      {/* FP */}
      <div className="text-right">
        <p className={`text-[14px] font-bold tabular-nums ${sortKey === 'fp' ? 'text-[#C8956C]' : 'text-[#F0F4F8]'}`}>
          {player.fp.toFixed(1)}
        </p>
        <div className="mt-1">
          <StatBar value={player.fp} max={maxes.fp} color="#C8956C" />
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function PlayersClient({ players }: { players: Player[] }) {
  const [posFilter, setPosFilter] = useState<'All' | 'G' | 'F' | 'C'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('fp');

  const filtered = useMemo(() => {
    const base = posFilter === 'All' ? players : players.filter(p => p.position === posFilter);
    return [...base].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [players, posFilter, sortKey]);

  const maxes = useMemo<Record<SortKey, number>>(() => ({
    fp:  Math.max(...filtered.map(p => p.fp),  1),
    pts: Math.max(...filtered.map(p => p.pts), 1),
    reb: Math.max(...filtered.map(p => p.reb), 1),
    ast: Math.max(...filtered.map(p => p.ast), 1),
    tpm: Math.max(...filtered.map(p => p.tpm), 1),
  }), [filtered]);

  const podium = filtered.slice(0, 3);
  const rest   = filtered.slice(3);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Position filter */}
        <div className="flex items-center gap-1 bg-[#0B1628] rounded-lg p-1 border border-[#1E3050]">
          {(['All', 'G', 'F', 'C'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                posFilter === pos
                  ? 'bg-[#C8956C] text-white'
                  : 'text-[#94A3B8] hover:text-[#F0F4F8]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748B] uppercase tracking-wider">Sort by</span>
          <div className="flex items-center gap-1 bg-[#0B1628] rounded-lg p-1 border border-[#1E3050]">
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                  sortKey === key
                    ? 'bg-[#1E3050] text-[#C8956C]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#475569]">No players found</div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((p, i) => (
              <PodiumCard key={p.id} player={p} rank={i} />
            ))}
          </div>

          {/* Table */}
          {rest.length > 0 && (
            <div className="rounded-xl border border-[#1E3050] bg-[#0B1628] overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1fr_56px_56px_56px_56px_68px] gap-x-2 px-4 py-2.5 bg-[#0E1929] border-b border-[#1E3050]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">#</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">Player</span>
                {(['PTS', 'REB', 'AST', '3PM'] as const).map((lbl) => (
                  <span key={lbl} className={`text-[10px] font-semibold uppercase tracking-widest text-right ${
                    sortKey === lbl.toLowerCase().replace('3pm', 'tpm') ? 'text-[#C8956C]' : 'text-[#475569]'
                  }`}>
                    {lbl}
                  </span>
                ))}
                <span className={`text-[10px] font-semibold uppercase tracking-widest text-right ${
                  sortKey === 'fp' ? 'text-[#C8956C]' : 'text-[#475569]'
                }`}>
                  FP/g
                </span>
              </div>

              {rest.map((p, i) => (
                <TableRow key={p.id} player={p} rank={i + 4} maxes={maxes} sortKey={sortKey} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
