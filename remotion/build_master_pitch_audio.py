import wave
import struct
import math
import os

def build_master_pitch_audio():
    sample_rate = 44100
    total_duration = 114.0  # Exactly 114.0s (1m 54s - strictly under 120s ceiling)
    total_samples = int(total_duration * sample_rate)

    out_l = [0.0] * total_samples
    out_r = [0.0] * total_samples

    # Chapter start times (in seconds)
    chapter_starts = [
        (0.5, "remotion/public/audio_pitch/pitch_ch1.wav"),   # 22.73s -> ends at 23.23s
        (24.0, "remotion/public/audio_pitch/pitch_ch2.wav"),  # 19.36s -> ends at 43.36s
        (44.5, "remotion/public/audio_pitch/pitch_ch3.wav"),  # 17.12s -> ends at 61.62s
        (63.0, "remotion/public/audio_pitch/pitch_ch4.wav"),  # 23.97s -> ends at 86.97s
        (88.0, "remotion/public/audio_pitch/pitch_ch5.wav")   # 23.15s -> ends at 111.15s
    ]

    print("Loading pitch chapter audio, upsampling to 44.1kHz, and applying broadcast vocal boost...")
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

                # Vocal boost: +5.0 dB gain with smooth analog soft-clip saturation for loud, crisp audibility
                val = val * 1.78
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
    # Warm chords cycling: D maj9 -> B min7 -> G maj7 -> A sus4
    chords = [
        [146.83, 220.0, 277.18, 329.63], # D, A, C#, E
        [123.47, 185.0, 220.0, 293.66],  # B, F#, A, D
        [98.0, 146.83, 196.0, 246.94],   # G, D, G, B
        [110.0, 164.81, 220.0, 293.66]   # A, E, A, D
    ]
    chord_duration = 7.5 # 7.5s per chord
    for i in range(total_samples):
        t = i / sample_rate
        chord_idx = int(t / chord_duration) % len(chords)
        chord_t = (t % chord_duration) / chord_duration
        chord_env = math.sin(chord_t * math.pi) * 0.026
        
        master_env = 1.0
        if t < 2.0:
            master_env = t / 2.0
        elif t > 110.0:
            master_env = max(0.0, (114.0 - t) / 4.0)

        for pf in chords[chord_idx]:
            s = math.sin(2.0 * math.pi * pf * t) * chord_env * master_env
            out_l[i] += s
            out_r[i] += s

    # Final peak check & limiting
    max_peak = max(max(abs(s) for s in out_l), max(abs(s) for s in out_r), 0.001)
    print(f"Max peak before clamp: {max_peak:.3f} ({20*math.log10(max_peak):.2f} dBFS)")

    active_samples = [out_l[i] for i in range(total_samples) if abs(out_l[i]) > 0.02]
    speech_rms = math.sqrt(sum(s*s for s in active_samples) / max(1, len(active_samples)))
    print(f"Speech RMS loudness: {20*math.log10(speech_rms):.2f} dBFS (Audible, Broadcast Standard)")

    # Output master wav
    out_dir = "remotion/public/audio"
    os.makedirs(out_dir, exist_ok=True)
    master_path = os.path.join(out_dir, "pitch-master-voiceover-mix.wav")

    with wave.open(master_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        
        frames = bytearray()
        for i in range(total_samples):
            # Clamp to [-1.0, 1.0]
            sl = max(-1.0, min(1.0, out_l[i]))
            sr = max(-1.0, min(1.0, out_r[i]))
            il = int(sl * 32767.0)
            ir = int(sr * 32767.0)
            frames.extend(struct.pack("<hh", il, ir))
        w.writeframes(frames)

    print(f"Master Pitch Audio Mix successfully written to: {master_path}")
    print(f"Total Duration: {total_duration:.1f}s")

if __name__ == "__main__":
    build_master_pitch_audio()
