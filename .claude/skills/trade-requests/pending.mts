/**
 * Trade requests — list every pending request (docs/TRADE-REQUESTS-SPEC.md).
 * Run with: npx tsx .claude/skills/trade-requests/pending.mts
 * Prints one block per request; the last line is "N pending". Exit code 0.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
process.env.SEASON ??= '2027';
const { CURRENT_SEASON } = await import(resolve(ROOT, 'lib/season.ts'));
const { pendingRequests } = await import(resolve(ROOT, 'lib/trade-requests.ts'));

const dir = resolve(ROOT, 'data', 'trade-requests', String(CURRENT_SEASON));
let names: string[] = [];
try { names = readdirSync(dir).filter(f => f.endsWith('.json')); } catch { /* no requests yet */ }
const files = names.map(f => JSON.parse(readFileSync(resolve(dir, f), 'utf-8')));

const pending = pendingRequests(files);
for (const { owner, request: r } of pending) {
  const ask = r.kind === 'sell'
    ? `SELL — ${owner} wants to trade ${r.playerName} (${r.playerId})`
    : `BUY — ${owner} wants ${r.playerName} (${r.playerId}), on ${r.playerOwner}'s team when asked`;
  console.log(`- id ${r.id}\n  ${ask}\n  note: ${r.note ? `"${r.note}"` : '(none)'} · sent ${r.createdAt}`);
}
console.log(`${pending.length} pending`);
