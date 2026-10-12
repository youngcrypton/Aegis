# AEGIS Motion & Video Engine (Remotion)

Programmatic motion graphics and video generation engine for **AEGIS**, built with [Remotion](https://www.remotion.dev) and React 19.

Adheres strictly to the AEGIS brand guidelines (`brand/kit/tokens.css` and `brand/kit/aegis-brand-kit.html`), utilizing Marcellus and Inter typography, the official 3-blade logo mark geometry, and dual-theme token palettes.

---

## Compositions

| Composition ID | Resolution | Aspect Ratio | FPS | Length | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`AegisLaunchTeaser`** | $1920 \times 1080$ | 16:9 | 30 | 5s (150 frames) | Official protocol launch teaser featuring animated 3-blade mark, precompile architecture cards (0x0801 & 0x0802), and launch CTA. |
| **`AegisSocialSquare`** | $1080 \times 1080$ | 1:1 | 30 | 5s (150 frames) | Square social motion card for Twitter/X feed posts, showcasing key protocol metrics and Invariant INV-1 security. |

---

## Getting Started

From the `remotion/` directory:

### 1. Launch Remotion Studio (Interactive UI Preview)
Opens the browser-based Remotion Studio where you can scrub through frames, tweak timing, and preview animations in real time:

```bash
npm run dev
```

### 2. Render Full Videos (MP4)
Render video files into the `out/` folder:

```bash
# Render 16:9 Launch Teaser
npm run render:teaser

# Render 1:1 Social Square Video
npm run render:square
```

### 3. Render High-Resolution Stills / Thumbnails (PNG)
Extract a single frame as a crisp PNG thumbnail:

```bash
# Render frame 75 of Launch Teaser
npm run still:teaser

# Render frame 60 of Social Square
npm run still:square
```

---

## Directory Structure

```
remotion/
├── src/
│   ├── components/
│   │   └── AegisLogo.tsx          # Animated 3-blade SVG mark with staggered entry & glow
│   ├── compositions/
│   │   ├── AegisLaunchTeaser.tsx  # 16:9 landscape launch teaser
│   │   └── AegisSocialSquare.tsx  # 1:1 square social video
│   ├── theme.ts                   # Token constants mapped from brand/kit/tokens.css
│   ├── Root.tsx                   # Composition registration root
│   └── index.ts                   # Remotion entrypoint
├── remotion.config.ts             # Remotion bundler configuration
└── package.json                   # Scripts and dependencies
```
