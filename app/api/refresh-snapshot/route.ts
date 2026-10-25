import { NextResponse } from 'next/server';

import { COOLDOWN_MS, fetchRuns, refreshStatus, startRun } from '@/lib/snapshot-refresh';

export const dynamic = 'force-dynamic';

// A run takes a few seconds to show up in GitHub's list after dispatch, so
// remember our own last start too (per server instance — best effort; the
// workflow's concurrency group stops a second run piling on anyway).
let lastStart = 0;

async function status() {
  const s = refreshStatus(await fetchRuns(), Date.now());
  if (Date.now() - lastStart < COOLDOWN_MS) {
    const next = new Date(lastStart + COOLDOWN_MS).toISOString();
    if (!s.nextAllowedAt || s.nextAllowedAt < next) s.nextAllowedAt = next;
  }
  return s;
}

function failed(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Unknown error';
  return NextResponse.json({ error: msg }, { status: 500 });
}

export async function GET() {
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 503 });
  try {
    return NextResponse.json(await status());
  } catch (e) {
    return failed(e);
  }
}

export async function POST() {
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 503 });
  try {
    const s = await status();
    if (s.nextAllowedAt) return NextResponse.json({ ...s, error: 'Too soon' }, { status: 429 });
    lastStart = Date.now();
    await startRun();
    return NextResponse.json({ ...s, running: true, nextAllowedAt: new Date(lastStart + COOLDOWN_MS).toISOString() });
  } catch (e) {
    lastStart = 0;
    return failed(e);
  }
}
