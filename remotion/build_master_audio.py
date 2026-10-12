import wave
import struct
import math
import os

def load_wav(filepath):
    with wave.open(filepath, "rb") as w:
        n_channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        rate = w.getframerate()
        n_frames = w.getnframes()
        raw = w.readframes(n_frames)
        
        # Unpack
        samples = []
        if sampwidth == 2:
            count = n_frames * n_channels
            fmt = f"<{count}h"
            data = struct.unpack(fmt, raw)
            if n_channels == 1:
                # Duplicate to stereo
                for s in data:
                    val = s / 32768.0
                    samples.append((val, val))
            elif n_channels == 2:
                for i in range(0, count, 2):
                    l = data[i] / 32768.0
                    r = data[i+1] / 32768.0
                    samples.append((l, r))
        return samples, rate

def build_master_audio():
    sample_rate = 44100
    total_duration = 162.0  # 2m 42s
    total_samples = int(total_duration * sample_rate)

    out_l = [0.0] * total_samples
    out_r = [0.0] * total_samples

    # Chapter voice start times (in seconds)
    chapter_starts = [
        (1.0, "remotion/public/audio/ch1.wav"),
        (25.5, "remotion/public/audio/ch2.wav"),
        (55.5, "remotion/public/audio/ch3.wav"),
        (85.5, "remotion/public/audio/ch4.wav"),
        (115.5, "remotion/public/audio/ch5.wav"),
        (142.5, "remotion/public/audio/ch6.wav")
    ]

    for start_t, wav_path in chapter_starts:
        if os.path.exists(wav_path):
            samples, rate = load_wav(wav_path)
            start_idx = int(start_t * sample_rate)
            for i, (l, r) in enumerate(samples):
                pos = start_idx + i
                if pos < total_samples:
                    out_l[pos] += l * 1.05
                    out_r[pos] += r * 1.05
            print(f"Placed {wav_path} at {start_t}s ({len(samples)/sample_rate:.1f}s)")

    # Subtle ambient synth bed in the background (-20dB)
    # Slow warm chords cycling: D maj9 -> B min7 -> G maj7 -> A sus4
    chords = [
        [146.83, 220.0, 277.18, 329.63], # D, A, C#, E
        [123.47, 185.0, 220.0, 293.66],  # B, F#, A, D
        [98.0, 146.83, 196.0, 246.94],   # G, D, G, B
        [110.0, 164.81, 220.0, 293.66]   # A, E, A, D
    ]
    chord_duration = 8.0 # 8s per chord
    for i in range(total_samples):
        t = i / sample_rate
        chord_idx = int(t / chord_duration) % len(chords)
        chord_t = (t % chord_duration) / chord_duration
        # Gentle swell envelope
        chord_env = math.sin(chord_t * math.pi) * 0.045
        
        # Fade in at start and fade out at end
        master_env = 1.0
        if t < 2.0:
            master_env = t / 2.0
        elif t > 158.0:
            master_env = max(0.0, (162.0 - t) / 4.0)

        for pf in chords[chord_idx]:
            s = math.sin(2.0 * math.pi * pf * t) * chord_env * master_env
            out_l[i] += s
            out_r[i] += s

    # Master Normalization
    max_peak = max(max(abs(s) for s in out_l), max(abs(s) for s in out_r), 0.001)
    gain = 0.92 / max_peak

    out_wav = "remotion/public/audio/master-voiceover-mix.wav"
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sample_rate)

        buf = bytearray()
        for i in range(total_samples):
            l_val = max(-1.0, min(1.0, out_l[i] * gain))
            r_val = max(-1.0, min(1.0, out_r[i] * gain))
            buf.extend(struct.pack("<hh", int(l_val * 32767.0), int(r_val * 32767.0)))
        w.writeframes(buf)

    print(f"Master voiceover mix saved to {out_wav} (162.0s / 2m 42s)")

if __name__ == "__main__":
    build_master_audio()
