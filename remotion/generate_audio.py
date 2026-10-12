import wave
import struct
import math

def synthesize_aegis_sound():
    sample_rate = 44100
    duration = 5.0
    num_samples = int(sample_rate * duration)
    
    # Audio buffer (left and right channels)
    left = [0.0] * num_samples
    right = [0.0] * num_samples

    # 1. Cinematic Sub Bass & Riser (0.0s to 1.8s)
    # Starts at 55Hz (A1) and glides smoothly with a sub-bass bloom
    for i in range(num_samples):
        t = i / sample_rate
        if t < 2.0:
            # Sub-bass envelope: swell then fade
            env = math.sin((t / 2.0) * math.pi) ** 1.5
            freq = 55.0 + 35.0 * (t / 2.0) ** 2
            # Fundamental + soft 2nd harmonic
            sub = math.sin(2.0 * math.pi * freq * t) + 0.3 * math.sin(2.0 * math.pi * freq * 2 * t)
            left[i] += sub * env * 0.45
            right[i] += sub * env * 0.45

        # Subtle stereo cyber whoosh riser (0.3s to 1.5s)
        if 0.3 <= t <= 1.5:
            rt = (t - 0.3) / 1.2
            whoosh_env = math.sin(rt * math.pi) ** 2
            whoosh_freq = 200.0 + 800.0 * (rt ** 3)
            # Noise-like texture mixed with tone
            tone = math.sin(2.0 * math.pi * whoosh_freq * t)
            pan_l = 0.5 - 0.3 * math.cos(rt * math.pi)
            pan_r = 0.5 + 0.3 * math.cos(rt * math.pi)
            left[i] += tone * whoosh_env * 0.18 * pan_l
            right[i] += tone * whoosh_env * 0.18 * pan_r

    # 2. Tech Impact & Shimmer Chime (1.4s impact, decaying through 3.8s)
    # Impact frequencies: 220Hz (A3), 330Hz (E4), 440Hz (A4), 660Hz (E5), 880Hz (A5)
    chime_freqs = [220.0, 329.63, 440.0, 554.37, 659.25, 880.0, 1318.5]
    impact_t = 1.35
    for i in range(num_samples):
        t = i / sample_rate
        if t >= impact_t:
            dt = t - impact_t
            # Quick exponential decay
            decay_fast = math.exp(-dt * 4.5)
            decay_slow = math.exp(-dt * 1.2)
            
            # Low impact thud
            thud = math.sin(2.0 * math.pi * 90.0 * dt) * math.exp(-dt * 10.0) * 0.4
            left[i] += thud
            right[i] += thud

            # Glass/harmonic shimmer
            for idx, f in enumerate(chime_freqs):
                amp = (0.22 / (idx + 1)) * decay_slow
                phase = idx * 0.7
                # Slight stereo spread
                pan_l = 0.7 if idx % 2 == 0 else 0.3
                pan_r = 0.3 if idx % 2 == 0 else 0.7
                sample = math.sin(2.0 * math.pi * f * dt + phase) * amp
                left[i] += sample * pan_l
                right[i] += sample * pan_r

    # 3. High-Frequency Precompile Telemetry Ticks (2.0s to 3.5s)
    # Crisp, rhythmic micro-clicks representing sub-second oracle execution
    tick_times = [2.0, 2.3, 2.6, 2.9, 3.2]
    for tick_t in tick_times:
        tick_sample = int(tick_t * sample_rate)
        tick_len = int(sample_rate * 0.03)  # 30ms click
        for j in range(tick_len):
            idx = tick_sample + j
            if idx < num_samples:
                tj = j / sample_rate
                click_env = math.exp(-tj * 120.0)
                click_val = (math.sin(2.0 * math.pi * 2400.0 * tj) + 0.5 * math.sin(2.0 * math.pi * 4800.0 * tj)) * click_env * 0.12
                # Ping-pong stereo
                side = (tick_times.index(tick_t) % 2)
                left[idx] += click_val * (0.8 if side == 0 else 0.2)
                right[idx] += click_val * (0.2 if side == 0 else 0.8)

    # 4. Warm Ambient Synth Bed & Resolution (3.0s to 5.0s)
    # Resolving chord: D major 9th / A major (warm, trustworthy, institutional)
    pad_freqs = [220.0, 277.18, 329.63, 440.0]
    for i in range(num_samples):
        t = i / sample_rate
        if 2.8 <= t <= 5.0:
            pt = (t - 2.8) / 2.2
            # Smooth swell and gentle tail fade
            pad_env = math.sin(pt * math.pi * 0.9) * 0.16
            if t > 4.6:
                fade_tail = (5.0 - t) / 0.4
                pad_env *= max(0.0, fade_tail)
            for idx, pf in enumerate(pad_freqs):
                detune = 1.0 + (idx * 0.002)
                s = math.sin(2.0 * math.pi * pf * detune * t) * pad_env
                left[i] += s * 0.5
                right[i] += s * 0.5

    # 5. Master Limiter & Normalization
    max_peak = max(max(abs(s) for s in left), max(abs(s) for s in right), 0.001)
    target_peak = 0.88  # -1.1 dB headroom to prevent clipping
    gain = target_peak / max_peak

    # Write WAV file
    output_path = "remotion/public/aegis-launch-sound.wav"
    with wave.open(output_path, "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sample_rate)

        frames = bytearray()
        for i in range(num_samples):
            # Soft clamp
            l_val = max(-1.0, min(1.0, left[i] * gain))
            r_val = max(-1.0, min(1.0, right[i] * gain))
            l_int = int(l_val * 32767.0)
            r_int = int(r_val * 32767.0)
            frames.extend(struct.pack("<hh", l_int, r_int))
        wav.writeframes(frames)
    
    print(f"Synthesized high-res audio to {output_path} ({duration}s @ {sample_rate}Hz)")

if __name__ == "__main__":
    synthesize_aegis_sound()
