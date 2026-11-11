/**
 * Trade requests — check Claude's answers and save them into the owners'
 * request files (docs/TRADE-REQUESTS-SPEC.md).
 * Run with: npx tsx .claude/skills/trade-requests/answer.mts trades/input.json trades/answers.json [--write]
 *
 * Without --write it only checks. With --write it re-reads every request
 * file from disk and marks the answered requests, so it is safe to run again
 * after `git pull` brought in new requests. Exit code 1 on any error.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
process.env.SEASON ??= '2027';
const { CURRENT_SEASON } = await import(resolve(ROOT, 'lib/season.ts'));
const { validateRequestAnswers, applyAnswers } = await import(resolve(ROOT, 'lib/trade-requests.ts'));

const [inputPath, draftPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!inputPath || !draftPath) {
  console.error('Usage: answer.mts <input.json> <answers.json> [--write]');
  process.exit(1);
}

const dir = resolve(ROOT, 'data', 'trade-requests', String(CURRENT_SEASON));
const load = () => {
  let names: string[] = [];
  try { names = readdirSync(dir).filter(f => f.endsWith('.json')); } catch { /* none */ }
  return names.map(name => ({ name, file: JSON.parse(readFileSync(resolve(dir, name), 'utf-8')) }));
};

const input = JSON.parse(readFileSync(inputPath, 'utf-8'));
const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
const files = load();
const { errors, warnings, answers } = validateRequestAnswers(input, files.map(f => f.file), draft, {
  generatedAt: new Date().toISOString(),
});

for (const w of warnings) console.log(`⚠️  ${w}`);
for (const e of errors) console.log(`❌ ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s) — fix the answers and run again.`);
  process.exit(1);
}
console.log(`✅ ${answers.size} answer(s) checked.`);

if (process.argv.includes('--write')) {
  let saved = 0;
  for (const { name, file } of files) {
    const updated = applyAnswers(file, answers);
    if (JSON.stringify(updated) === JSON.stringify(file)) continue;
    writeFileSync(resolve(dir, name), JSON.stringify(updated, null, 2) + '\n');
    saved++;
    console.log(`💾 data/trade-requests/${CURRENT_SEASON}/${name}`);
  }
  console.log(`${saved} file(s) updated.`);
}
