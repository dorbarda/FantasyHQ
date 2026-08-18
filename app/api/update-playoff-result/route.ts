import { NextResponse } from 'next/server';

const GH_TOKEN  = process.env.GITHUB_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY;
const REPO      = 'dorbarda/FantasyHQ';
const FILE      = 'data/playoff-results.json';
const BRANCH    = process.env.GITHUB_BRANCH || 'main';
const GH_URL    = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

// Both GET and POST require the shared admin passcode; without ADMIN_KEY set
// the endpoint is disabled entirely so it can never run unprotected.
function unauthorized(req: Request): NextResponse | null {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_KEY not configured' }, { status: 503 });
  }
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

async function ghGet() {
  const res = await fetch(`${GH_URL}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;
  if (!GH_TOKEN) {
    return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 503 });
  }
  try {
    const file = await ghGet();
    const content = JSON.parse(Buffer.from(file.content, 'base64').toString());
    return NextResponse.json(content);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;
  if (!GH_TOKEN) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { type, id, winner, score, teams } = body;

  try {
    const file = await ghGet();
    const sha  = file.sha;
    const data = JSON.parse(Buffer.from(file.content, 'base64').toString());

    if (type === 'playIn') {
      const entry = data.playIn.find((g: { gameId: string }) => g.gameId === id);
      if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      entry.winner = winner ?? null;
    } else if (type === 'series') {
      const entry = data.series.find((s: { seriesId: string }) => s.seriesId === id);
      if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (Array.isArray(teams) && teams.length === 2) entry.teams = teams;
      entry.winner = winner ?? null;
      entry.score  = score  ?? null;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const encoded = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64');
    const message = winner
      ? `Update ${id}: ${winner}${score ? ` ${score}` : ''}`
      : `Clear result for ${id}`;

    const putRes = await fetch(GH_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, content: encoded, sha, branch: BRANCH }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return NextResponse.json({ error: 'GitHub commit failed', details: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
