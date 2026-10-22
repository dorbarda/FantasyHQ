/**
 * Render the Sunday recap video: template.html + recap JSON → vertical MP4.
 * Run with: node .claude/skills/sunday-recap/video/render.mjs <recap.json> <out.mp4> [--music file.mp3 | --no-music]
 *
 * Steps the page's render(t) frame by frame in headless Chromium and pipes
 * the screenshots into ffmpeg (H.264 + AAC, yuv420p — plays in WhatsApp).
 * Music: the synthesized beat from music.mjs by default, or your own track
 * (cut to the video's length, faded in and out).
 */
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeBeat } from './music.mjs';
import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const [recapPath, outPath] = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--music');
const noMusic = argv.includes('--no-music');
const ownMusic = argv.includes('--music') ? resolve(argv[argv.indexOf('--music') + 1]) : null;
if (!recapPath || !outPath) {
  console.error('Usage: node render.mjs <recap.json> <out.mp4> [--music file.mp3 | --no-music]');
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
const sections = await page.evaluate(() => window.SECTIONS);
const frames = Math.ceil(duration * FPS);

let audio = [];
if (ownMusic) {
  const fadeOut = Math.max(0, duration - 2.5).toFixed(2);
  audio = ['-i', ownMusic, '-map', '0:v', '-map', '1:a', '-af', `afade=t=in:d=0.5,afade=t=out:st=${fadeOut}:d=2.5`];
} else if (!noMusic) {
  const wav = join(mkdtempSync(join(tmpdir(), 'recap-')), 'beat.wav');
  writeBeat(wav, { duration, ...sections });
  audio = ['-i', wav, '-map', '0:v', '-map', '1:a'];
}

const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  ...audio,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  ...(audio.length ? ['-c:a', 'aac', '-b:a', '160k', '-t', duration.toFixed(3)] : []),
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
