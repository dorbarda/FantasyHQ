/**
 * "Update now" button on the matchups page: anyone can start the ESPN
 * snapshot Action (espn-snapshot.yml) through the site, at most once every
 * 30 minutes. The site's GITHUB_TOKEN (needs Actions: read & write) does the
 * GitHub call, so visitors need no GitHub access.
 *
 * Scheduled runs off today's Israel times skip the snapshot job — those don't
 * count as an update or as an attempt.
 */
const REPO = 'dorbarda/FantasyHQ';
const WORKFLOW = 'espn-snapshot.yml';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const API = `https://api.github.com/repos/${REPO}/actions`;

export const COOLDOWN_MS = 30 * 60 * 1000;

export interface RunInfo {
  status: string; // queued | in_progress | completed | …
  startedAt: string;
  /** The snapshot job: success | failure | skipped | null while running. */
  snapshot: { conclusion: string | null; completedAt: string | null } | null;
}

export interface RefreshStatus {
  /** When the data was last refreshed (snapshot job finished OK). */
  lastUpdate: string | null;
  running: boolean;
  /** Earliest time the next update may start; null = allowed now. */
  nextAllowedAt: string | null;
}

/** Pure: runs newest first → what the button shows. */
export function refreshStatus(runs: RunInfo[], now: number): RefreshStatus {
  let lastUpdate: string | null = null;
  let lastAttempt: number | null = null;
  let running = false;
  for (const r of runs) {
    if (r.snapshot?.conclusion === 'skipped') continue;
    if (r.status !== 'completed') running = true;
    lastAttempt = Math.max(lastAttempt ?? 0, Date.parse(r.startedAt));
    if (!lastUpdate && r.snapshot?.conclusion === 'success') lastUpdate = r.snapshot.completedAt;
  }
  const lastTouch = Math.max(lastAttempt ?? 0, lastUpdate ? Date.parse(lastUpdate) : 0);
  const next = lastTouch + COOLDOWN_MS;
  return { lastUpdate, running, nextAllowedAt: running || next > now ? new Date(next).toISOString() : null };
}

async function gh(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });
}

/** The latest runs of the snapshot workflow with their snapshot job. */
export async function fetchRuns(): Promise<RunInfo[]> {
  const res = await gh(`/workflows/${WORKFLOW}/runs?branch=${BRANCH}&per_page=8`);
  if (!res.ok) throw new Error(`GitHub runs ${res.status}`);
  const { workflow_runs = [] } = await res.json();
  return Promise.all(workflow_runs.map(async (r: any): Promise<RunInfo> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const jobsRes = await gh(`/runs/${r.id}/jobs`);
    const jobs: any[] = jobsRes.ok ? (await jobsRes.json()).jobs ?? [] : []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const job = jobs.find(j => j.name === 'snapshot');
    return {
      status: r.status,
      startedAt: r.run_started_at ?? r.created_at,
      snapshot: job ? { conclusion: job.conclusion, completedAt: job.completed_at } : null,
    };
  }));
}

export async function startRun(): Promise<void> {
  const res = await gh(`/workflows/${WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: BRANCH }) });
  if (res.status !== 204) {
    throw new Error(res.status === 403 || res.status === 404
      ? 'GITHUB_TOKEN cannot start Actions (needs Actions: read & write)'
      : `GitHub dispatch ${res.status}`);
  }
}
