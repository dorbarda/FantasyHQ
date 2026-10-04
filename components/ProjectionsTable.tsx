'use client';

import { useState } from 'react';
import type { ProjectionRow, StatLine } from '@/lib/espn-projections';

interface Props {
  rows: ProjectionRow[];
  lastLabel: string; // "2025-26"
  nextLabel: string; // "2026-27"
}

const fmt = (n: number) => n.toLocaleString('en-US');
const fmt1 = (n: number) => n.toFixed(1);

function diff(a: number, b: number, digits = 0) {
  const d = a - b;
  const text = (d > 0 ? '+' : '') + (digits ? d.toFixed(digits) : fmt(Math.round(d)));
  const color = d > 0 ? 'text-green-600' : d < 0 ? 'text-red-500' : 'text-muted';
  return <span className={`font-semibold ${color}`}>{text}</span>;
}

const TH = 'px-3 py-2 text-right text-[11px] font-black uppercase tracking-wider text-muted whitespace-nowrap';
const TD = 'px-3 py-2 text-right text-[13px] tabular-nums text-foreground';
const DASH = <span className="text-muted">—</span>;

function Cells({ s, show }: { s: StatLine | null; show: Array<'pts' | 'avg' | 'gp'> }) {
  return (
    <>
      {show.map(k => (
        <td key={k} className={TD}>
          {s ? (k === 'avg' ? fmt1(s.avg) : fmt(s[k])) : DASH}
        </td>
      ))}
    </>
  );
}

function PlayerCell({ r, i }: { r: ProjectionRow; i: number }) {
  return (
    <>
      <td className="pl-5 pr-2 py-2 text-[12px] text-muted tabular-nums">{i + 1}</td>
      <td className="px-3 py-2 text-left whitespace-nowrap">
        <span className="text-[13px] font-semibold text-foreground">{r.name}</span>
        <span className="text-[11px] text-muted ml-2">{r.position} · {r.proTeam}</span>
      </td>
    </>
  );
}

export default function ProjectionsTable({ rows, lastLabel, nextLabel }: Props) {
  const [tab, setTab] = useState<'last' | 'next'>('next');

  const tabBtn = (id: 'last' | 'next', label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
        tab === id
          ? 'bg-panel-border text-white'
          : 'bg-surface border border-border text-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  const lastRows = rows.filter(r => r.projLast && r.actLast);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex flex-wrap items-center gap-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted mr-auto">
          Player Projections
        </p>
        <div className="flex gap-1.5">
          {tabBtn('last', 'Last Season')}
          {tabBtn('next', nextLabel)}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        {tab === 'last' ? (
          <table className="w-full min-w-[820px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="pl-5 pr-2 py-2 w-8" />
                <th className={`${TH} text-left`}>Player</th>
                <th className={TH}>{lastLabel} Proj PTS</th>
                <th className={TH}>Proj AVG</th>
                <th className={TH}>Actual PTS</th>
                <th className={TH}>Actual GP</th>
                <th className={TH}>Actual AVG</th>
                <th className={TH}>PTS Diff</th>
                <th className={TH}>AVG Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-secondary">
              {lastRows.map((r, i) => (
                <tr key={r.playerId}>
                  <PlayerCell r={r} i={i} />
                  <Cells s={r.projLast} show={['pts', 'avg']} />
                  <Cells s={r.actLast} show={['pts', 'gp', 'avg']} />
                  <td className={TD}>{diff(r.actLast!.pts, r.projLast!.pts)}</td>
                  <td className={TD}>{diff(r.actLast!.avg, r.projLast!.avg, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="pl-5 pr-2 py-2 w-8" />
                <th className={`${TH} text-left`}>Player</th>
                <th className={TH}>{nextLabel} Proj PTS</th>
                <th className={TH}>Proj AVG</th>
                <th className={TH}>Proj GP</th>
                <th className={TH}>{lastLabel} PTS</th>
                <th className={TH}>AVG</th>
                <th className={TH}>GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-secondary">
              {rows.map((r, i) => (
                <tr key={r.playerId}>
                  <PlayerCell r={r} i={i} />
                  <Cells s={r.projNext} show={['pts', 'avg', 'gp']} />
                  <Cells s={r.actLast} show={['pts', 'avg', 'gp']} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="px-5 py-3 border-t border-border text-[11px] text-muted">
        ESPN projections, league scoring. AVG = points ÷ games played. Diff = actual minus projected.
      </p>
    </div>
  );
}
