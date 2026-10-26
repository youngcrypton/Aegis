# AEGIS Protocol — Branding Guide

> **Brand Identity, Visual Design System & Voice Specification**  
> Document Version: 1.0.0  
> Status: Canonical Blueprint — Phase 4  
> Source of Truth: [`brand/kit/aegis-brand-kit.html`](file:///c:/Users/ascend%20X%20elysium/brand/kit/aegis-brand-kit.html), [`brand/kit/tokens.css`](file:///c:/Users/ascend%20X%20elysium/brand/kit/tokens.css), and [`AGENTS.md`](file:///c:/Users/ascend%20X%20elysium/AGENTS.md)

---

## 1. Name & Identity

### 1.1 Project Name
- **Name**: AEGIS Protocol (also referred to as Aegis)
- **Pronunciation**: `/ˈiːdʒɪs/` ("EE-jis")
- **Etymology**: In classical antiquity, the *Aegis* (Greek: αἰγίς) was the divine shield or breastplate carried by Athena and Zeus, symbolizing impenetrable protection and defensive authority. In modern quantitative finance, AEGIS protects trader capital from forced liquidation via automated short perpetual hedges.
- **In code**: `aegis` / `@aegis/sentinel` / `aegis-vault`
- **In prose**: "AEGIS" or "Aegis" *(Note: Open item currently unresolved in governance; see §7.2)*

### 1.2 Tagline
- **Primary Tagline**: "Hedge drawdowns. Never get liquidated." (6 words)
- **Technical Tagline**: "Autonomous non-custodial delta-hedging risk sentinel on Elysium L2 and HyperCore."
- **Marketing Tagline**: "Protect your collateral. Lock the bottom wick. Never face forced liquidation."

### 1.3 Elevator Pitch
AEGIS is an autonomous, non-custodial risk sentinel and automated delta-hedging protocol natively built for Elysium L2 and the HyperCore L1 perpetual CLOB. When collateral valuations approach liquidation thresholds, AEGIS opens surgical short perpetual hedges via sub-second intent lanes without seizing user assets. As markets rebound, hedges unwind with cash profit, restoring collateral health and eliminating forced liquidation penalties.

---

## 2. Logo & Master Mark

### 2.1 Concept
The AEGIS master mark consists of **three geometric blades** rising from a single baseline. It is read as a protective hedge: each blade represents an active layer of defense guarding user collateral.

```
       /|        /|        /|
      / |       / |       / |
     /  |      /  |      /  |
    /   |     /   |     /   |
   /____|    /____|    /____|
  [Blade 1] [Blade 2] [Blade 3]
  ----------------------------- Baseline
```

### 2.2 Specifications
- **Master Geometry**: Three ascending polygons rising at a consistent shearing angle.
- **Multi-Stop Master Gradient**: 154-degree linear gradient maintaining exact stops across both light and dark themes:
  - `0%`: `#1F0E4C` (Deep Indigo)
  - `20%`: `#40178D` (Royal Purple)
  - `40%`: `#6928ED` (Electric Violet)
  - `60%`: `#4C44CB` (Iris Blue)
  - `80%`: `#157286` (Ocean Cyan)
  - `100%`: `#087E6D` (Deep Teal)
- **Theme Invariance**: The master mark retains these gradient stops in both light and dark themes. Do not recolor, retint, or add opacity.
- **Lockup**: Mark placed to the left with wordmark set in **Marcellus** on a shared optical centerline.
- **Clear Space**: Exactly one blade width ($x$) kept clear on all four sides. No typography or interface elements may enter this boundary.
- **Minimum Display Sizes**:
  - Screen Mark: `24px` height minimum
  - Screen Lockup: `120px` width minimum
  - Print Mark: `8mm` height minimum
  - Print Lockup: `30mm` width minimum

### 2.3 Logo Misuse Rules
- **Do not rotate or tilt** the mark.
- **Do not stretch or distort** aspect ratios.
- **Do not recolor outside the approved colourways** (gradient mark or single ink).
- **Do not add glows, neon drop-shadows, or blurs** around the mark on product UI.

### 2.4 Generative Visuals Prompt (AI Asset Guidance)
For generating high-resolution background assets or presentation graphics:
> *"Abstract minimalist financial architecture, 3 rising diagonal geometric blades representing delta-hedging protection, deep teal #087E6D, obsidian navy #1C2238, warm amber #FFBE7A, and violet #6930EA accents, clean vector composition, flat matte surfaces, subtle ambient refraction, 16:9 aspect ratio, zero text, zero neon glow, editorial luxury aesthetic."*

---

## 3. Color Palette & Token System

Every color in AEGIS has exactly one semantic job. Nothing else carries meaning, so nothing else takes these roles.

### 3.1 Semantic Colors

| Role | Token | Light Hex | Dark Hex | Semantic Meaning & Usage |
| :--- | :--- | :---: | :---: | :--- |
| **Accent** | `var(--accent)` | `#07705F` | `#5FD9BE` | Teal — Live state, healthy vault factor ($H \ge 1.25$), primary action buttons. |
| **On Accent**| `var(--on-accent)` | `#FFFFFF` | `#04110E` | High-contrast text label on accent button surfaces. |
| **Hedge** | `var(--hedge)` | `#A34A08` | `#FFBE7A` | Amber — Active short hedge open, caution trigger levels ($1.10 \le H < 1.25$). |
| **Danger** | `var(--danger)` | `#B8254F` | `#FF8A9A` | Rose — Liquidation risk ($H \le 1.10$), emergency manual override killswitch. |
| **Violet** | `var(--violet)` | `#6930EA` | `#C9A6FF` | Violet — Approved master mark and protocol graphics only; **never for text**. |

### 3.2 Neutral Surfaces

| Role | Token | Light Hex | Dark Hex | Usage |
| :--- | :--- | :---: | :---: | :--- |
| **Ground** | `var(--ground)` | `#F7F1FA` | `#1C2238` | Page ground background behind all cards and containers. |
| **Raised** | `var(--raised)` | `#FFFFFF` | `#22403F` | Surface fill for cards, bento panels, dialogs, and tables. |
| **Ink** | `var(--ink)` | `#161230` | `#E8ECF8` | Primary headlines, metric numbers, and high-emphasis body text. |
| **Ink 2** | `var(--ink-2)` | `#5C5778` | `#A7AFCB` | Secondary descriptions, column headers, metadata, and timestamps. |
| **Rule** | `var(--rule)` | `rgba(22, 18, 48, 0.13)` | `rgba(220, 230, 255, 0.12)` | Structural 1px panel borders, table dividers, input borders. |
| **Base** | `var(--bg-base)` | Gradient (135deg) | Gradient (135deg) | Blade ground gradient (`#FFF6EC` $\rightarrow$ `#D6F5EC` $\rightarrow$ `#DCCBFF` light; `#2B2A33` $\rightarrow$ `#1C2238` $\rightarrow$ `#0F2C2C` dark). |

### 3.3 Contrast & WCAG AA Compliance

All text pairings meet WCAG AA standards (minimum 4.5:1 for body copy, 3.0:1 for large display titles):

| Text Token | Surface Token | Theme | Contrast Ratio | WCAG AA Status |
| :--- | :--- | :---: | :---: | :---: |
| `var(--ink)` | `var(--ground)` | Light | **14.8 : 1** | PASS (AAA) |
| `var(--ink)` | `var(--raised)` | Light | **16.2 : 1** | PASS (AAA) |
| `var(--ink-2)` | `var(--ground)` | Light | **5.4 : 1** | PASS (AA) |
| `var(--accent)` | `var(--ground)` | Light | **5.1 : 1** | PASS (AA) |
| `var(--ink)` | `var(--ground)` | Dark | **12.4 : 1** | PASS (AAA) |
| `var(--ink)` | `var(--raised)` | Dark | **9.6 : 1** | PASS (AAA) |
| `var(--ink-2)` | `var(--ground)` | Dark | **6.1 : 1** | PASS (AA) |
| `var(--accent)` | `var(--raised)` | Dark | **7.8 : 1** | PASS (AAA) |

### 3.4 CSS Tokens (`brand/kit/tokens.css`)

```css
:root {
  --bg-base: linear-gradient(135deg, #FFF6EC 0%, #D6F5EC 45%, #DCCBFF 100%);
  --ground: #F7F1FA;
  --raised: #FFFFFF;
  --ink: #161230;
  --ink-2: #5C5778;
  --rule: rgba(22, 18, 48, 0.13);
  --accent: #07705F;
  --on-accent: #FFFFFF;
  --hedge: #A34A08;
  --danger: #B8254F;
  --violet: #6930EA;
  --display: "Marcellus", Georgia, serif;
  --text: "Inter", system-ui, sans-serif;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-base: linear-gradient(135deg, #2B2A33 0%, #1C2238 45%, #0F2C2C 100%);
    --ground: #1C2238;
    --raised: #22403F;
    --ink: #E8ECF8;
    --ink-2: #A7AFCB;
    --rule: rgba(220, 230, 255, 0.12);
    --accent: #5FD9BE;
    --on-accent: #04110E;
    --hedge: #FFBE7A;
    --danger: #FF8A9A;
    --violet: #C9A6FF;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg-base: linear-gradient(135deg, #2B2A33 0%, #1C2238 45%, #0F2C2C 100%);
  --ground: #1C2238;
  --raised: #22403F;
  --ink: #E8ECF8;
  --ink-2: #A7AFCB;
  --rule: rgba(220, 230, 255, 0.12);
  --accent: #5FD9BE;
  --on-accent: #04110E;
  --hedge: #FFBE7A;
  --danger: #FF8A9A;
  --violet: #C9A6FF;
  color-scheme: dark;
}
```

---

## 4. Typography System

### 4.1 Font Stack

| Role | Font Family | Weights | Fallbacks | Usage |
| :--- | :--- | :---: | :--- | :--- |
| **Display** | `Marcellus` | `400` | Georgia, serif | Hero titles, section headings, brand wordmark, metric numerals. |
| **UI & Body** | `Inter` | `400, 500, 600` | system-ui, sans-serif | Body paragraphs, buttons, navigation, table data, forms. |
| **Financial / Tabular** | `Inter` | `500, 600` | tabular-nums, monospace | Price feeds, percentages, health factor ratios, timestamps. |

### 4.2 Type Scale

| Level | Size | Line Height | Tracking | Font |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `clamp(48px, 6vw, 72px)` | `1.05` | `-0.01em` | Marcellus |
| **H1 (Section)** | `clamp(32px, 4vw, 48px)` | `1.15` | `0em` | Marcellus (`text-wrap: balance`) |
| **H2 (Card)** | `24px` | `1.25` | `0em` | Marcellus |
| **H3 (Subtitle)** | `16px` | `1.4` | `+0.01em` | Inter (600) |
| **Body Large** | `17px` | `1.55` | `0em` | Inter (400) |
| **Body Regular** | `15px` | `1.5` | `0em` | Inter (400) |
| **Caption / Meta**| `13px` | `1.4` | `+0.02em` | Inter (500) |
| **Micro Tag** | `11px` | `1.2` | `+0.04em` | Inter (600, uppercase) |

---

## 5. Voice, Tone & Copy Guidelines

### 5.1 Personality Attributes
- **Direct & Plain**: States facts without marketing exaggeration. Never uses empty buzzwords ("revolutionary", "game-changing", "magic").
- **Quantitative & Disciplined**: Uses exact mathematical figures and formulas ($H$, $\gamma$, $\tau$). Never rounds or obscures risk.
- **Institutional & Non-Custodial**: Conveys total respect for user custody. Treats risk management as defensive engineering, not gambling.

### 5.2 Vocabulary Guide

| Write This (Preferred) | Avoid This |
| :--- | :--- |
| "Averts liquidation" | "Stops market dumps" |
| "Short perpetual hedge" | "Betting against the market" |
| "Autonomous delta hedging" | "AI trading bot" |
| "Sub-100ms intent lane" | "Ultra lightning fast" |
| "Trade-only session key" | "Delegated wallet control" |
| "Trailing unwind tolerance" | "Take-profit scanner" |
| "Collateral preserved" | "Funds are safu" |

---

## 6. Visual Language & Surface Rules

### 6.1 Surfaces & Panels
- **Panel Radius**: Strictly `16px` for cards, modals, and bento containers.
- **Pill Radius**: `9999px` strictly for status badges, tags, and action buttons.
- **Panel Borders**: 1px solid `var(--rule)` on all elevated cards.
- **Surface Fill**: `var(--raised)`.
- **Zero Decorative Glows**: Glows, neon blur circles, and cybernetic backdrops are strictly banned on product UI (`AGENTS.md` Rule 7).

### 6.2 Responsive Layout Rules
- **Side Gutters**: Minimum `16px` side padding on all viewports.
- **Mobile Width**: Zero horizontal overflow at phone viewports down to `390px`.
- **Text Containers**: All flex and grid children holding text must include `min-width: 0` to prevent word clipping or flex-grow breakage.
- **Headings**: Headings must specify `text-wrap: balance` to eliminate awkward single-word wrapping.

---

## 7. Asset Checklist & Open Brand Items

### 7.1 Asset Inventory

| Asset | File Path | Format | Status |
| :--- | :--- | :---: | :---: |
| **Brand Kit Living Spec** | `brand/kit/aegis-brand-kit.html` | HTML / CSS | **Approved** |
| **Design System Tokens** | `brand/kit/tokens.css` | CSS | **Approved** |
| **Master Vector Mark** | `brand/kit/aegis-brand-kit.html` (§Logo) | SVG | **Approved** |
| **X Profile Picture** | `brand/x/kit-avatar-1000.png` | PNG (1000×1000) | **Approved** |
| **X Banner Header** | `brand/x/kit-banner-1500x500.png` | PNG (1500×500) | **Approved** |
| **Elysium Network Logo** | `assets/ecosystem/elysium.png` | PNG | **Approved** |
| **Ascend Partner Logo** | `assets/ecosystem/ascent.png` | PNG | **Approved** |

### 7.2 Unresolved Brand Open Items
Per `AGENTS.md`, the following open items remain undecided by governance. Contributors and agents must flag them and never pick a side in product code:
1. **Wordmark Case**:
   - The landing page and brand kit lockup write **"Aegis"** in Marcellus title case.
   - The X social banner writes **"AEGIS"** in tracked uppercase caps.
   - *Rule*: Follow the kit as written; do not force one capitalization across all contexts.
2. **Navy on White Contrast Nuances**:
   - High-contrast banner exports with dark indigo blades on white paper grounds require careful review to prevent optical contrast loss.
