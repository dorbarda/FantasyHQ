/**
 * Render the Sunday recap video: template.html + recap JSON → vertical MP4.
 * Run with: node .claude/skills/sunday-recap/video/render.mjs <recap.json> <out.mp4>
 *
 * Steps the page's render(t) frame by frame in headless Chromium and pipes
 * the screenshots into ffmpeg (H.264, yuv420p — plays in WhatsApp).
 */
import { readFileSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [recapPath, outPath] = process.argv.slice(2);
if (!recapPath || !outPath) {
  console.error('Usage: node render.mjs <recap.json> <out.mp4>');
  process.exit(1);
}
const FPS = 30;
const here = dirname(fileURLToPath(import.meta.url));
const recap = readFileSync(resolve(recapPath), 'utf-8');

// Playwright is installed globally in the cloud container, not in the repo.
const { chromium } = await import(pathToFileURL(
  resolve(execSync('npm root -g').toString().trim(), 'playwright', 'index.mjs')).href);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript(`window.RECAP = ${recap};`);
await page.goto(pathToFileURL(resolve(here, 'template.html')).href);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);
const frames = Math.ceil(duration * FPS);

const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', resolve(outPath),
], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let f = 0; f < frames; f++) {
  await page.evaluate(t => window.render(t), f / FPS);
  const shot = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ffmpeg.stdin.write(shot)) await new Promise(r => ffmpeg.stdin.once('drain', r));
}
ffmpeg.stdin.end();
await new Promise((ok, fail) => ffmpeg.on('close', c => (c === 0 ? ok() : fail(new Error(`ffmpeg exit ${c}`)))));
await browser.close();
console.log(`✅ ${frames} frames, ${duration.toFixed(1)}s → ${outPath}`);
