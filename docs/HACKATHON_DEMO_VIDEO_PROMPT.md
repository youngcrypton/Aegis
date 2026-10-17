# AEGIS PROTOCOL — MASTER DEMO VIDEO PROMPT (120 SECONDS / LIGHT MODE)

> **File:** `docs/HACKATHON_DEMO_VIDEO_PROMPT.md`  
> **Target Audience:** Hackathon Judges (Elysium L2 / Hyperliquid / DeFi Track)  
> **Duration:** Exactly 120.00 Seconds (2 Minutes Max — 7,200 frames @ 60 FPS / 3,600 frames @ 30 FPS)  
> **Visual Theme:** **AEGIS Brand Kit LIGHT MODE** (Strictly adhering to `brand/kit/tokens.css` and `AGENTS.md`)  
> **Audio:** Synchronized Loud, Confident Engineer Voiceover with Subtle High-Tech Sound FX  

---

```markdown
You are a Principal Motion Designer, Full-Stack DeFi Engineer, and Hackathon-Winning Demo Producer specializing in Remotion, React, and Web3 motion graphics.

Your task is to build a high-impact, 120-second (2-minute maximum, 1920x1080 @ 60 FPS, exactly 7,200 frames) product demo video for the hackathon judges of AEGIS Protocol.

The video must showcase what is ACTUALLY WORKING in the AEGIS codebase on Elysium Orbit L2 (Chain ID 99801) and HyperCore, highlighting the most critical technical innovations, accompanied by a loud, authoritative, perfectly timed voiceover narration that explains the protocol with clarity and punch.

---

### 1. STRICT DESIGN SYSTEM & BRAND KIT SPECIFICATIONS (LIGHT MODE ONLY)

The video MUST be rendered exclusively in the **AEGIS Brand Kit LIGHT MODE**. Dark mode is strictly prohibited for this composition. All styles must use the verified brand tokens from `brand/kit/tokens.css`:

- **Background & Canvases:**
  - Base Gradient: `--bg-base` -> `linear-gradient(135deg, #FFF6EC 0%, #D6F5EC 45%, #DCCBFF 100%)`
  - Ground Fallback: `--ground` -> `#F7F1FA`
- **Surfaces & Cards:**
  - Card Fill: `--raised` -> `#FFFFFF`
  - Border: `--rule` -> `rgba(22, 18, 48, 0.13)` (1px solid)
  - Card Radius: `16px` flat surface (No dark mode glows, no decorative 3D gradients on UI panels)
- **Typography & Hierarchies:**
  - Display / Headlines: `"Marcellus", Georgia, serif` (Sentence case, balanced line breaks)
  - UI Labels / Numerals / Tables: `"Inter", system-ui, sans-serif` (Light 300 for display subheads, 400 for body, 500 for labels, 600 for emphasis)
  - Numbers: `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';` (All dynamic metrics must use tabular figures)
  - Emojis: **STRICTLY ZERO EMOJIS**. Never use generic emoji icons. Use clean SVG vector glyphs.
- **Color Roles & Contrast (All meet WCAG AA in Light Mode):**
  - Primary Ink (Headlines & Body): `--ink` -> `#161230` (18.1:1 contrast on white)
  - Supporting Ink (Subheads & Labels): `--ink-2` -> `#5C5778` (6.1:1 contrast on white)
  - Accent (Active State / Safe / Primary Action): `--accent` -> `#07705F` (Forest Teal, 6.0:1 contrast)
  - Hedge (Trigger Level / Armed / Open Hedge): `--hedge` -> `#A34A08` (Dark Amber / Rust, 5.9:1 contrast)
  - Danger (Liquidation Risk / Critical Alert): `--danger` -> `#B8254F` (Crimson Rose, 6.1:1 contrast)
  - Violet (Brand Mark only): `--violet` -> `#6930EA` (3-Blade logo only, never for body text)
- **Brand Motifs:**
  - 3-Blade Master Logo: Clean 11-stop Aurora gradient (`#1F0E4C` to `#087E6D`)
  - Two-line comparison chart: Crimson line for falling collateral, Forest Teal line for rising hedge
  - Concentric semicircle health factor gauge: Centered at (150, 145), radius R=110, stroke width 16, needle clearance, and tabular readout

---

### 2. REAL VERIFIED CODEBASE CAPABILITIES TO DISPLAY

The demo must highlight the real, functioning technical pillars from the AEGIS repository:

1. **Target Network:** Elysium Orbit L2 Testnet (Chain ID `99801` / `0x185d9`).
2. **Modular Smart Contracts Deployed On-Chain:**
   - `AegisVault`: `0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29`
   - `AegisSentinelRegistry`: `0x6C64188e1D677Eb85E4aD71836650310281f0893`
   - `AegisFeeCollector`: `0xCA9D24c4B5025dA065d1AEf92808aB1698f267ae`
   - `RelayedOracleAdapter`: `0x8829386b87F6CFbf64A3f75916BC96bAb0B12991` (HyperCore consensus price feeds)
   - `AgentDispatchAdapter`: `0xBAD4C895DBcA78F10764D73274dC1f314c80237e` (Sub-second CLOB order dispatch)
   - `AEGIS Token`: `0x606f01e0cd5B90d09A99442e4265a915CeCa5104`
3. **Rigorous Test Suite:** 116/116 Foundry unit and invariant tests passing (100%).
4. **Live Non-Custodial Architecture:**
   - Invariant INV-1: Ephemeral trade-only session key delegation with ZERO withdrawal rights and 0% custody risk.
   - Invariant INV-2: Dynamic trailing take-profit ($\tau = 1.5\%$) auto-unwind on market bounce.
   - Pure Mathematical Health Factor: $H = \frac{C \cdot P \cdot T}{D}$ monitored continuously.
5. **Dual Interface:**
   - **Lite Auto-Pilot:** 1-click preset protection (Conservative, Balanced, Aggressive) for everyday DeFi users.
   - **Pro Terminal:** Granular trigger thresholds, live TradingView charts, HyperCore 10-level orderbook depth, real-time keeper execution feed.
6. **Economic Flywheel:**
   - 20% protocol fee burned via `AegisFeeCollector`, 80% distributed to stakers.

---

### 3. COMPLETE 120-SECOND TIMELINE & SYNCHRONIZED SCENE BREAKDOWN

Total duration: Exactly 120.00 seconds (7,200 frames @ 60 FPS).

```
0:00        0:18             0:40                     1:05                               1:35               1:50         2:00
[--- ACT 1 ---][---- ACT 2 ----][-------- ACT 3 --------][------------- ACT 4 -------------][---- ACT 5 ----][-- ACT 6 --]
 The Problem    Elysium & INV-1    Lite & Pro Terminals    -18% Flash Crash & Auto-Hedge     Unwind & Burn     CTA & Live
 (18s / 1080f)   (22s / 1320f)        (25s / 1500f)                 (30s / 1800f)            (15s / 900f)     (10s / 600f)
```

#### ACT 1: THE LIQUIDATION CRISIS & THE HOOK (0:00 – 0:18 | Frames 0 – 1,080)
- **Visual:** Light theme ground `#F7F1FA` with subtle floating geometric grid. 3-Blade Aurora logo emerges. Headline appears in Marcellus: *"Over $4.2 Billion Wiped Out in DeFi Cascade Liquidations"*. A red liquidation alert card drops in with an 8% liquidation penalty.
- **Audio / SFX:** Deep cinematic sub-drop into high-tech digital pulse.
- **Voiceover Narration (Loud, clear, punchy):**
  > *"Every bull run, billions of dollars in borrower collateral are wiped out by sudden cascade liquidations. Traditional money markets penalize you eight to fifteen percent when the market dips. But what if your collateral could defend itself? Welcome to AEGIS Protocol."*

#### ACT 2: ARCHITECTURE & NON-CUSTODIAL INVARIANT INV-1 (0:18 – 0:40 | Frames 1,080 – 2,400)
- **Visual:** Smooth camera pan into Elysium Orbit L2 architecture schematic. Clean white `#FFFFFF` cards with 1px rule borders. Badges: `Elysium Orbit L2 (Chain 99801)`, `Sub-78ms HyperCore CLOB`, `AegisVault On-Chain`. Highlight security badge: `INVARIANT INV-1: 0% Custody Risk`. An EIP-712 session key delegation card appears showing `Scope: Trade-Only / Withdrawals: FORBIDDEN`.
- **Audio / SFX:** Soft rhythmic electronic click and data feed hum.
- **Voiceover Narration:**
  > *"Built natively on Elysium Orbit L2 and powered by HyperCore, AEGIS is an autonomous, high-frequency risk sentinel. Under Invariant INV-1, users delegate ephemeral, trade-only session keys. Sentinels can never withdraw your assets—they have exactly one job: open a delta-neutral short hedge the moment volatility threatens your position."*

#### ACT 3: WORKING PRODUCT TOUR — LITE AUTO-PILOT & PRO TERMINAL (0:40 – 1:05 | Frames 2,400 – 3,900)
- **Visual:** Live terminal view in pristine Light Mode (`app/index.html`). 
  1. Toggle to **Lite Auto-Pilot**: Simple 1-click slider (`0.05 HYPE Collateral`), "Balanced Shield" activated with emerald badge.
  2. Toggle to **Pro Terminal**: Clean white multi-panel layout. Live TradingView chart, 10-level streaming HyperCore orderbook, and the pure concentric semicircle health factor gauge sitting safely at $H = 1.41$ (Forest Teal).
- **Audio / SFX:** UI toggle sound, smooth data count-up ticking.
- **Voiceover Narration:**
  > *"AEGIS delivers dual-layer execution. In Lite Auto-Pilot, everyday borrowers activate non-custodial protection in a single click. For institutional traders, our Pro Terminal delivers live HyperCore orderbook depth, custom trigger thresholds, and real-time health factor monitoring driven by our verified on-chain vault contracts."*

#### ACT 4: LIVE SIMULATION — -18% FLASH CRASH & SUB-SECOND DEFENSE (1:05 – 1:35 | Frames 3,900 – 5,700)
- **Visual:** Market volatility event! The mark price drops rapidly from $83.46 down to $68.40 (-18%). 
  - Gauge needle deflects smoothly from Teal into Amber ($H = 1.14$).
  - Sentinel trigger alert flashes: `Trigger Breached: H < 1.15`.
  - Dispatch event: Sub-78ms HyperCore CLOB short routed via `AgentDispatchAdapter`.
  - Live execution badge confirms: `Hedge Opened: Short 500 HYPE @ $68.40`.
  - Health factor gauge instantly stabilizes at $H = 1.12$, holding the line safely above liquidation threshold ($0.80$).
- **Audio / SFX:** Alert chime (not jarring), followed by immediate rapid execution confirmation beep.
- **Voiceover Narration:**
  > *"Watch what happens during a sudden eighteen-percent flash crash. As mark price plunges, health factor hits the one-point-one-five threshold. In under seventy-eight milliseconds, our keeper sentinel executes an off-chain orderbook short on HyperCore. The borrower position is locked in delta-neutral defense. Zero liquidation. Zero penalty."*

#### ACT 5: AUTONOMOUS UNWIND & VALUE ACCRUAL FLYWHEEL (1:35 – 1:50 | Frames 5,700 – 6,600)
- **Visual:** The market V-bounces back to $76.20. 
  - Trailing take-profit rule ($\tau = 1.5\%$) kicks in automatically.
  - Short is closed at profit: `+$48,250 Liquidations Averted`.
  - Health factor needle springs back to safe Forest Teal at $H = 1.45$.
  - Bottom panel displays `AegisFeeCollector`: `20% Protocol Fee Burned` (AEGIS token counter burning up) and `80% Distributed to Stakers`.
- **Audio / SFX:** Smooth upward resolution chord.
- **Voiceover Narration:**
  > *"When the market stabilizes, AEGIS doesn't leave you stranded. The autonomous trailing take-profit unwinds the short into strength, capturing trading profit directly back into your collateral and restoring health to safe ground. Twenty percent of protocol fees are permanently burned, driving value directly to AEGIS stakers."*

#### ACT 6: LIVE TESTNET STATUS & CALL TO ACTION (1:50 – 2:00 | Frames 6,600 – 7,200)
- **Visual:** Cinematic pull-back to hero card. Live verification pills:
  - `Elysium Testnet: Chain 99801`
  - `Foundry Suite: 116 / 116 Tests Passed`
  - `Contracts Deployed: AegisVault & SentinelRegistry`
  - Big prominent CTA button in Forest Teal (`#07705F`) with white text: *"Launch Terminal at aegishedge.xyz"*.
  - Subtitle: *"Non-Custodial. Autonomous. Unliquidatable."*
- **Audio / SFX:** Triumphant clean closing sonic logo.
- **Voiceover Narration:**
  > *"AEGIS Protocol is live on Elysium L2 testnet with fully verified smart contracts and one hundred and sixteen passing tests. Test the live terminal today at aegishedge dot xyz. Never get liquidated again."*

---

### 4. COMPLETE WORD-FOR-WORD VOICEOVER SCRIPT WITH TIMESTAMPS

Use this script for your text-to-speech engine (ElevenLabs "Adam" or "Antoni" voice, High Clarity & Stability) or human voiceover recording:

| Time | Duration | Act | Script / Narration |
| :--- | :---: | :--- | :--- |
| **0:00 – 0:08** | 8s | Act 1 | *"Every bull run, billions of dollars in borrower collateral are wiped out by sudden cascade liquidations."* |
| **0:08 – 0:18** | 10s | Act 1 | *"Traditional money markets penalize you eight to fifteen percent when the market dips. But what if your collateral could defend itself? Welcome to AEGIS Protocol."* |
| **0:18 – 0:29** | 11s | Act 2 | *"Built natively on Elysium Orbit L-Two and powered by HyperCore, AEGIS is an autonomous, high-frequency risk sentinel."* |
| **0:29 – 0:40** | 11s | Act 2 | *"Under Invariant INV-One, users delegate ephemeral, trade-only session keys. Sentinels can never withdraw your assets—they have exactly one job: open a delta-neutral short hedge the moment volatility strikes."* |
| **0:40 – 0:52** | 12s | Act 3 | *"AEGIS delivers dual-layer execution. In Lite Auto-Pilot, everyday borrowers activate non-custodial protection in a single click."* |
| **0:52 – 1:05** | 13s | Act 3 | *"For institutional traders, our Pro Terminal delivers live HyperCore orderbook depth, custom trigger thresholds, and real-time health factor monitoring driven by our verified on-chain vault contracts."* |
| **1:05 – 1:19** | 14s | Act 4 | *"Watch what happens during a sudden eighteen-percent flash crash. As mark price plunges, health factor hits the one-point-one-five threshold."* |
| **1:19 – 1:35** | 16s | Act 4 | *"In under seventy-eight milliseconds, our keeper sentinel executes an off-chain orderbook short on HyperCore. The position is locked in delta-neutral defense. Zero liquidation. Zero penalty."* |
| **1:35 – 1:44** | 9s | Act 5 | *"When the market stabilizes, AEGIS doesn't leave you stranded. The autonomous trailing take-profit unwinds the short into strength, capturing trading profit directly back into your collateral."* |
| **1:44 – 1:50** | 6s | Act 5 | *"Twenty percent of protocol fees are permanently burned, driving direct value to AEGIS stakers."* |
| **1:50 – 2:00** | 10s | Act 6 | *"AEGIS Protocol is live on Elysium L-Two testnet with one hundred and sixteen passing tests. Test the live terminal today at aegishedge dot xyz. Never get liquidated again."* |

**Total Words:** 288 words | **Average Speed:** 144 words/minute (Optimal pacing for comprehension and visual synchronization).

---

### 5. IMPLEMENTATION INSTRUCTIONS & RENDERING COMMANDS

When executing this Remotion composition:
1. Create `remotion/src/compositions/AegisHackathonDemo120s.tsx`.
2. Register the composition in `remotion/src/Root.tsx`:
   - `id="AegisHackathonDemo120s"`
   - `durationInFrames={7200}`
   - `fps={60}`
   - `width={1920}`
   - `height={1080}`
3. Render using non-parallel single-threaded encoding to prevent Chromium memory spikes:
   ```powershell
   npx remotion render AegisHackathonDemo120s out/aegis-hackathon-demo-120s.mp4 --concurrency=1 --disallow-parallel-encoding
   ```
```
