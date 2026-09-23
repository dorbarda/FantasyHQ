/**
 * Fantasy HQ — Highlightly check
 * Run with: npx tsx scripts/check-highlights.mts 2026-03-10 2026-04-15
 *
 * Asks Highlightly for the given past dates and reports what came back and
 * how much of it the recap would actually show — i.e. what survives the
 * embeddable + verified filter in lib/highlightly.ts. Answers "does our plan
 * give us usable video?" without waiting for a game night.
 *
 * Needs HIGHLIGHTLY_API_KEY. One request per date (free tier: 100/day).
 * The `Highlightly check` GitHub Action runs this with the repo secret.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers, extractItems, usableHighlights, isEmbeddable, isVerified } from '../lib/highlightly';

if (!process.env.HIGHLIGHTLY_API_KEY) {
  console.error('❌ HIGHLIGHTLY_API_KEY is not set.');
  process.exit(1);
}

const host = process.env.HIGHLIGHTLY_API_HOST || 'basketball.highlightly.net';
const dates = process.argv.slice(2).flatMap(a => a.split(',')).map(d => d.trim()).filter(Boolean);
if (dates.length === 0) {
  console.error('Usage: npx tsx scripts/check-highlights.mts YYYY-MM-DD [YYYY-MM-DD ...]');
  process.exit(1);
}

function tally(values: string[]): string {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(', ') || '—';
}

let totalItems = 0;
let totalUsable = 0;
let refused = 0;

for (const date of dates) {
  console.log(`\n📅 ${date}`);
  const url = `https://${host}/highlights?date=${encodeURIComponent(date)}&leagueName=NBA&limit=40`;
  const res = await fetch(url, { headers: headers() });
  const body = await res.text();
  if (!res.ok) {
    console.log(`   ❌ HTTP ${res.status} — ${body.slice(0, 300)}`);
    refused++;
    continue;
  }

  let raw: any;
  try {
    raw = JSON.parse(body);
  } catch {
    console.log(`   ❌ not JSON — ${body.slice(0, 200)}`);
    continue;
  }

  const items = extractItems(raw);
  const usable = usableHighlights(raw, date, 100);
  totalItems += items.length;
  totalUsable += usable.length;

  console.log(`   envelope: ${Array.isArray(raw) ? 'bare array' : Object.keys(raw).join(', ')}`);
  if (!Array.isArray(raw) && raw.plan) console.log(`   plan info: ${JSON.stringify(raw.plan)}`);
  console.log(`   clips returned: ${items.length}`);
  console.log(`   embeddable: ${items.filter(isEmbeddable).length} · verified: ${items.filter(isVerified).length} · both (shown on site): ${usable.length}`);
  console.log(`   by source: ${tally(items.map(i => String(i?.source ?? 'unknown')))}`);
  console.log(`   by type:   ${tally(items.map(i => String(i?.type ?? 'unknown')))}`);
  if (items[0]) {
    console.log(`   item keys: ${Object.keys(items[0]).join(', ')}`);
    for (const it of items.slice(0, 3)) {
      console.log(`   • ${String(it.title ?? '').slice(0, 70)} | source=${it.source} type=${it.type} embeddable=${it.embeddable} verified=${JSON.stringify(it.verified ?? it.verificationStatus ?? it.state)}`);
    }
  }
}

console.log(`\n─── result ───`);
console.log(`${totalItems} clips returned, ${totalUsable} would show on the recap.`);
if (refused === dates.length) {
  console.log('Every request was refused — the key, host or header is wrong, not the plan.');
  process.exit(1);
} else if (totalItems > 0 && totalUsable === 0) {
  console.log('Clips come back, but none pass the embeddable + verified filter — the plan (or the filter) is the blocker.');
} else if (totalItems === 0) {
  console.log('No clips at all for these dates — try dates with NBA games, or the plan has no highlights.');
}
