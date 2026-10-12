import os
import shutil
import subprocess

def compose_final_demo():
    root = os.path.abspath(".")
    remotion_dir = os.path.join(root, "remotion")
    os.makedirs(os.path.join(remotion_dir, "out"), exist_ok=True)
    os.makedirs(os.path.join(root, "brand", "x"), exist_ok=True)

    video_in = os.path.join(remotion_dir, "public", "recordings", "live-product-demo.webm")
    sound_in = os.path.join(remotion_dir, "public", "aegis-launch-sound.wav")
    out_mp4 = os.path.join(remotion_dir, "out", "aegis-live-product-demo.mp4")
    brand_out = os.path.join(root, "brand", "x", "aegis-live-product-demo.mp4")

    # Inputs:
    # 0: video
    # 1-6: ch1..ch6
    # 7: ambient sound
    inputs = [
        "-i", video_in, # 0
        "-i", os.path.join(remotion_dir, "public", "audio", "ch1.wav"), # 1
        "-i", os.path.join(remotion_dir, "public", "audio", "ch2.wav"), # 2
        "-i", os.path.join(remotion_dir, "public", "audio", "ch3.wav"), # 3
        "-i", os.path.join(remotion_dir, "public", "audio", "ch4.wav"), # 4
        "-i", os.path.join(remotion_dir, "public", "audio", "ch5.wav"), # 5
        "-i", os.path.join(remotion_dir, "public", "audio", "ch6.wav"), # 6
        "-stream_loop", "-1", "-i", sound_in # 7
    ]

    # Audio Filter Graph using supported filters: adelay, volume, amix
    af = [
        "[1:a]adelay=0|0,volume=1.0[a1]",
        "[2:a]adelay=31000|31000,volume=1.0[a2]",
        "[3:a]adelay=59000|59000,volume=1.0[a3]",
        "[4:a]adelay=80000|80000,volume=1.0[a4]",
        "[5:a]adelay=108000|108000,volume=1.0[a5]",
        "[6:a]adelay=137000|137000,volume=1.0[a6]",
        "[7:a]volume=0.06[abg]",
        "[a1][a2][a3][a4][a5][a6][abg]amix=inputs=7:duration=first:dropout_transition=2[aout]"
    ]

    filter_complex_content = ";\n".join(af)
    filter_script_path = os.path.join(remotion_dir, "audio_graph.txt")
    with open(filter_script_path, "w", encoding="utf-8") as f:
        f.write(filter_complex_content)

    ffmpeg_exe = os.path.join(remotion_dir, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
    cmd = [
        ffmpeg_exe, "-y",
        *inputs,
        "-filter_complex_script", filter_script_path,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "164.16",
        out_mp4
    ]

    print("Encoding master video with synchronized 6-chapter audio narration...")
    subprocess.run(cmd, cwd=remotion_dir, shell=False, check=True)

    # Copy to brand/x
    shutil.copyfile(out_mp4, brand_out)
    print(f"Master Video successfully created and copied to:")
    print(f" - {out_mp4}")
    print(f" - {brand_out}")

if __name__ == "__main__":
    compose_final_demo()
