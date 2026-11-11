/**
 * Where trade requests live: one JSON file per owner in the repo,
 * data/trade-requests/<season>/<slug>.json. The site reads and writes it
 * through the GitHub contents API (GITHUB_TOKEN, same as the playoff results
 * editor), so a new request or answer shows at once — no redeploy needed.
 * Without a token (local dev) it reads the file from disk and can't save.
 *
 * Server only.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { CURRENT_SEASON } from './season';
import { requestFilePath, type TradeRequestFile } from './trade-requests';

const REPO = 'dorbarda/FantasyHQ';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

const url = (file: string) => `https://api.github.com/repos/${REPO}/contents/${file}`;
const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
});

export const canSaveRequests = () => !!process.env.GITHUB_TOKEN;

const empty = (owner: string): TradeRequestFile => ({ season: CURRENT_SEASON, owner, requests: [] });

/** The owner's file and its git sha (null = no file yet). */
export async function readRequestFile(owner: string, slug: string): Promise<{ file: TradeRequestFile; sha: string | null }> {
  const file = requestFilePath(CURRENT_SEASON, slug);
  if (!process.env.GITHUB_TOKEN) {
    try {
      return { file: JSON.parse(readFileSync(path.join(process.cwd(), file), 'utf-8')), sha: null };
    } catch {
      return { file: empty(owner), sha: null };
    }
  }
  const res = await fetch(`${url(file)}?ref=${BRANCH}`, { headers: headers(), cache: 'no-store' });
  if (res.status === 404) return { file: empty(owner), sha: null };
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  const body = await res.json();
  return { file: JSON.parse(Buffer.from(body.content, 'base64').toString()), sha: body.sha };
}

/** Save the file. Returns false when someone else changed it first (re-read and try again). */
export async function saveRequestFile(slug: string, data: TradeRequestFile, sha: string | null, message: string): Promise<boolean> {
  const res = await fetch(url(requestFilePath(CURRENT_SEASON, slug)), {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409 || res.status === 422) return false;
  if (!res.ok) throw new Error(`GitHub PUT ${res.status}`);
  return true;
}
