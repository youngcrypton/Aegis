import wave
import struct
import math
import os

def build_master_audio():
    sample_rate = 44100
    total_duration = 164.0  # 2m 44s (matches exactly our live walkthrough recording)
    total_samples = int(total_duration * sample_rate)

    out_l = [0.0] * total_samples
    out_r = [0.0] * total_samples

    # Chapter voice start times (in seconds)
    # Timed specifically for each segment of the demo walkthrough
    chapter_starts = [
        (0.5, "remotion/public/audio/ch1.wav"),   # 30.13s -> ends at ~30.6s
        (31.5, "remotion/public/audio/ch2.wav"),  # 27.31s -> ends at ~58.8s
        (59.5, "remotion/public/audio/ch3.wav"),  # 20.59s -> ends at ~80.1s
        (81.0, "remotion/public/audio/ch4.wav"),  # 27.76s -> ends at ~108.8s
        (109.5, "remotion/public/audio/ch5.wav"), # 28.80s -> ends at ~138.3s
        (139.5, "remotion/public/audio/ch6.wav")  # 22.80s -> ends at ~162.3s
    ]

    print("Loading, upsampling to 44.1kHz, and applying vocal compression/makeup gain...")
    for start_t, wav_path in chapter_starts:
        if not os.path.exists(wav_path):
            raise FileNotFoundError(f"Missing audio file: {wav_path}")
        
        with wave.open(wav_path, "rb") as w:
            n_ch = w.getnchannels()
            sw = w.getsampwidth()
            r = w.getframerate() # 22050
            n_f = w.getnframes()
            raw = w.readframes(n_f)
            data = struct.unpack(f"<{n_f * n_ch}h", raw)

            ratio = sample_rate / r # exactly 2.0
            start_frame = int(start_t * sample_rate)

            for i in range(int(n_f * ratio)):
                src_pos = i / ratio
                src_idx = int(src_pos)
                frac = src_pos - src_idx
                if src_idx + 1 < n_f:
                    val = (data[src_idx] * (1.0 - frac) + data[src_idx + 1] * frac) / 32768.0
                elif src_idx < n_f:
                    val = data[src_idx] / 32768.0
                else:
                    val = 0.0

                # Vocal boost: +4.8 dB gain with smooth analog soft-clip saturation
                val = val * 1.74
                if val > 0.95:
                    val = 0.95 + 0.05 * math.tanh((val - 0.95) / 0.05)
                elif val < -0.95:
                    val = -0.95 + 0.05 * math.tanh((val + 0.95) / 0.05)

                pos = start_frame + i
                if pos < total_samples:
                    out_l[pos] += val
                    out_r[pos] += val
            print(f"  Placed {wav_path} at {start_t}s (duration {n_f / r:.2f}s)")

    # Subtle ambient synth bed in the background (-28 dBFS)
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
        chord_env = math.sin(chord_t * math.pi) * 0.028
        
        # Fade in at start and fade out at end
        master_env = 1.0
        if t < 2.0:
            master_env = t / 2.0
        elif t > 160.0:
            master_env = max(0.0, (164.0 - t) / 4.0)

        for pf in chords[chord_idx]:
            s = math.sin(2.0 * math.pi * pf * t) * chord_env * master_env
            out_l[i] += s
            out_r[i] += s

    # Final peak check & limiting
    max_peak = max(max(abs(s) for s in out_l), max(abs(s) for s in out_r), 0.001)
    print(f"Max peak before clamp: {max_peak:.3f} ({20*math.log10(max_peak):.2f} dBFS)")

    # Calculate active speech RMS
    active_samples = [out_l[i] for i in range(total_samples) if abs(out_l[i]) > 0.02]
    speech_rms = math.sqrt(sum(s*s for s in active_samples) / max(1, len(active_samples)))
    print(f"Speech RMS loudness: {20*math.log10(speech_rms):.2f} dBFS (Broadcast Standard Loud)")

    out_wav = "remotion/public/audio/master-voiceover-mix.wav"
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sample_rate)

        buf = bytearray()
        for i in range(total_samples):
            l_val = max(-0.98, min(0.98, out_l[i]))
            r_val = max(-0.98, min(0.98, out_r[i]))
            buf.extend(struct.pack("<hh", int(l_val * 32767.0), int(r_val * 32767.0)))
        w.writeframes(buf)

    print(f"Master voiceover mix successfully written to: {out_wav} (Duration: {total_duration}s / 2m 44s)")

if __name__ == "__main__":
    build_master_audio()
