/**
 * Background music for the recap video, synthesized here so there is no
 * licence to worry about. Sports-broadcast style ("NBA on TV"): brass stabs
 * and fanfare, timpani, crash cymbals, punchy drums, funky octave bass.
 * 120 BPM, D major with the classic sports cadence D – B♭ – C – A.
 *
 *   intro  : timpani roll + brass swell, fanfare into the drop
 *   cards  : full band, brass stabs, a brass lick every 4th bar
 *   outro  : big hit, then the B♭ – C – D "ta-ta-DAAA" ending, fade
 *
 * writeBeat(path, { duration, dropAt, outroAt }) writes a mono 16-bit WAV.
 */
import { writeFileSync } from 'node:fs';

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
// One chord per bar: brass voicing (MIDI) and bass root (MIDI).
const CHORDS = [
  { brass: [62, 66, 69, 74], bass: 38 }, // D
  { brass: [58, 62, 65, 70], bass: 34 }, // B♭
  { brass: [60, 64, 67, 72], bass: 36 }, // C
  { brass: [57, 61, 64, 69], bass: 33 }, // A
];
const D_CHORD = [50, 57, 62, 66, 69, 74];

// Deterministic noise, so every render sounds the same.
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

export function buildBeat({ duration, dropAt, outroAt }) {
  const n = Math.ceil((duration + 0.5) * SR);
  const out = new Float32Array(n);
  const add = (t0, len, fn) => {
    const s0 = Math.max(0, Math.floor(t0 * SR));
    for (let i = 0; i < len * SR && s0 + i < n; i++) out[s0 + i] += fn(i / SR);
  };

  // Brass: stacked saw-like harmonics that get darker as the note decays
  // (the "blat" of a brass section), two slightly detuned voices per note.
  const brass = (t0, notes, len, v = 0.2, swell = false) => {
    const fs = notes.map(hz);
    add(t0, len + 0.15, t => {
      const att = swell ? Math.min(1, t / (len * 0.8)) : Math.min(1, t / 0.012);
      const rel = t > len ? Math.exp(-(t - len) * 30) : 1;
      const body = swell ? 1 : 0.55 + 0.45 * Math.exp(-t * 6);
      const bright = swell ? 0.25 + 0.5 * (1 - att) : 0.22 + 0.9 * Math.min(1, t * 4);
      const vib = 1 + (t > 0.25 ? 0.004 * Math.sin(2 * Math.PI * 5.5 * t) : 0);
      let s = 0;
      for (const f of fs) {
        for (const det of [0.997, 1.003]) {
          for (let k = 1; k <= 7; k++) s += Math.sin(2 * Math.PI * k * f * det * vib * t) * Math.exp(-(k - 1) * bright) / k;
        }
      }
      return 1.7 * v * att * rel * body * s / fs.length;
    });
  };
  const timpani = (t0, midi = 38, v = 0.45) =>
    add(t0, 1.4, t => v * (Math.sin(2 * Math.PI * hz(midi) * (1 + 0.04 * Math.exp(-t * 20)) * t) + 0.25 * noise() * Math.exp(-t * 40)) * Math.exp(-t * 2.8));
  let prevC = 0;
  const crash = (t0, v = 0.12) => add(t0, 1.6, t => { const x = noise(); const h = x - prevC; prevC = x; return v * h * Math.exp(-t * 3.5); });
  const kick = t0 => {
    let ph = 0;
    add(t0, 0.35, t => { ph += 2 * Math.PI * (50 + 120 * Math.exp(-t * 35)) / SR; return 0.6 * Math.sin(ph) * Math.exp(-t * 9); });
  };
  const snare = (t0, v = 0.5) => add(t0, 0.25, t =>
    v * (0.45 * noise() * Math.exp(-t * 22) + 0.5 * (Math.sin(2 * Math.PI * 185 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t)) * Math.exp(-t * 28)));
  let prevH = 0;
  const hat = (t0, v = 0.05) => add(t0, 0.05, t => { const x = noise(); const h = x - prevH; prevH = x; return v * h * Math.exp(-t * 80); });
  const tom = (t0, f) => add(t0, 0.3, t => 0.45 * Math.sin(2 * Math.PI * f * (1 + 0.3 * Math.exp(-t * 25)) * t) * Math.exp(-t * 9));
  const bass = (t0, midi, len) => {
    const f = hz(midi);
    add(t0, len, t => 0.16 * Math.tanh(2 * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t))) * Math.min(1, t * 300) * Math.exp(-t * 5));
  };
  const hit = t0 => { brass(t0, D_CHORD, 0.9, 0.32); timpani(t0, 38, 0.8); crash(t0, 0.15); kick(t0); };

  // ── Intro: timpani roll and a low brass swell, then the fanfare. ──
  const fanfareAt = Math.max(0.6, dropAt - 1.5);
  brass(0.2, [50, 57, 62], Math.max(0.3, fanfareAt - 0.35), 0.22, true);
  for (let t = 0.2; t < fanfareAt - 0.05; t += 0.07) timpani(t, 38, 0.06 + 0.22 * (t / fanfareAt));
  [[0, 0.2, [57, 62]], [0.25, 0.2, [62, 66]], [0.5, 0.4, [66, 69]], [1.0, 0.4, [69, 74]]]
    .forEach(([dt, len, notes]) => { if (fanfareAt + dt < dropAt) brass(fanfareAt + dt, notes, len, 0.28); });
  snare(dropAt - 0.25, 0.3); snare(dropAt - 0.125, 0.4);

  // ── Cards: the full band. ──
  hit(dropAt);
  for (let b = 0; dropAt + b * BAR < outroAt; b++) {
    const tb = dropAt + b * BAR;
    const chord = CHORDS[b % 4];
    const lastBar = b % 4 === 3;
    if (b % 4 === 0 && b > 0) crash(tb, 0.1);
    for (let e = 0; e < 8; e++) {
      const t = tb + e * BEAT / 2;
      if (t >= outroAt) break;
      if (e === 0 || e === 3 || e === 4) kick(t);
      if (e === 2 || e === 6) snare(t);
      hat(t, e % 2 ? 0.035 : 0.055);
      bass(t, chord.bass + (e % 2 ? 12 : 0), BEAT / 2);
    }
    // Brass stabs on 1, the "and" of 2, and 4 — or a rising lick into the next phrase.
    if (lastBar) {
      brass(tb, chord.brass, 0.2);
      [69, 71, 73, 76].forEach((m, k) => { const t = tb + (4 + k) * BEAT / 2; if (t < outroAt) brass(t, [m - 12, m], 0.18, 0.22); });
      [0, 1, 2].forEach(k => { const t = tb + (5 + k) * BEAT / 2; if (t < outroAt) tom(t, [170, 135, 100][k]); });
    } else {
      [0, 3, 6].forEach(e => { const t = tb + e * BEAT / 2; if (t < outroAt) brass(t, chord.brass, 0.17); });
    }
  }

  // ── Outro: big hit, then B♭ – C – D. ──
  hit(outroAt);
  const end = Math.min(duration - 1.2, outroAt + 1.2);
  brass(end, [58, 62, 65, 70], 0.16, 0.26); timpani(end, 34, 0.4);
  brass(end + 0.25, [60, 64, 67, 72], 0.16, 0.26); timpani(end + 0.25, 36, 0.4);
  brass(end + 0.5, D_CHORD, Math.max(0.3, duration - end - 0.6), 0.32); timpani(end + 0.5, 38, 0.8); crash(end + 0.5, 0.15); kick(end + 0.5);

  // Fade in/out, normalize, soft-clip.
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] *= Math.min(1, t / 0.3) * Math.max(0, Math.min(1, (duration - t) / 0.6));
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * gain * 1.8) * 0.92;
  return out;
}

export function writeBeat(path, opts) {
  const pcm = buildBeat(opts);
  const buf = Buffer.alloc(44 + pcm.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + pcm.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  writeFileSync(path, buf);
}
