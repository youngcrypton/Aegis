# check_motion.py
# Optional QA on a 30 fps preview (render.js --fps 30 --subframes 1).
# Measures the glide with dense optical flow over the flight (1.6 s to 7.3 s):
#   - the downward speed on screen must never dip below 90% of its median
#   - the zoom must not turn into a zoom-in during the flight
# Approximate: the radial test is a rough sign check, not a calibrated zoom measure.
#
# Usage: python3 check_motion.py preview30.mp4
# Needs: pip install opencv-python-headless numpy
import sys
import cv2
import numpy as np

path = sys.argv[1]
FPS = 30.0
T0, T1 = 1.6, 7.3

cap = cv2.VideoCapture(path)
frames = []
idx = 0
while True:
    ok, fr = cap.read()
    if not ok:
        break
    t = idx / FPS
    if T0 - 0.1 <= t <= T1 + 0.1:
        frames.append((t, cv2.cvtColor(cv2.resize(fr, (720, 576)), cv2.COLOR_BGR2GRAY)))
    idx += 1

speeds, zooms, times = [], [], []
h, w = frames[0][1].shape
cy, cx = h / 2, w / 2
yy, xx = np.mgrid[0:h, 0:w]
rx, ry = xx - cx, yy - cy
rn = np.sqrt(rx ** 2 + ry ** 2) + 1e-6
mask = rn > 120
for (t_a, a), (t_b, b) in zip(frames[:-1], frames[1:]):
    if not (T0 <= t_a <= T1):
        continue
    flow = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 21, 3, 5, 1.2, 0)
    dy = np.median(flow[..., 1][mask])
    radial = np.mean(((flow[..., 0] * rx + flow[..., 1] * ry) / rn)[mask])
    speeds.append(-dy)            # page moves up the screen as the camera glides down it
    zooms.append(radial)
    times.append(t_a)

speeds = np.array(speeds)
zooms = np.array(zooms)
med = np.median(speeds)
dips = [(round(t, 2), round(s / med, 2)) for t, s in zip(times, speeds) if s < 0.9 * med]
print(f"flight samples: {len(speeds)}")
print(f"glide speed (px/frame, screen): median {med:.2f}, min {speeds.min():.2f}, max {speeds.max():.2f}")
print("dips below 90% of median:", dips if dips else "none")
print(f"radial flow: mean {zooms.mean():+.3f}, share of samples zooming in {np.mean(zooms < 0):.0%}")
print("PASS" if not dips and np.mean(zooms < 0) < 0.25 else "CHECK: review the glide speed or the zoom")
