"""Trim the three effects so they can be base64-inlined like the sprites.

No ffmpeg on this machine, so the work is done with libsndfile through
soundfile: decode, take the front of the sound, fade the tail so cutting it
short does not click, fold to mono, drop the sample rate, and write MP3 again.

A UI effect only needs its attack. The unlock is nearly nine seconds of tail
that nobody waits for, and the tail is what makes the file big.
"""
import io, os, sys
import numpy as np
import soundfile as sf

ROOT = r"C:\Users\kl\projects\study"
MAX_MS = 520          # 520ms of sound + 50ms silence pad = under the 600ms budget
SR_OUT = 22050        # plenty for a short UI blip
FADE_MS = 150         # tail fade, long enough to survive MP3 encoder delay
LEAD_FLOOR = 0.02     # trim leading near-silence


def resample(x, sr_in, sr_out):
    """Linear resample. Fine for a sub-second effect; avoids a scipy dependency."""
    n_out = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n_out), np.arange(len(x)), x)


def process(name, gain=1.0):
    p = os.path.join(ROOT, "assets", name + ".mp3")
    before = os.path.getsize(p)
    d, sr = sf.read(p, always_2d=True, dtype="float64")

    x = d.mean(axis=1)                                    # fold to mono

    loud = np.abs(x) > LEAD_FLOOR                         # skip any lead-in silence
    start = int(np.argmax(loud)) if loud.any() else 0
    x = x[start:]

    keep = int(sr * MAX_MS / 1000)
    x = x[:keep]

    fade = min(int(sr * FADE_MS / 1000), len(x))          # fade the tail
    if fade:
        x[-fade:] *= np.linspace(1.0, 0.0, fade)

    x = resample(x, sr, SR_OUT)
    # MP3 encoding shifts the signal by the encoder's delay, which can push a
    # short fade past the end of the file and leave an audible click. A pad of
    # true silence gives that delay somewhere to land.
    x = np.concatenate([x, np.zeros(int(SR_OUT * 0.05))])

    peak = float(np.max(np.abs(x))) or 1.0                # normalise, then set level
    x = x / peak * gain
    x = np.clip(x, -1.0, 1.0)

    sf.write(p, x.astype("float32"), SR_OUT, format="MP3", subtype="MPEG_LAYER_III")
    after = os.path.getsize(p)
    print("  %-13s %6.1f KB -> %5.1f KB   %5.0f ms  %d Hz mono"
          % (name, before / 1024, after / 1024, len(x) / SR_OUT * 1000, SR_OUT))
    return after


total = 0
total += process("sfx-tool",    gain=0.90)
total += process("sfx-correct", gain=0.85)
total += process("sfx-wrong",   gain=0.85)
print("\n  total %.1f KB  (budget ~60 KB)" % (total / 1024))
if total > 60 * 1024:
    sys.exit("  OVER BUDGET")
