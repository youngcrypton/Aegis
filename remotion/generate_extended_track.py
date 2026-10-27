import math
import struct
import wave
import os

def generate_extended_track():
    sr = 48000
    duration = 23.0
    total_samples = int(duration * sr)

    left = [0.0] * total_samples
    right = [0.0] * total_samples

    def add_sample(i, l_val, r_val):
        if 0 <= i < total_samples:
            left[i] += l_val
            right[i] += r_val

    # ==========================================
    # PART 1: The Flyover Atmosphere (0.0s - 14.5s)
    # Ethereal, delicate daylight air & warm acoustic chords
    # ==========================================
    
    # Air / Warmth Bed (0.0s to 23.0s)
    for i in range(total_samples):
        t = i / sr
        env = min(1.0, t / 1.5) * min(1.0, (duration - t) / 1.2)
        # Gentle 55Hz (A1) analog sub grounding
        sub = math.sin(2.0 * math.pi * 55.0 * t) * 0.025 * env
        add_sample(i, sub, sub)

    # Ambient Rhodes Chords during Flyover:
    # 0.5s: Cmaj9 (130.81, 196.00, 246.94, 293.66, 329.63)
    # 5.0s: Am9 (110.00, 164.81, 220.00, 261.63, 329.63)
    # 9.5s: Fmaj9 (87.31, 130.81, 174.61, 220.00, 329.63)
    chords_flyover = [
        (0.5, [130.81, 196.00, 246.94, 293.66, 329.63]),
        (5.0, [110.00, 164.81, 220.00, 261.63, 329.63]),
        (9.5, [87.31, 130.81, 174.61, 220.00, 329.63]),
    ]
    for start_t, notes in chords_flyover:
        start_idx = int(start_t * sr)
        chord_len = int(4.5 * sr)
        for i in range(chord_len):
            t = i / sr
            env = math.exp(-t * 0.6) * min(1.0, t / 0.1)
            sample_l, sample_r = 0.0, 0.0
            for idx, freq in enumerate(notes):
                trem = 1.0 + 0.06 * math.sin(2.0 * math.pi * 3.5 * t)
                w = math.sin(2.0 * math.pi * freq * t) + 0.15 * math.sin(4.0 * math.pi * freq * t)
                pan = 0.15 if idx % 2 == 0 else -0.15
                sample_l += w * 0.05 * trem * (1.0 - pan)
                sample_r += w * 0.05 * trem * (1.0 + pan)
            add_sample(start_idx + i, sample_l * env, sample_r * env)

    # Delicate Chime Arpeggio during flyover rise (t = 8.5s to 12.0s)
    arp_notes = [(8.5, 523.25), (9.2, 659.25), (10.0, 783.99), (10.8, 987.77), (11.5, 1046.50)]
    for at, af in arp_notes:
        a_idx = int(at * sr)
        for i in range(int(2.0 * sr)):
            t = i / sr
            env = math.exp(-t * 3.2) * min(1.0, t / 0.005)
            s = math.sin(2.0 * math.pi * af * t) * 0.08 * env
            add_sample(a_idx + i, s * 0.9, s * 1.1)

    # ==========================================
    # PART 2: The Sentinel Scene (14.5s - 23.0s)
    # The hand-off into the Simulator and Delta Hedge
    # ==========================================
    base_t2 = 14.5

    # 1. Opening Chord for Scene 2 (t = 14.5s)
    # Fmaj9 (87.31, 130.81, 220.00, 329.63, 392.00)
    c1_notes = [87.31, 130.81, 220.00, 329.63, 392.00]
    c1_idx = int(base_t2 * sr)
    for i in range(int(3.5 * sr)):
        t = i / sr
        env = math.exp(-t * 0.9) * min(1.0, t / 0.05)
        sample = 0.0
        for freq in c1_notes:
            w = math.sin(2.0 * math.pi * freq * t) + 0.2 * math.sin(4.0 * math.pi * freq * t)
            sample += w * 0.075
        add_sample(c1_idx + i, sample * 0.95 * env, sample * 1.05 * env)

    # 2. Precision Mechanical Ticks during Drawdown (t = 15.8s to 17.8s)
    tick_times = [15.8, 16.1, 16.4, 16.7, 17.0, 17.3, 17.6]
    for idx, tt in enumerate(tick_times):
        start_idx = int(tt * sr)
        pan = -0.3 if idx % 2 == 0 else 0.3
        for i in range(int(0.015 * sr)):
            t = i / sr
            click = math.sin(2.0 * math.pi * 1800.0 * t) * math.exp(-t * 350.0) * 0.16
            add_sample(start_idx + i, click * (1.0 - pan), click * (1.0 + pan))

    # 3. The Hedge Trigger Event (t = 17.75s, which is 3.25s into Scene 2)
    # Resonant acoustic chime (C6: 1046.5Hz) + warm bass grounding (F2: 87.3Hz)
    chime_idx = int(17.75 * sr)
    for i in range(int(3.5 * sr)):
        t = i / sr
        env_chime = math.exp(-t * 2.2) * min(1.0, t / 0.005)
        chime = math.sin(2.0 * math.pi * 1046.50 * t) * 0.30
        chime += 0.12 * math.sin(2.0 * math.pi * 2093.00 * t) * math.exp(-t * 4.0)
        bass = math.sin(2.0 * math.pi * 87.31 * t) * math.exp(-t * 1.2) * 0.35
        thump = math.sin(2.0 * math.pi * 120.0 * t) * math.exp(-t * 60.0) * 0.20

        s_l = (chime * 0.9 + bass * 0.5 + thump * 0.5) * env_chime
        s_r = (chime * 1.1 + bass * 0.5 + thump * 0.5) * env_chime
        add_sample(chime_idx + i, s_l, s_r)

    # 4. Resolving Warm Rhodes Chord (t = 17.9s to 23.0s)
    # Cmaj9 (130.81, 196.00, 329.63, 493.88, 587.33)
    c2_notes = [130.81, 196.00, 329.63, 493.88, 587.33]
    c2_idx = int(17.9 * sr)
    c2_dur = int((duration - 17.9) * sr)
    for i in range(c2_dur):
        t = i / sr
        if t < 0.2:
            env = t / 0.2
        elif t > 4.0:
            env = max(0.0, 1.0 - (t - 4.0) / 1.0)
        else:
            env = 1.0 - 0.05 * (t / 4.0)

        sample_l, sample_r = 0.0, 0.0
        for n_idx, freq in enumerate(c2_notes):
            vibrato = math.sin(2.0 * math.pi * 3.8 * t + n_idx) * 0.5
            w = math.sin(2.0 * math.pi * (freq + vibrato) * t) + 0.18 * math.sin(4.0 * math.pi * freq * t)
            pan_offset = 0.15 if n_idx % 2 == 0 else -0.15
            sample_l += w * 0.075 * (1.0 - pan_offset)
            sample_r += w * 0.075 * (1.0 + pan_offset)
        add_sample(c2_idx + i, sample_l * env, sample_r * env)

    # 5. Confirmation Chimes (t = 19.3s, 19.9s)
    subtle_bells = [(19.3, 1318.51), (19.9, 1567.98)]
    for bt, bf in subtle_bells:
        b_idx = int(bt * sr)
        for i in range(int(1.8 * sr)):
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
    out_path = "remotion/public/audio/aegis-extended-track.wav"
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

    print(f"Generated 23.0s master acoustic soundtrack to {out_path}")

if __name__ == "__main__":
    generate_extended_track()
