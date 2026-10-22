/**
 * Background beat for the recap video — synthesized here, so there is no
 * licence to worry about. Hip-hop style, 100 BPM, A minor (Am–F–C–G).
 *
 *   intro  : pad + arpeggio only, no drums
 *   cards  : full beat (kick, clap, hats, 808 bass), impact when it drops
 *   outro  : drums out, final hit, fade to silence
 *
 * writeBeat(path, { duration, dropAt, outroAt }) writes a mono 16-bit WAV.
 */
import { writeFileSync } from 'node:fs';

const SR = 44100;
const BPM = 100;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
// Root (Hz, 808 octave) and triad (MIDI) per bar: Am, F, C, G.
const CHORDS = [
  { root: 55.0, notes: [57, 60, 64] },
  { root: 43.65, notes: [53, 57, 60] },
  { root: 65.41, notes: [48, 52, 55] },
  { root: 49.0, notes: [55, 59, 62] },
];
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

// Deterministic noise, so every render sounds the same.
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

export function buildBeat({ duration, dropAt, outroAt }) {
  const n = Math.ceil((duration + 0.5) * SR);
  const out = new Float32Array(n);
  const duck = new Float32Array(n).fill(1); // kick sidechain on pad + arp
  const add = (t0, len, fn) => {
    const s0 = Math.floor(t0 * SR);
    for (let i = 0; i < len * SR && s0 + i < n; i++) out[s0 + i] += fn(i / SR);
  };

  const kick = t0 => {
    let ph = 0;
    add(t0, 0.45, t => {
      ph += 2 * Math.PI * (45 + 110 * Math.exp(-t * 30)) / SR;
      return 0.9 * Math.sin(ph) * Math.exp(-t * 7);
    });
    const s0 = Math.floor(t0 * SR);
    for (let i = 0; i < 0.25 * SR && s0 + i < n; i++) duck[s0 + i] = Math.min(duck[s0 + i], 0.35 + 0.65 * (i / (0.25 * SR)));
  };
  const clap = t0 => add(t0, 0.25, t => 0.45 * (noise() * Math.exp(-t * 22) + 0.3 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30)));
  let prev = 0;
  const hat = (t0, v = 0.12) => add(t0, 0.05, t => { const x = noise(); const h = x - prev; prev = x; return v * h * Math.exp(-t * 90); });
  const bass = (t0, f, len) => add(t0, len, t => 0.55 * Math.tanh(2.2 * Math.sin(2 * Math.PI * f * t)) * Math.min(1, t * 200) * Math.exp(-t * 2.2));
  const pluck = (t0, f, v) => add(t0, 0.3, t => v * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 12));
  const impact = t0 => add(t0, 1.6, t => 0.5 * (Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-t * 8)) * t) + 0.4 * noise() * Math.exp(-t * 6)) * Math.exp(-t * 2.5));

  // Pad — soft detuned triad under everything, follows the chords.
  const pad = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const chord = CHORDS[Math.floor(t / BAR) % 4];
    let v = 0;
    for (const m of chord.notes) {
      const f = hz(m);
      v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t) + 0.2 * Math.sin(4 * Math.PI * f * t);
    }
    pad[i] = 0.05 * v;
  }

  const bars = Math.ceil(duration / BAR) + 1;
  for (let b = 0; b < bars; b++) {
    const chord = CHORDS[b % 4];
    const tb = b * BAR;
    // Arpeggio: 8th notes up and down the triad, an octave up.
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    arp.forEach((k, j) => {
      const t = tb + j * BEAT / 2;
      if (t < outroAt) pluck(t, hz(chord.notes[k] + 12), 0.1);
    });
    if (tb + BAR <= dropAt - 0.01 || tb >= outroAt) continue;
    for (let beat = 0; beat < 4; beat++) {
      const t = tb + beat * BEAT;
      if (t < dropAt - 0.01 || t >= outroAt) continue;
      if (beat === 0 || beat === 2) kick(t);
      if (beat === 1 || beat === 3) clap(t);
      // Hats on 8ths; a 16th roll on the last beat of every 4th bar.
      const roll = b % 4 === 3 && beat === 3;
      for (let k = 0; k < (roll ? 4 : 2); k++) hat(t + k * BEAT / (roll ? 4 : 2), k % 2 ? 0.08 : 0.12);
    }
    const tKick2 = tb + 2.5 * BEAT; // syncopated kick + bass on the "and" of 3
    if (tKick2 >= dropAt && tKick2 < outroAt) kick(tKick2);
    if (tb >= dropAt - 0.01 && tb < outroAt) bass(tb, chord.root, BEAT * 2.4);
    if (tKick2 >= dropAt && tKick2 < outroAt) bass(tKick2, chord.root, BEAT * 1.4);
  }
  impact(dropAt);
  impact(outroAt);

  // Mix: pad + arp duck under the kick; fade in, and out over the outro.
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.8) * Math.max(0, Math.min(1, (duration - t) / Math.max(0.5, duration - outroAt)));
    out[i] = (out[i] + pad[i] * duck[i]) * fade;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * gain * 1.1) * 0.9;
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
