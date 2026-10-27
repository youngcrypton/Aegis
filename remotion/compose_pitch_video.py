import os
import shutil
import subprocess

def compose_pitch_video():
    root = os.path.abspath(".")
    remotion_dir = os.path.join(root, "remotion")
    os.makedirs(os.path.join(remotion_dir, "out"), exist_ok=True)
    os.makedirs(os.path.join(root, "brand", "x"), exist_ok=True)

    video_in = os.path.join(remotion_dir, "public", "recordings", "pitch-demo-recording.webm")
    audio_in = os.path.join(remotion_dir, "public", "audio", "pitch-master-voiceover-mix.wav")
    out_mp4 = os.path.join(remotion_dir, "out", "aegis-pitch-demo-120s.mp4")
    brand_out = os.path.join(root, "brand", "x", "aegis-pitch-demo-120s.mp4")

    if not os.path.exists(video_in):
        raise FileNotFoundError(f"Video recording not found: {video_in}")
    if not os.path.exists(audio_in):
        raise FileNotFoundError(f"Master pitch audio not found: {audio_in}")

    ffmpeg_exe = os.path.join(remotion_dir, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")

    # Mux video and master synchronized audio
    # -c:v libx264 -crf 18 ensures crystal clear visual fidelity
    # -c:a aac -b:a 192k ensures broadcast audio fidelity
    # -t 114.0 ensures exact video duration under the 120s pitch ceiling
    cmd = [
        ffmpeg_exe, "-y",
        "-i", video_in,
        "-i", audio_in,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "114.0",
        out_mp4
    ]

    print("Encoding master 120-second pitch demo video with synchronized voiceover...")
    subprocess.run(cmd, cwd=remotion_dir, shell=False, check=True)

    # Copy to brand/x location
    shutil.copyfile(out_mp4, brand_out)
    print("Master Pitch Demo Video successfully created and copied to:")
    print(f"  - {out_mp4}")
    print(f"  - {brand_out}")

if __name__ == "__main__":
    compose_pitch_video()
