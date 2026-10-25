/**
 * Weekly trade suggestions — check Claude's draft against the input and write
 * the file the site reads. Spec: docs/TRADE-SUGGESTIONS-SPEC.md.
 * Run with: npx tsx .claude/skills/trade-suggestions/validate.mts trades/input.json trades/draft.json [--write] [--force]
 *
 * Without --write it only checks. With --write it saves
 * data/trades/<season>/week-NN.json — never over an existing week unless --force.
 * Exit code 1 on any error; warnings are printed but don't fail.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { validateTradeDraft } = await import(resolve(ROOT, 'lib/trade-output.ts'));

const [inputPath, draftPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!inputPath || !draftPath) {
  console.error('Usage: validate.mts <input.json> <draft.json> [--write] [--force]');
  process.exit(1);
}
const write = process.argv.includes('--write');
const force = process.argv.includes('--force');

const input = JSON.parse(readFileSync(inputPath, 'utf-8'));
const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
const { errors, warnings, file } = validateTradeDraft(input, draft, { generatedAt: new Date().toISOString() });

for (const w of warnings) console.log(`⚠️  ${w}`);
for (const e of errors) console.log(`❌ ${e}`);
if (!file) {
  console.log(`\n${errors.length} error(s) — fix the draft and run again.`);
  process.exit(1);
}

const trades = file.teams.reduce((n: number, t: { trades: unknown[] }) => n + t.trades.length, 0);
console.log(`✅ ${file.teams.length} teams, ${trades} trade ideas, week ${file.week}.`);

if (write) {
  const out = resolve(ROOT, 'data', 'trades', String(file.season), `week-${String(file.week).padStart(2, '0')}.json`);
  if (existsSync(out) && !force) {
    // A file written before the week began is an early preview (Dor asked for
    // one on 2026-10-25); the Monday run replaces it with that day's data.
    const existing = JSON.parse(readFileSync(out, 'utf-8'));
    const start = input.league.periods.find((p: { matchupPeriod: number }) => p.matchupPeriod === file.week)?.start;
    const isPreview = !!start && Date.parse(existing.generatedAt) < Date.parse(start);
    if (!isPreview) {
      console.error(`❌ ${out} already exists — each week is written once. Use --force only if Dor asked.`);
      process.exit(1);
    }
    console.log(`↻ Replacing the preview written ${existing.generatedAt}, before week ${file.week} began.`);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
  console.log(`💾 ${out}`);
}
