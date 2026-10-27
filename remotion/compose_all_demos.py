import os
import sys
import shutil
import subprocess

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def compose_all_demos():
    root = os.path.abspath(".")
    remotion_dir = os.path.join(root, "remotion")
    os.makedirs(os.path.join(remotion_dir, "out"), exist_ok=True)
    os.makedirs(os.path.join(root, "brand", "x"), exist_ok=True)

    ffmpeg_exe = os.path.join(remotion_dir, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")

    jobs = [
        {
            "name": "114s Pitch Demo (Protocol & Ecosystem Pitch)",
            "video_in": os.path.join(remotion_dir, "public", "recordings", "pitch-demo-recording.webm"),
            "audio_in": os.path.join(remotion_dir, "public", "audio", "pitch-master-voiceover-mix.wav"),
            "duration": "114.0",
            "out_primary": os.path.join(remotion_dir, "out", "aegis-pitch-demo-120s.mp4"),
            "copies": [os.path.join(root, "brand", "x", "aegis-pitch-demo-120s.mp4")]
        },
        {
            "name": "164s Live Product Walkthrough Demo",
            "video_in": os.path.join(remotion_dir, "public", "recordings", "live-product-demo.webm"),
            "audio_in": os.path.join(remotion_dir, "public", "audio", "master-voiceover-mix.wav"),
            "duration": "164.0",
            "out_primary": os.path.join(remotion_dir, "out", "aegis-live-product-demo.mp4"),
            "copies": [
                os.path.join(root, "brand", "x", "aegis-live-product-demo.mp4"),
                os.path.join(root, "brand", "x", "aegis-product-demo-3min.mp4")
            ]
        }
    ]

    for job in jobs:
        print(f"\n=======================================================")
        print(f"[*] Composing: {job['name']}")
        print(f"=======================================================")

        if not os.path.exists(job["video_in"]):
            print(f"[WARN] Video file not found: {job['video_in']}, skipping...")
            continue
        if not os.path.exists(job["audio_in"]):
            print(f"[WARN] Audio file not found: {job['audio_in']}, skipping...")
            continue

        cmd = [
            ffmpeg_exe, "-y",
            "-i", job["video_in"],
            "-i", job["audio_in"],
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", job["duration"],
            job["out_primary"]
        ]

        subprocess.run(cmd, cwd=remotion_dir, shell=False, check=True)
        print(f"[+] Encoded: {job['out_primary']}")

        for copy_dest in job["copies"]:
            shutil.copyfile(job["out_primary"], copy_dest)
            print(f"[+] Copied to: {copy_dest}")

    print("\n[SUCCESS] All demo videos composed successfully!")

if __name__ == "__main__":
    compose_all_demos()
