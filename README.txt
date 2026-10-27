AEGIS fly-over render kit
=========================

Files
  film.html        the fly-over page. Every frame is computed from time t in window.seek(t).
  build_assets.js  captures the landing page into capture/ (page base, lifting pieces, logo tile).
  render.js        renders film.html to H.264 MP4 (1440x1152, 60 fps, 14.5 s, motion blur).
  check_motion.py  optional QA on a 30 fps preview: glide speed dips and zoom direction.
  logo/aegis-mark.svg  the approved mark (used for the logo tiles).

Setup (once, on the machine with the GPU)
  1. Install Node 18+, ffmpeg (with libx264) and Python 3 (only for check_motion.py).
  2. npm i playwright sharp
     npx playwright install chromium
  3. pip install opencv-python-headless numpy        (only for check_motion.py)

Run order
  1. node build_assets.js
       Captures PAGE (default: https://aegis.terminall.workers.dev/) at 1440 wide, device scale 2.
       To capture a local copy instead:  PAGE=file:///path/to/index.html node build_assets.js
  2. node render.js --fps 30 --subframes 1 --out preview30.mp4     (optional preview)
     python3 check_motion.py preview30.mp4                          (optional glide and zoom check)
  3. node render.js --out aegis-flyover.mp4                         (final, 60 fps, 16 subframes)

Notes
  - The final render uses the GPU flags for your OS (D3D11 on Windows, Metal on macOS).
    On a machine without a GPU, set GPU_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader"
    but expect it to be very slow.
  - The end card text is empty. Put the closing statement in LINE1 and the italic tail in LINE2
    at the top of the script in film.html. Leave them empty for no text.
  - Fonts: film.html loads Marcellus and Inter from Google Fonts (the brand kit's own link).
    Title and tail are set in Marcellus, with Inter as the fallback.
  - The track (optional, 15 s) is not included. Add it afterwards in ffmpeg:
      ffmpeg -i aegis-flyover.mp4 -i track.wav -c:v copy -c:a aac -shortest aegis-flyover-track.mp4
  - Cruise is fitted in film.html so the footer title arrives at 8.0 s on the captured page height.
    If the page changes, re-check the glide with check_motion.py.
  - Test before the final: node render.js --from 0 --to 60 --out test.mp4
