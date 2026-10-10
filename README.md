# AEGIS

AEGIS is a non-custodial hedging protocol on Elysium L2, executing against HyperCore. It opens a hedge when a position's health breaches its trigger, and closes the hedge as the market recovers. Collateral never leaves the user's control.

## What is in this repo

| Path | What it is |
| --- | --- |
| `index.html` | The landing page. A single file with inline CSS and JS, built to the brand kit. |
| `app/` | The pro-trader terminal app. Run it with `node app/serve.js`, then open `http://localhost:3000`. |
| `brand/` | The brand kit (`brand/kit/aegis-brand-kit.html`), its tokens (`brand/kit/tokens.css`), the master logo mark and social assets. |
| `assets/` | Images used by the landing page. |
| `site/archive/` | Earlier landing page versions and old logo drafts, kept for reference only. |
| `DESIGN.md` | Architecture and design system specification. |
| `AGENTS.md` | Rules for anyone writing UI, graphics or copy for AEGIS. Read it before building. |

## Rules for UI and brand

Every screen, page and social asset follows the AEGIS brand kit and `AGENTS.md`. Use the kit's tokens, support light and dark themes, and use Marcellus and Inter only. Open items in the kit (wordmark case and navy on white) are unresolved, so follow the kit as written and flag them.
