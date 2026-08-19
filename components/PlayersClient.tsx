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
    <div className="h-1 rounded-full bg-border overflow-hidden w-full">
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

type View = 'season' | 'l7';

function getViewStats(player: Player, view: View) {
  if (view === 'l7') {
    return {
      pts: player.pts7,
      reb: player.reb7,
      ast: player.ast7,
      tpm: player.tpm7,
      stl: player.stl7,
      blk: player.blk7,
      to: player.to7,
      fp: player.fp7,
    };
  }
  return {
    pts: player.pts,
    reb: player.reb,
    ast: player.ast,
    tpm: player.tpm,
    stl: player.stl,
    blk: player.blk,
    to: player.to,
    fp: player.fp,
  };
}

function PodiumCard({ player, rank, view }: { player: Player; rank: number; view: View }) {
  const medal = MEDAL_COLORS[rank] ?? '#475569';
  const isFirst = rank === 0;
  const vs = getViewStats(player, view);

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5 ${
        isFirst ? 'border-warning/40 bg-gradient-to-b from-warning-surface to-warning-surface/30' : 'border-border bg-surface'
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
        <p className="text-[17px] font-bold text-foreground leading-tight">{player.name}</p>
        <p className="text-[12px] text-secondary mt-0.5">{player.team}</p>
      </div>

      {/* FP */}
      <div className="flex items-end gap-1.5">
        <span
          className="text-[36px] font-black tabular-nums leading-none"
          style={{ color: isFirst ? '#F59E0B' : '#C8956C' }}
        >
          {vs.fp.toFixed(1)}
        </span>
        <span className="text-[11px] text-secondary mb-1">FP/g</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1 pt-3 border-t border-border">
        {[
          { label: 'PTS', v: vs.pts },
          { label: 'REB', v: vs.reb },
          { label: 'AST', v: vs.ast },
          { label: '3PM', v: vs.tpm },
        ].map(({ label, v }) => (
          <div key={label} className="text-center">
            <p className="text-[14px] font-bold tabular-nums text-foreground">{v.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-wider text-secondary mt-0.5">{label}</p>
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

type MaxesKey = SortKey;

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({
  player,
  rank,
  maxes,
  sortKey,
  view,
}: {
  player: Player;
  rank: number;
  maxes: Record<MaxesKey, number>;
  sortKey: SortKey;
  view: View;
}) {
  const BAR_COLORS: Record<SortKey, string> = {
    fp:  '#C8956C',
    pts: 'var(--warning)',
    reb: 'var(--positive)',
    ast: 'var(--info)',
    tpm: '#A78BFA',
  };

  const vs = getViewStats(player, view);

  return (
    <div className="grid grid-cols-[32px_1fr_56px_56px_56px_56px_68px] gap-x-2 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-surface-secondary transition-colors group">
      {/* Rank */}
      <span className="text-[12px] font-semibold text-secondary tabular-nums">{rank}</span>

      {/* Player */}
      <div className="min-w-0 flex items-center gap-2">
        <PosBadge pos={player.position} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{player.name}</p>
          <p className="text-[10px] text-secondary">{player.team}</p>
        </div>
      </div>

      {/* Stats with mini bars */}
      {(['pts', 'reb', 'ast', 'tpm'] as const).map((key) => (
        <div key={key} className="text-right">
          <p className={`text-[13px] tabular-nums font-semibold ${sortKey === key ? 'text-accent' : 'text-muted'}`}>
            {vs[key].toFixed(1)}
          </p>
          <div className="mt-1">
            <StatBar value={vs[key]} max={maxes[key]} color={BAR_COLORS[key]} />
          </div>
        </div>
      ))}

      {/* FP */}
      <div className="text-right">
        <p className={`text-[14px] font-bold tabular-nums ${sortKey === 'fp' ? 'text-accent' : 'text-foreground'}`}>
          {vs.fp.toFixed(1)}
        </p>
        <div className="mt-1">
          <StatBar value={vs.fp} max={maxes.fp} color="#C8956C" />
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function PlayersClient({ players }: { players: Player[] }) {
  const [posFilter, setPosFilter] = useState<'All' | 'G' | 'F' | 'C'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('fp');
  const [view, setView] = useState<View>('season');

  const filtered = useMemo(() => {
    const base = posFilter === 'All' ? players : players.filter(p => p.position === posFilter);
    return [...base].sort((a, b) => {
      const aVal = view === 'l7' ? getViewStats(a, 'l7')[sortKey] : getViewStats(a, 'season')[sortKey];
      const bVal = view === 'l7' ? getViewStats(b, 'l7')[sortKey] : getViewStats(b, 'season')[sortKey];
      return bVal - aVal;
    });
  }, [players, posFilter, sortKey, view]);

  const maxes = useMemo<Record<MaxesKey, number>>(() => {
    const vs = filtered.map(p => getViewStats(p, view));
    return {
      fp:  Math.max(...vs.map(s => s.fp),  1),
      pts: Math.max(...vs.map(s => s.pts), 1),
      reb: Math.max(...vs.map(s => s.reb), 1),
      ast: Math.max(...vs.map(s => s.ast), 1),
      tpm: Math.max(...vs.map(s => s.tpm), 1),
    };
  }, [filtered, view]);

  const podium = filtered.slice(0, 3);
  const rest   = filtered.slice(3);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: position filter + season/L7 toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Position filter */}
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
            {(['All', 'G', 'F', 'C'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                  posFilter === pos
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Season / Last 7 toggle */}
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
            <button
              onClick={() => setView('season')}
              className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                view === 'season' ? 'bg-foreground text-accent' : 'text-secondary hover:text-muted'
              }`}
            >
              Season
            </button>
            <button
              onClick={() => setView('l7')}
              className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                view === 'l7' ? 'bg-foreground text-accent' : 'text-secondary hover:text-muted'
              }`}
            >
              Last 7
            </button>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-secondary uppercase tracking-wider">Sort by</span>
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                  sortKey === key
                    ? 'bg-foreground text-accent'
                    : 'text-secondary hover:text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-secondary">No players found</div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((p, i) => (
              <PodiumCard key={p.id} player={p} rank={i} view={view} />
            ))}
          </div>

          {/* Table */}
          {rest.length > 0 && (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[32px_1fr_56px_56px_56px_56px_68px] gap-x-2 px-4 py-2.5 bg-surface-secondary border-b border-border">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary">#</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary">Player</span>
                {(['PTS', 'REB', 'AST', '3PM'] as const).map((lbl) => (
                  <span key={lbl} className={`text-[10px] font-semibold uppercase tracking-widest text-right ${
                    sortKey === lbl.toLowerCase().replace('3pm', 'tpm') ? 'text-accent' : 'text-secondary'
                  }`}>
                    {lbl}
                  </span>
                ))}
                <span className={`text-[10px] font-semibold uppercase tracking-widest text-right ${
                  sortKey === 'fp' ? 'text-accent' : 'text-secondary'
                }`}>
                  FP/g
                </span>
              </div>

              {rest.map((p, i) => (
                <TableRow key={p.id} player={p} rank={i + 4} maxes={maxes} sortKey={sortKey} view={view} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
