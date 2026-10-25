'use client';

import { useCallback, useEffect, useState } from 'react';

interface Status {
  lastUpdate: string | null;
  running: boolean;
  nextAllowedAt: string | null;
  error?: string;
}

/** "Oct 25, 14:32" in Israel time. */
function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Jerusalem', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function SnapshotRefreshButton() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/refresh-snapshot', { cache: 'no-store' });
      const body = await res.json();
      if (res.ok) setStatus(body); else setMessage(body.error ?? 'Could not load the update status.');
    } catch {
      setMessage('Could not load the update status.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Tick each minute so the countdown and the enabled state stay current;
  // re-check GitHub while a run is going.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      if (status?.running) load();
    }, 60_000);
    return () => clearInterval(t);
  }, [status?.running, load]);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/refresh-snapshot', { method: 'POST' });
      const body = await res.json();
      if (body.lastUpdate !== undefined) setStatus(body);
      setMessage(res.ok
        ? 'Update started — new data shows on the site in about 5–10 minutes.'
        : res.status === 429 ? 'Updated less than 30 minutes ago.' : body.error ?? 'Update failed.');
    } catch {
      setMessage('Update failed.');
    } finally {
      setBusy(false);
    }
  }

  const waitUntil = status?.nextAllowedAt ? Date.parse(status.nextAllowedAt) : 0;
  const blocked = !status || busy || status.running || waitUntil > now;
  const minutesLeft = Math.max(1, Math.ceil((waitUntil - now) / 60_000));

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={refresh}
        disabled={blocked}
        className="px-3 py-1.5 rounded-md text-[13px] font-semibold border border-border bg-surface text-foreground shadow-sm transition-all hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status?.running ? 'Updating…' : 'Update ESPN data'}
      </button>
      <p className="text-[11px] text-muted text-right">
        {status
          ? <>Last update: {status.lastUpdate ? fmt(status.lastUpdate) : '—'}
              {!status.running && waitUntil > now && <> · next in {minutesLeft} min</>}</>
          : 'Loading…'}
      </p>
      {message && <p className="text-[11px] text-secondary text-right max-w-[260px]">{message}</p>}
    </div>
  );
}
