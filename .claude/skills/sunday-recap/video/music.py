"""
Original soundtrack for the Sunday video — synthesized from scratch with numpy,
so there are no rights issues. 120 BPM (one beat = 0.5 s, same grid as the
template's scenes), A minor, Am–F–C–G.

  python3 music.py <duration_seconds> <cues.json> <out.wav>

cues.json = window.CUES from template.html: [{"t": seconds, "kind": "intro" | ...}].
Every cut gets a riser into it and an impact on it; "whatif" scenes drop the
drums for two beats (tension), the intro builds up, the end fades out.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)

dur = float(sys.argv[1])
cues = json.load(open(sys.argv[2]))
out_path = sys.argv[3]
N = int((dur + 1.5) * SR)
L = np.zeros(N)
R = np.zeros(N)


def t_arr(n):
    return np.arange(n) / SR


def lowpass(x, fc, q=1.0):
    """Gentle FFT low-pass (no scipy here)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** (4 * q))
    return np.fft.irfft(X, len(x))


def highpass(x, fc):
    return x - lowpass(x, fc)


def put(buf, start_s, sig, gain=1.0):
    i = int(start_s * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    j = min(len(buf), i + len(sig))
    buf[max(i, 0):j] += gain * sig[max(0, -i):j - i]


def both(start_s, sig, gain=1.0, pan=0.0):
    put(L, start_s, sig, gain * (1 - max(0, pan)))
    put(R, start_s, sig, gain * (1 + min(0, pan)))


def saw(freq, n, detune=0.0):
    ph = (t_arr(n) * freq * (1 + detune) + rng.random()) % 1
    return 2 * ph - 1


def note_hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# ── sounds ──────────────────────────────────────────────────────────────────
def kick():
    n = int(0.42 * SR); t = t_arr(n)
    f = 45 + 110 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = rng.standard_normal(n) * np.exp(-t * 300) * 0.3
    return np.tanh(2.2 * (body + click))


def clap():
    n = int(0.3 * SR); t = t_arr(n)
    env = np.exp(-t * 18) + 0.6 * sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0.0, 0.012, 0.024))
    return highpass(rng.standard_normal(n), 900) * env * 0.5


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR); t = t_arr(n)
    return highpass(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.5


def impact():
    n = int(2.2 * SR); t = t_arr(n)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t * 9)) / SR) * np.exp(-t * 2.2)
    crash = highpass(rng.standard_normal(n), 3000) * np.exp(-t * 3.5) * 0.22
    return np.tanh(1.6 * boom) + crash


def riser(length):
    n = int(length * SR); t = t_arr(n); x = t / length
    noise = rng.standard_normal(n)
    # sweep: split into chunks with rising cutoff
    out = np.zeros(n); chunk = 2048
    for i in range(0, n, chunk):
        fc = 400 + 9000 * (i / n) ** 2
        seg = noise[i:i + chunk]
        out[i:i + chunk] = lowpass(np.pad(seg, (0, chunk - len(seg))), fc)[:len(seg)]
    return out * x ** 2 * 0.45


# ── arrangement ─────────────────────────────────────────────────────────────
# Am – F – C – G, one chord per bar (4 beats = 2 s).
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 55, 60]), (55, [55, 59, 62])]
BAR = 4 * BEAT
n_bars = int(np.ceil(dur / BAR)) + 1

starts = sorted(c["t"] for c in cues)
kind_at = lambda s: next((c["kind"] for c in reversed(cues) if c["t"] <= s + 1e-6), "intro")
intro_end = starts[1] if len(starts) > 1 else 4.0
whatif_breaks = [(c["t"], c["t"] + 2 * BEAT) for c in cues if c["kind"] == "whatif"]
in_break = lambda s: any(a <= s < b for a, b in whatif_breaks)
outro_start = next((c["t"] for c in cues if c["kind"] == "outro"), dur)

K, C, H, HO = kick(), clap(), hat(), hat(True)
duck = np.ones(N)  # sidechain envelope

