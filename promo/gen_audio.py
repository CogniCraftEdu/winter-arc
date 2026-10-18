"""Synthesizes the soundtrack for film.html (60 s, 44.1 kHz stereo WAV). Cues are synced to the film's timeline."""
import sys, wave
import numpy as np

SR = 44100
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
WET_L = np.zeros(N); WET_R = np.zeros(N)   # reverb send

def tarr(d): return np.arange(int(d * SR)) / SR

def add(sig, t0, gain=1.0, pan=0.0, send=0.25):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4); gr = gain * np.sin((pan + 1) * np.pi / 4)
    L[i:i+len(sig)] += sig * gl; R[i:i+len(sig)] += sig * gr
    WET_L[i:i+len(sig)] += sig * gl * send; WET_R[i:i+len(sig)] += sig * gr * send

def env_ar(n, a, r):
    e = np.ones(n); na = max(1, min(int(a * SR), n // 2)); nr = max(1, min(int(r * SR), n // 2))
    e[:na] = np.linspace(0, 1, na) ** 1.5
    e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

def pad(freq, d, a=1.4, r=1.8):
    t = tarr(d)
    s = (np.sin(2*np.pi*freq*t) + .5*np.sin(2*np.pi*freq*1.003*t + 1) + .22*np.sin(2*np.pi*freq*2*t) + .08*np.sin(2*np.pi*freq*3*t))
    s *= 1 + .06*np.sin(2*np.pi*.22*t + freq)
    return s * env_ar(len(t), a, r) / 2.0

def pluck(freq, d=1.1):
    t = tarr(d)
    s = np.sin(2*np.pi*freq*t)*np.exp(-t*4.2) + .45*np.sin(2*np.pi*freq*2.0*t)*np.exp(-t*7) + .2*np.sin(2*np.pi*freq*3.99*t)*np.exp(-t*12)
    s[:int(.003*SR)] *= np.linspace(0, 1, int(.003*SR))
    return s

def bell(freq, d=2.6):
    t = tarr(d)
    parts = [(1, 1.0, 1.6), (2.0, .5, 2.2), (2.76, .3, 3.0), (5.4, .12, 4.5), (0.5, .35, 1.2)]
    s = sum(a*np.sin(2*np.pi*freq*r*t)*np.exp(-t*dec) for r, a, dec in parts)
    s[:int(.002*SR)] *= np.linspace(0, 1, int(.002*SR))
    return s * .55

def noise_swell(d, lo=.02, hi=.9, rising=True):
    n = int(d*SR); x = rng.standard_normal(n)
    k = 60; x = np.convolve(x, np.ones(k)/k, mode='same')   # darken
    e = np.linspace(0, 1, n)**2 if rising else np.linspace(1, 0, n)**2
    return x * e * 3

def thud(d=1.4, f0=62):
    t = tarr(d)
    return np.sin(2*np.pi*(f0 + 40*np.exp(-t*18))*t) * np.exp(-t*3.2)

def click(d=.04, f=2400, g=1.0):
    t = tarr(d)
    return (np.sin(2*np.pi*f*t) * .6 + rng.standard_normal(len(t)) * .4) * np.exp(-t*120) * g

def tick(f=None):
    f = f or rng.uniform(1500, 2600)
    t = tarr(.018)
    return (np.sin(2*np.pi*f*t)*.5 + rng.standard_normal(len(t))*.5) * np.exp(-t*260)

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- score ----------------
# 0 - 4.4 : black screen. low drone + heartbeat
add(pad(73.4, 5.2, 1.2, 1.4), 0, .20, 0, .1)
add(pad(110, 5.2, 1.6, 1.4), 0, .09, 0, .1)
for tb in np.arange(.9, 4.6, 1.0):
    add(thud(.5, 55) * .5, tb, .55, 0, .05); add(thud(.4, 50) * .35, tb + .22, .45, 0, .05)

# 4.3 - 11.3 : textbook. tension - drone + dissonance + rising noise
add(pad(73.4, 7.6, 1.2, 1.5), 4.3, .18, 0, .2)
add(pad(110, 7.6, 2.0, 1.5), 4.3, .08, -.2, .2)
add(pad(hz(63), 7.2, 2.5, 1.5), 4.6, .045, .3, .35)      # Eb4 against D: unease
add(pad(hz(70), 6.5, 3.0, 1.5), 5.2, .035, -.3, .35)     # Bb4
add(noise_swell(6.4), 5.0, .05, 0, .5)

# 11.2 - 60 : chord progression D - Bm - G - A  (2 bars @ 90 bpm = 2.667 s each)
BEAT = 60 / 90.0
CH = [([50, 57, 61, 64, 69], [62, 66, 69, 73]),     # Dmaj9ish
      ([47, 54, 59, 62, 66], [62, 66, 71, 74]),     # Bm7
      ([43, 50, 55, 59, 62], [59, 62, 67, 71]),     # Gmaj7
      ([45, 52, 57, 61, 64], [61, 64, 69, 73])]     # A
def section(t_start, t_end, plucks=True, up=0, pad_gain=.075, pluck_gain=.08, skip=()):
    t = t_start; ci = 0
    while t < t_end - .01:
        chord, arp = CH[ci % 4]; ci += 1
        d = min(4*BEAT, t_end - t) + .9
        for m in chord: add(pad(hz(m), d, 1.2, 1.3), t, pad_gain, rng.uniform(-.4, .4), .35)
        if plucks:
            for k in range(8):
                tt = t + k * BEAT / 2
                if tt >= t_end or any(a <= tt < b for a, b in skip): continue
                m = arp[[0, 1, 2, 3, 2, 1, 2, 3][k]] + up
                add(pluck(hz(m)), tt, pluck_gain * (1.0 if k % 2 == 0 else .7), (-.5 + k/8), .3)
        t += 4 * BEAT
section(11.2, 29.9, plucks=True, up=0)                        # tutor scene: warm resolution
section(29.9, 34.6, plucks=False, pad_gain=.07)               # "SAME CONCEPT" - pad only
section(34.6, 46.4, plucks=True, up=12, pluck_gain=.065)      # multilingual: brighter octave
section(46.4, 54.4, plucks=True, up=0, pluck_gain=.05, skip=[(49.5, 51.6)])  # quiz: sparser

# end card: big D major add9 pad + bell motif, then fade
for m in [38, 50, 57, 62, 66, 69, 73]:
    add(pad(hz(m), 6.2, 1.0, 2.5), 54.4, .06, rng.uniform(-.4, .4), .4)
add(bell(hz(81)), 54.8, .12, .15, .5); add(bell(hz(86)), 55.2, .10, -.15, .5); add(bell(hz(90)), 55.7, .08, .2, .5)

# ---------------- cues ----------------
def typing(t0, n_chars, cps, g=.07):
    for i in range(n_chars):
        add(tick(), t0 + i / cps + rng.uniform(0, .012), g * rng.uniform(.6, 1.0), rng.uniform(-.3, .3), .05)

typing(12.1 + .0, 47, 26)               # user question
typing(16.8, 38, 30)                    # tutor reply
typing(25.7, 70, 30, .05)               # tutor second message
typing(35.0, 26, 22)                    # Hindi request
typing(37.9, 40, 30, .05)               # Hindi reply
typing(42.7, 36, 30, .05)               # Tamil reply
for tt in (12.0, 16.7, 25.6, 34.9, 37.8, 42.6): add(click(.05, 900, .6), tt, .18, 0, .1)   # bubble pop
add(click(.05, 1300, .5), 18.3, .12, -.2, .1); add(click(.05, 1500, .5), 18.65, .12, .2, .1)  # tags
# listening waveform - soft shimmering swell
add(noise_swell(1.6, rising=True) * .6, 14.9, .035, 0, .6)
# ball launch whoosh + landing
add(noise_swell(.55, rising=False)[::1] * 1.0, 18.4, .07, -.2, .3)
add(thud(.6, 70) * .6, 24.6, .22, .3, .2)    # ball lands (launch 18.4 + 6.2 s flight)
add(bell(hz(74), 1.6) * .5, 21.6, .06, 0, .5)             # apex tag "vy = 0"
add(bell(hz(74), 1.6) * .5, 40.5, .05, .1, .5)            # apex (Hindi)
add(bell(hz(74), 1.6) * .5, 44.2, .05, .1, .5)            # apex (Tamil)
for tt in (25.0, 41.2): add(bell(hz(81), 1.8) * .4, tt, .05, 0, .5)  # equations appear
# language switch
add(click(.06, 1100, .8), 42.4, .2, 0, .15)
# ----- scene D hits -----
add(noise_swell(1.1) * .8, 29.2, .09, 0, .5)
add(thud(2.2, 50) * 1.0, 30.2, .55, 0, .3)
add(thud(1.8, 58) * .8, 31.1, .35, 0, .3)
add(bell(hz(62), 2.8), 32.0, .06, 0, .6)
# ----- quiz -----
add(click(.05, 1800, 1.0), 48.45, .35, .3, .1)           # click
for k, m in enumerate([74, 78, 81, 86]):                  # correct chime arpeggio
    add(bell(hz(m), 2.4), 49.6 + k * .09, .10, -.2 + k*.14, .55)
add(bell(hz(62), 3.2), 52.5, .10, 0, .6)                  # "Understood. Finally."
# ----- end -----
add(click(.05, 1000, .9), 57.0, .22, 0, .2)               # CTA pop
add(thud(1.0, 80) * .5, 54.8, .2, 0, .2)

# ---------------- reverb (synthetic IR) ----------------
def make_ir(seed, d=2.4):
    r = np.random.default_rng(seed); t = tarr(d)
    ir = r.standard_normal(len(t)) * np.exp(-t * 2.4)
    ir = np.convolve(ir, np.ones(8)/8, mode='same')   # darken tail
    return ir / np.sqrt(np.sum(ir**2))
from numpy.fft import rfft, irfft
def conv(x, ir):
    n = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return irfft(rfft(x, n) * rfft(ir, n), n)[:len(x)]
L += conv(WET_L, make_ir(1)) * .9
R += conv(WET_R, make_ir(2)) * .9

# ---------------- master ----------------
fade = np.ones(N); nf = int(2.2 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.4
fi = int(.6 * SR); fade[:fi] *= np.linspace(0, 1, fi)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
g = .85 / peak
out = np.stack([L, R], 1) * g
out = np.tanh(out * 1.1) / np.tanh(1.1)
pcm = (out * 32767).astype('<i2')
path = sys.argv[1] if len(sys.argv) > 1 else 'film-audio.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', path, 'rms dB', 20*np.log10(np.sqrt(np.mean(out**2))+1e-9))
