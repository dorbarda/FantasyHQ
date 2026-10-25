"""Original upbeat backing track (synthesized, no samples) for the recap video.
Run with: python3 music.py <seconds> <out.wav>
124 BPM: four-on-the-floor kick, claps, off-beat hats, bass and chord stabs
over Am–F–C–G, with a fade in/out.
"""
import sys, wave
import numpy as np

SR, BPM = 44100, 124
dur = float(sys.argv[1]); out = sys.argv[2]
beat = 60 / BPM
n = int(SR * dur)
mix = np.zeros(n)
rng = np.random.default_rng(7)

def add(sig, t):
    i = int(t * SR)
    if i >= n: return
    sig = sig[: n - i]
    mix[i:i + len(sig)] += sig

def env(length, decay):
    t = np.arange(int(length * SR)) / SR
    return t, np.exp(-t * decay)

def kick():
    t, e = env(0.35, 9)
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * 0.9

def clap():
    t, e = env(0.2, 22)
    return rng.standard_normal(len(t)) * e * 0.25

def hat():
    t, e = env(0.06, 70)
    x = rng.standard_normal(len(t))
    return np.diff(x, prepend=0) * e * 0.12

def note(freq, length, decay, amp, saw=True):
    t, e = env(length, decay)
    ph = (t * freq) % 1
    w = (2 * ph - 1) if saw else np.sin(2 * np.pi * freq * t)
    a = np.minimum(1, t * 200)
    return w * e * a * amp

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am, F, C, G — roots (bass) and triads (stabs)
prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]

beats = int(dur / beat) + 1
for b in range(beats):
    t = b * beat
    bar = b // 4
    root, chord = prog[bar % 4]
    intro = bar < 2
    add(kick(), t)
    if not intro:
        if b % 2 == 1: add(clap(), t)
        add(hat(), t + beat / 2)
        add(hat() * 0.6, t + beat / 4 * 3)
        # bass: off-beat eighths
        add(note(midi(root), beat / 2, 6, 0.22), t + beat / 2)
        add(note(midi(root + 12), beat / 4, 10, 0.12), t + beat * 0.75)
    # chord stabs on beat 1 and the "and" of 2
    if b % 4 in (0, 1) and not (intro and b % 4 == 1):
        st = t if b % 4 == 0 else t + beat / 2
        for m in chord:
            add(note(midi(m + 12), 0.25, 9, 0.07) + note(midi(m + 12) * 1.005, 0.25, 9, 0.05), st)

# simple low-pass on the whole mix to soften the saws, then fades + normalize
k = np.ones(4) / 4
mix = np.convolve(mix, k, mode='same')
fade_in, fade_out = int(1.0 * SR), int(2.5 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
mix = mix / np.max(np.abs(mix)) * 0.8
pcm = (mix * 32767).astype(np.int16)
stereo = np.column_stack([pcm, pcm]).ravel()
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(stereo.tobytes())
print(f'✅ {dur:.1f}s → {out}')