n_beats = int(dur / BEAT) + 1
for b in range(n_beats):
    s = b * BEAT
    if s >= dur:
        break
    intro = s < intro_end
    if in_break(s):
        continue
    # kick: from beat 4 of the intro (half-time build), then four on the floor
    if (not intro and True) or (intro and b >= 4 and b % 2 == 0):
        both(s, K, 0.95)
        i = int(s * SR); n = int(0.25 * SR)
        duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.65 * np.exp(-t_arr(min(n, N - i)) * 14))
    if not intro and b % 2 == 1:
        both(s, C, 0.55, pan=0.1)
    # hats: offbeat 8ths, 16th fills in fight scenes
    both(s + BEAT / 2, HO if b % 4 == 3 else H, 0.25 if intro else 0.35, pan=-0.3)
    if not intro and kind_at(s) in ("fight", "board"):
        both(s + BEAT / 4, H, 0.22, pan=0.3)
        both(s + 3 * BEAT / 4, H, 0.22, pan=0.3)

# pad (supersaw chords), bass, arp
pad = np.zeros(N); bass = np.zeros(N); arp = np.zeros(N)
for bar in range(n_bars):
    s = bar * BAR
    if s >= dur:
        break
    root, chord = PROG[bar % 4]
    n = int(BAR * SR); t = t_arr(n)
    env = np.minimum(1, t / 0.08) * np.minimum(1, (BAR - t) / 0.1)
    p = sum(saw(note_hz(m + 12), n, d) for m in chord for d in (-0.006, 0, 0.006)) / 9
    put(pad, s, lowpass(p, 1400 if s >= intro_end else 600 + 800 * s / max(intro_end, 1)) * env, 0.5)
    if s >= intro_end - 1e-6:
        # bass: offbeat 8ths, octave jump on the last one
        for k in range(8):
            if k % 2 == 0:
                continue
            m = root - 24 + (12 if k == 7 else 0)
            nn = int(BEAT / 2 * SR); tt = t_arr(nn)
            sig = lowpass(saw(note_hz(m), nn), 500) * np.exp(-tt * 6) * np.minimum(1, tt / 0.004)
            put(bass, s + k * BEAT / 2, sig, 0.9)
    if kind_at(s) not in ("intro",):
        # arp: 16ths over chord tones, two octaves
        tones = [chord[0] + 24, chord[1] + 24, chord[2] + 24, chord[1] + 36]
        for k in range(16):
            nn = int(BEAT / 4 * SR); tt = t_arr(nn)
            sq = np.sign(np.sin(2 * np.pi * note_hz(tones[k % 4]) * tt))
            sig = lowpass(sq, 2600) * np.exp(-tt * 22)
            put(arp, s + k * BEAT / 4, sig, 0.13)

L += pad * duck + bass * duck; R += pad * duck + bass * duck
both(0, arp * duck, 1.0, pan=0.0)
# little stereo echo on the arp
put(R, 3 * BEAT / 4, arp * duck, 0.35)
put(L, BEAT / 2, arp * duck, 0.25)

# cuts: riser into every cut, impact on it
for c in cues:
    if c["t"] <= 0:
        both(0, impact(), 0.7)
        continue
    rl = 1.5 if c["kind"] in ("whatif", "outro") else 0.9
    r = riser(rl)
    both(c["t"] - rl, r, 0.8 if c["kind"] in ("whatif", "outro") else 0.45)
    both(c["t"], impact(), 0.75 if c["kind"] in ("whatif", "outro", "board") else 0.45)

# master: fade-in/out, glue, normalize
mix = np.stack([L, R])[:, :int(dur * SR)]
n = mix.shape[1]; t = t_arr(n)
fade = np.minimum(1, np.minimum(t / 0.05, np.maximum(0, (dur - t)) / 2.5))
mix *= fade
mix = np.tanh(1.3 * mix / (np.max(np.abs(mix)) + 1e-9)) * 0.9
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out_path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"🎵 {dur:.1f}s, {len(cues)} cues → {out_path}")
