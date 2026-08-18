'use client';

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlayInEntry = {
  gameId: string;
  conference: string;
  label: string;
  teams: string[];
  winner: string | null;
};

type SeriesEntry = {
  seriesId: string;
  round: number;
  conference: string;
  label: string;
  teams: string[];
  winner: string | null;
  score: string | null;
};

type Results = { playIn: PlayInEntry[]; series: SeriesEntry[] };
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCORES = ['4-0', '4-1', '4-2', '4-3'];

const ROUND_GROUPS = [
  { label: 'Round 1',           ids: ['r1-e1','r1-e2','r1-e3','r1-e4','r1-w1','r1-w2','r1-w3','r1-w4'] },
  { label: 'Semifinals',        ids: ['r2-e1','r2-e2','r2-w1','r2-w2'] },
  { label: 'Conference Finals', ids: ['r3-e','r3-w'] },
  { label: 'NBA Finals',        ids: ['r4'] },
];

const PLAY_IN_GROUPS = [
  { label: 'East Play-In', ids: ['east-7v8','east-9v10','east-loser'] },
  { label: 'West Play-In', ids: ['west-7v8','west-9v10','west-loser'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function SaveButton({ status, onClick }: { status: SaveStatus; onClick: () => void }) {
  const labels: Record<SaveStatus, string> = {
    idle: 'Save', saving: 'Saving…', saved: '✓ Saved', error: 'Error',
  };
  const classes: Record<SaveStatus, string> = {
    idle:   'bg-[#1E293B] text-white hover:bg-[#334155]',
    saving: 'bg-[#94A3B8] text-white cursor-wait',
    saved:  'bg-[#16A34A] text-white',
    error:  'bg-[#DC2626] text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={status === 'saving'}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${classes[status]}`}
    >
      {labels[status]}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-2">
        {title}
      </p>
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [dataLoading, setDataLoading] = useState(false);
  const [results, setResults]         = useState<Results | null>(null);
  const [statuses, setStatuses]       = useState<Record<string, SaveStatus>>({});
  const [adminKey, setAdminKey]       = useState<string | null>(null);
  const [keyInput, setKeyInput]       = useState('');
  const [authError, setAuthError]     = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('fhq-admin-key');
    if (stored) setAdminKey(stored);
  }, []);

  useEffect(() => {
    if (adminKey) fetchData(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  function authHeaders(key: string): Record<string, string> {
    return { 'x-admin-key': key };
  }

  async function fetchData(key: string) {
    setDataLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/update-playoff-result', {
        cache: 'no-store',
        headers: authHeaders(key),
      });
      if (res.status === 401) {
        sessionStorage.removeItem('fhq-admin-key');
        setAdminKey(null);
        setAuthError('Wrong passcode.');
        return;
      }
      if (!res.ok) throw new Error();
      setResults(await res.json());
      setStatuses({});
    } catch {
      setAuthError('Failed to load results — check the server logs.');
    } finally {
      setDataLoading(false);
    }
  }

  function submitKey(e: React.FormEvent) {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    sessionStorage.setItem('fhq-admin-key', key);
    setKeyInput('');
    setAdminKey(key);
  }

  function patchPlayIn(gameId: string, winner: string) {
    setResults(prev => {
      if (!prev) return prev;
      const next = deepClone(prev);
      const g = next.playIn.find(x => x.gameId === gameId);
      if (g) g.winner = winner || null;
      return next;
    });
    setStatuses(p => ({ ...p, [gameId]: 'idle' }));
  }

  function patchSeries(seriesId: string, patch: Partial<Pick<SeriesEntry, 'teams' | 'winner' | 'score'>>) {
    setResults(prev => {
      if (!prev) return prev;
      const next = deepClone(prev);
      const s = next.series.find(x => x.seriesId === seriesId);
      if (s) Object.assign(s, patch);
      return next;
    });
    setStatuses(p => ({ ...p, [seriesId]: 'idle' }));
  }

  function setStatus(id: string, status: SaveStatus) {
    setStatuses(p => ({ ...p, [id]: status }));
  }

  async function savePlayIn(gameId: string) {
    const g = results?.playIn.find(x => x.gameId === gameId);
    if (!g || !adminKey) return;
    setStatus(gameId, 'saving');
    try {
      const res = await fetch('/api/update-playoff-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(adminKey) },
        body: JSON.stringify({ type: 'playIn', id: gameId, winner: g.winner }),
      });
      const next: SaveStatus = res.ok ? 'saved' : 'error';
      setStatus(gameId, next);
      if (next === 'saved') setTimeout(() => setStatus(gameId, 'idle'), 2500);
    } catch {
      setStatus(gameId, 'error');
    }
  }

  async function saveSeries(seriesId: string) {
    const s = results?.series.find(x => x.seriesId === seriesId);
    if (!s || !adminKey) return;
    setStatus(seriesId, 'saving');
    try {
      const res = await fetch('/api/update-playoff-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(adminKey) },
        body: JSON.stringify({ type: 'series', id: seriesId, teams: s.teams, winner: s.winner, score: s.score }),
      });
      const next: SaveStatus = res.ok ? 'saved' : 'error';
      setStatus(seriesId, next);
      if (next === 'saved') setTimeout(() => setStatus(seriesId, 'idle'), 2500);
    } catch {
      setStatus(seriesId, 'error');
    }
  }

  if (!adminKey) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <form onSubmit={submitKey} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 w-full max-w-xs">
          <h1 className="text-sm font-bold text-[#0F172A] mb-1">Playoffs Admin</h1>
          <p className="text-xs text-[#94A3B8] mb-4">Enter the admin passcode to continue.</p>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] bg-white outline-none focus:border-[#94A3B8] transition-colors w-full mb-3"
          />
          {authError && <p className="text-xs text-[#DC2626] mb-3">{authError}</p>}
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-[#1E293B] text-white hover:bg-[#334155] transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  if (dataLoading || !results) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 min-h-[300px] text-sm text-[#94A3B8]">
        {authError ? <span className="text-[#DC2626]">{authError}</span> : 'Loading…'}
      </div>
    );
  }

  const selectCls = 'border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-sm text-[#0F172A] bg-white outline-none focus:border-[#94A3B8] transition-colors';
  const inputCls  = 'border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-sm text-[#0F172A] bg-white outline-none focus:border-[#94A3B8] transition-colors w-full';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Playoffs Admin</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Saves commit to GitHub and trigger a Vercel redeploy (~1 min)
          </p>
        </div>
        <button
          onClick={() => fetchData(adminKey)}
          disabled={dataLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E2E8F0] rounded-lg text-[#475569] hover:bg-[#F1F5F9] disabled:opacity-50 transition-colors"
        >
          ↺ Reload
        </button>
      </div>

      {/* Play-In */}
      {PLAY_IN_GROUPS.map(group => {
        const entries = group.ids
          .map(id => results.playIn.find(g => g.gameId === id))
          .filter(Boolean) as PlayInEntry[];
        return (
          <SectionCard key={group.label} title={group.label}>
            {entries.map((g, i) => (
              <div
                key={g.gameId}
                className={`px-4 py-3 flex flex-wrap items-center gap-3 ${i < entries.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0F172A]">{g.label}</p>
                  <p className="text-xs text-[#94A3B8] truncate">{g.teams[0]} vs {g.teams[1]}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#94A3B8] shrink-0">Winner</span>
                  <select
                    value={g.winner ?? ''}
                    onChange={e => patchPlayIn(g.gameId, e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— No result</option>
                    {g.teams.filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <SaveButton status={statuses[g.gameId] ?? 'idle'} onClick={() => savePlayIn(g.gameId)} />
              </div>
            ))}
          </SectionCard>
        );
      })}

      {/* Series rounds */}
      {ROUND_GROUPS.map(group => {
        const entries = group.ids
          .map(id => results.series.find(s => s.seriesId === id))
          .filter(Boolean) as SeriesEntry[];
        return (
          <SectionCard key={group.label} title={group.label}>
            {entries.map((s, i) => {
              const teamsKnown = s.teams[0] !== '' || s.teams[1] !== '';
              return (
                <div key={s.seriesId} className={`px-4 py-3 ${i < entries.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                  <p className="text-xs font-semibold text-[#0F172A] mb-2">{s.label}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    {/* Team inputs */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="flex-1">
                        <p className="text-[10px] text-[#94A3B8] mb-0.5">Team 1</p>
                        <input
                          value={s.teams[0]}
                          onChange={e => patchSeries(s.seriesId, {
                            teams: [e.target.value, s.teams[1]],
                            winner: s.winner === s.teams[0] ? null : s.winner,
                          })}
                          placeholder="TBD"
                          className={inputCls}
                        />
                      </div>
                      <span className="text-xs text-[#CBD5E1] mt-4">vs</span>
                      <div className="flex-1">
                        <p className="text-[10px] text-[#94A3B8] mb-0.5">Team 2</p>
                        <input
                          value={s.teams[1]}
                          onChange={e => patchSeries(s.seriesId, {
                            teams: [s.teams[0], e.target.value],
                            winner: s.winner === s.teams[1] ? null : s.winner,
                          })}
                          placeholder="TBD"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Winner + Score + Save */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div>
                        <p className="text-[10px] text-[#94A3B8] mb-0.5">Winner</p>
                        {teamsKnown ? (
                          <select
                            value={s.winner ?? ''}
                            onChange={e => patchSeries(s.seriesId, { winner: e.target.value || null })}
                            className={selectCls}
                          >
                            <option value="">— No result</option>
                            {s.teams[0] && <option value={s.teams[0]}>{s.teams[0]}</option>}
                            {s.teams[1] && <option value={s.teams[1]}>{s.teams[1]}</option>}
                          </select>
                        ) : (
                          <input
                            value={s.winner ?? ''}
                            onChange={e => patchSeries(s.seriesId, { winner: e.target.value || null })}
                            placeholder="—"
                            className={`${inputCls} w-36`}
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[#94A3B8] mb-0.5">Score</p>
                        <select
                          value={s.score ?? ''}
                          onChange={e => patchSeries(s.seriesId, { score: e.target.value || null })}
                          className={selectCls}
                        >
                          <option value="">—</option>
                          {SCORES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                        </select>
                      </div>
                      <div className="mt-4">
                        <SaveButton status={statuses[s.seriesId] ?? 'idle'} onClick={() => saveSeries(s.seriesId)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </SectionCard>
        );
      })}
    </div>
  );
}
