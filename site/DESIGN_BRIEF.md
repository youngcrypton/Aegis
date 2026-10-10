# AEGIS Protocol: Design Brief (v2)

## Goal
A landing page and a trader dashboard that feel like a premium, modern trading product, not a template. The user should understand within seconds that AEGIS protects leveraged positions by hedging instead of liquidating.

## Feel
- Calm under pressure: dense data, but nothing shouts.
- Cinematic on the landing page, precise inside the dashboard.
- Dark by default. Numbers are the hero; decoration supports them.

## Visual system
- Background: near-black with a faint blue-violet cast (`#07090F`), surfaces as translucent glass with a 1px hairline border.
- Accent: a single cool cyan (`#5EEAD4`) for primary action and live state, with a warm amber (`#F5B942`) reserved for warnings. Red (`#F0616D`) only for liquidation risk.
- Type: a grotesk for headings (Space Grotesk), Inter for UI text, JetBrains Mono for every number, price, and address. Numbers use tabular figures.
- Radius: 16px cards, 10px controls, pill badges.
- Motion: 200 to 400ms, ease-out, one slow ambient gradient in the hero. Respect `prefers-reduced-motion`.

## Landing page
1. Hero: one sentence, "Your position is protected before it's liquidated." Primary CTA "Open dashboard," secondary "How hedging works." A live-looking health-factor meter sits beside the headline.
2. Live ticker: a slow marquee of markets with price and 24h change.
3. How it works: three steps (watch, hedge, restore) with a single diagram, not an icon grid.
4. Trust strip: non-custody, trade-only session keys, and a slashable node bond, each as one short line.
5. Footer: minimal, links only.

No stock imagery, no emoji, no generic three-card feature row.

## Dashboard
- Left rail: markets list with search.
- Center: price header with the health factor as the largest element, a hedge-ratio slider, and a position chart.
- Right: order book and recent events.
- Bottom: open hedges with a single manual-override button per row.
- Every destructive action (revoke, close hedge) asks for confirmation inline.

## Content rules
- Use real terms from DESIGN.md: health factor, trigger price, hedge ratio, trailing stop, manual override.
- Never claim custody loss is impossible; say the vault cannot withdraw.
- Figures in the prototype are sample data and are labeled as such.

## Accessibility
- Text contrast at least 4.5:1 on all body copy.
- Every interactive element has a visible focus ring.
- Color is never the only signal: pair red and amber with a label or icon.
