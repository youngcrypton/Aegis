import math
import struct
import wave
import os

def generate_light_sound():
    sr = 48000
    duration = 8.5
    total_samples = int(duration * sr)

    left = [0.0] * total_samples
    right = [0.0] * total_samples

    def add_sample(i, l_val, r_val):
        if 0 <= i < total_samples:
            left[i] += l_val
            right[i] += r_val

    # 1. Warm Ambient Air & Vinyl/Tape Warmth (0.0s to 8.5s)
    # Gentle low-level warm breath
    for i in range(total_samples):
        t = i / sr
        env = min(1.0, t / 1.0) * min(1.0, (duration - t) / 1.0)
        # Subtle sub hum (55Hz / A1)
        sub_hum = math.sin(2.0 * math.pi * 55.0 * t) * 0.03 * env
        add_sample(i, sub_hum, sub_hum)

    # 2. Electric Piano / Rhodes Opening Chord (Fmaj9: F2, C3, A3, E4, G4)
    chord1_notes = [87.31, 130.81, 220.00, 329.63, 392.00]
    for i in range(int(4.0 * sr)):
        t = i / sr
        env = math.exp(-t * 0.9) * min(1.0, t / 0.04)
        sample = 0.0
        for n_idx, freq in enumerate(chord1_notes):
            # Electric piano tone: sine fundamental + subtle 2nd harmonic + tremolo
            trem = 1.0 + 0.08 * math.sin(2.0 * math.pi * 4.5 * t)
            harm1 = math.sin(2.0 * math.pi * freq * t)
            harm2 = 0.22 * math.sin(4.0 * math.pi * freq * t)
            sample += (harm1 + harm2) * 0.09 * trem
        # Stereo spread
        add_sample(i, sample * 0.95 * env, sample * 1.05 * env)

    # 3. Precision Mechanical Ticks during Drawdown (t = 1.2s to 3.2s)
    tick_times = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]
    for idx, tt in enumerate(tick_times):
        start_idx = int(tt * sr)
        pan = -0.3 if idx % 2 == 0 else 0.3
        for i in range(int(0.015 * sr)):
            t = i / sr
            # Tactile wooden/haptic click
            click = math.sin(2.0 * math.pi * 1800.0 * t) * math.exp(-t * 350.0) * 0.16
            add_sample(start_idx + i, click * (1.0 - pan), click * (1.0 + pan))

    # 4. The Hedge Trigger Event (t = 3.25s)
    # The moment the hedge opens and offsets drawdown:
    # A clear, resonant acoustic chime (C6: 1046.5Hz) + warm bass grounding (F2: 87.3Hz)
    chime_idx = int(3.25 * sr)
    for i in range(int(3.5 * sr)):
        t = i / sr
        env_chime = math.exp(-t * 2.2) * min(1.0, t / 0.005)
        chime = math.sin(2.0 * math.pi * 1046.50 * t) * 0.30
        chime += 0.12 * math.sin(2.0 * math.pi * 2093.00 * t) * math.exp(-t * 4.0)
        # Deep round bass note (F2: 87.3Hz)
        bass = math.sin(2.0 * math.pi * 87.31 * t) * math.exp(-t * 1.2) * 0.35
        # Tactile haptic thump
        thump = math.sin(2.0 * math.pi * 120.0 * t) * math.exp(-t * 60.0) * 0.20

        s_l = (chime * 0.9 + bass * 0.5 + thump * 0.5) * env_chime
        s_r = (chime * 1.1 + bass * 0.5 + thump * 0.5) * env_chime
        add_sample(chime_idx + i, s_l, s_r)

    # 5. Resolving Warm Rhodes Chord (t = 3.4s to 8.5s)
    # Chord: Cmaj9 (C3, G3, E4, B4, D5) -> Effortless safety and serenity
    chord2_notes = [130.81, 196.00, 329.63, 493.88, 587.33]
    chord2_idx = int(3.4 * sr)
    chord2_dur = int((duration - 3.4) * sr)
    for i in range(chord2_dur):
        t = i / sr
        if t < 0.2:
            env = t / 0.2
        elif t > 4.2:
            env = max(0.0, 1.0 - (t - 4.2) / 0.8)
        else:
            env = 1.0 - 0.08 * (t / 4.2)

        sample_l = 0.0
        sample_r = 0.0
        for n_idx, freq in enumerate(chord2_notes):
            vibrato = math.sin(2.0 * math.pi * 3.8 * t + n_idx) * 0.5
            w = math.sin(2.0 * math.pi * (freq + vibrato) * t)
            w += 0.18 * math.sin(4.0 * math.pi * freq * t)
            pan_offset = 0.15 if n_idx % 2 == 0 else -0.15
            sample_l += w * 0.075 * (1.0 - pan_offset)
            sample_r += w * 0.075 * (1.0 + pan_offset)

        add_sample(chord2_idx + i, sample_l * env, sample_r * env)

    # 6. Delicate Chime Confirmations (t = 4.8s, 5.4s)
    subtle_bells = [(4.8, 1318.51), (5.4, 1567.98)]
    for bt, bf in subtle_bells:
        b_idx = int(bt * sr)
        for i in range(int(1.5 * sr)):
            t = i / sr
            env = math.exp(-t * 3.8) * min(1.0, t / 0.008)
            bell = math.sin(2.0 * math.pi * bf * t) * env * 0.12
            add_sample(b_idx + i, bell * 0.9, bell * 1.1)

    # Master Normalization
    max_peak = 0.0
    for i in range(total_samples):
        max_peak = max(max_peak, abs(left[i]), abs(right[i]))

    gain = 0.92 / max(max_peak, 0.001)

    os.makedirs("remotion/public/audio", exist_ok=True)
    out_path = "remotion/public/audio/aegis-light-theme.wav"
    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = bytearray()
        for i in range(total_samples):
            l_val = max(-1.0, min(1.0, left[i] * gain))
            r_val = max(-1.0, min(1.0, right[i] * gain))
            l_int = int(l_val * 32767.0)
            r_int = int(r_val * 32767.0)
            frames.extend(struct.pack("<hh", l_int, r_int))
        wf.writeframes(frames)

    print(f"Generated luxury acoustic soundscape to {out_path} ({total_samples} samples, {duration}s)")

if __name__ == "__main__":
    generate_light_sound()
