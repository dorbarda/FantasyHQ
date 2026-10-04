'use client';

import { useMemo, useState } from 'react';
import type { ProjectionRow, StatLine } from '@/lib/espn-projections';

interface Props {
  rows: ProjectionRow[];
  lastLabel: string; // "2025-26"
  nextLabel: string; // "2026-27"
}

type Tab = 'last' | 'next';

interface Col {
  key: string;
  label: string;
  value: (r: ProjectionRow) => number | string | null;
  render: (r: ProjectionRow) => React.ReactNode;
  align?: 'left';
}

const fmt = (n: number) => n.toLocaleString('en-US');
const fmt1 = (n: number) => n.toFixed(1);
const DASH = <span className="text-muted">—</span>;

function stat(s: StatLine | null, k: 'pts' | 'avg' | 'gp') {
  return s ? (k === 'avg' ? fmt1(s.avg) : fmt(s[k])) : DASH;
}

function diff(a: number, b: number, digits = 0) {
  const d = a - b;
  const text = (d > 0 ? '+' : '') + (digits ? d.toFixed(digits) : fmt(Math.round(d)));
  const color = d > 0 ? 'text-green-600' : d < 0 ? 'text-red-500' : 'text-muted';
  return <span className={`font-semibold ${color}`}>{text}</span>;
}

const playerCol: Col = {
  key: 'player',
  label: 'Player',
  align: 'left',
  value: r => r.name,
  render: r => (
    <>
      <span className="text-[13px] font-semibold text-foreground">{r.name}</span>
      <span className="text-[11px] text-muted ml-2">{r.position} · {r.proTeam}</span>
    </>
  ),
};

function statCol(
  key: string, label: string, pick: (r: ProjectionRow) => StatLine | null, k: 'pts' | 'avg' | 'gp',
): Col {
  return { key, label, value: r => pick(r)?.[k] ?? null, render: r => stat(pick(r), k) };
}

function diffCol(key: string, label: string, k: 'pts' | 'avg'): Col {
  return {
    key, label,
    value: r => (r.actLast && r.projLast ? r.actLast[k] - r.projLast[k] : null),
    render: r => (r.actLast && r.projLast ? diff(r.actLast[k], r.projLast[k], k === 'avg' ? 1 : 0) : DASH),
  };
}

export default function ProjectionsTable({ rows, lastLabel, nextLabel }: Props) {
  const [tab, setTab] = useState<Tab>('next');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const cols: Col[] = tab === 'last'
    ? [
        playerCol,
        statCol('projPts', `${lastLabel} Proj PTS`, r => r.projLast, 'pts'),
        statCol('projAvg', 'Proj AVG', r => r.projLast, 'avg'),
        statCol('actPts', 'Actual PTS', r => r.actLast, 'pts'),
        statCol('actGp', 'Actual GP', r => r.actLast, 'gp'),
        statCol('actAvg', 'Actual AVG', r => r.actLast, 'avg'),
        diffCol('diffPts', 'PTS Diff', 'pts'),
        diffCol('diffAvg', 'AVG Diff', 'avg'),
      ]
    : [
        playerCol,
        statCol('nextPts', `${nextLabel} Proj PTS`, r => r.projNext, 'pts'),
        statCol('nextAvg', 'Proj AVG', r => r.projNext, 'avg'),
        statCol('nextGp', 'Proj GP', r => r.projNext, 'gp'),
        statCol('lastPts', `${lastLabel} PTS`, r => r.actLast, 'pts'),
        statCol('lastAvg', 'AVG', r => r.actLast, 'avg'),
        statCol('lastGp', 'GP', r => r.actLast, 'gp'),
      ];

  const visible = useMemo(() => {
    const base = tab === 'last' ? rows.filter(r => r.projLast && r.actLast) : rows;
    const col = sort && cols.find(c => c.key === sort.key);
    if (!sort || !col) return base;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1; // missing values always last
      if (y === null) return -1;
      return typeof x === 'string' ? sign * x.localeCompare(y as string) : sign * (x - (y as number));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, sort]);

  function switchTab(t: Tab) {
    setTab(t);
    setSort(null);
  }

  function clickHeader(c: Col) {
    setSort(prev =>
      prev?.key === c.key
        ? { key: c.key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key: c.key, dir: c.align === 'left' ? 'asc' : 'desc' },
    );
  }

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => switchTab(id)}
      className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
        tab === id
          ? 'bg-panel-border text-white'
          : 'bg-surface border border-border text-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

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
        <table className="w-full min-w-[780px]">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border">
              <th className="pl-5 pr-2 py-2 w-8" />
              {cols.map(c => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => clickHeader(c)}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-3 py-2 text-[11px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-foreground ${
                      c.align === 'left' ? 'text-left' : 'text-right'
                    } ${active ? 'text-accent' : 'text-muted'}`}
                  >
                    {c.label}
                    {active && (sort!.dir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-secondary">
            {visible.map((r, i) => (
              <tr key={r.playerId}>
                <td className="pl-5 pr-2 py-2 text-[12px] text-muted tabular-nums">{i + 1}</td>
                {cols.map(c => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 text-[13px] text-foreground ${
                      c.align === 'left' ? 'text-left whitespace-nowrap' : 'text-right tabular-nums'
                    }`}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 border-t border-border text-[11px] text-muted">
        ESPN projections, league scoring. AVG = points ÷ games played. Diff = actual minus projected.
        Click a column header to sort.
      </p>
    </div>
  );
}
