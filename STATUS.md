# STATUS

Shared progress log for every tool and contributor. Update it in the same commit as your change.

Last updated: 2026-10-11

## Landing page (`index.html`)

- **Done:** kit-aligned landing page with the approved logo mark, kit tokens, and light and dark themes. Hero, protocol metrics, mechanics, comparison, security, footer.
- **Done:** "Built on" strip with Elysium and Ascend logos, drifting in a straight line.
- **Done:** mobile top bar with a menu button. It opens How it works, Why AEGIS and Security.
- **Open:** footer links (About, Contact, Changelog, Privacy Policy, Terms of Service, Documentation) are placeholders (`href="#"`). They need real URLs.
- **Open:** "Launch app" links point to `http://localhost:3000/#simulator`. They need the live app URL.
- **Open:** the brand kit's open items (wordmark case "Aegis" vs "AEGIS", navy on white) are unresolved. Follow the kit as written and flag them.

## Brand

- **Done:** brand kit (`brand/kit/aegis-brand-kit.html`), tokens (`brand/kit/tokens.css`), approved master mark, X and social assets in `brand/x/`.
- **Open:** splash graphite and lavender colour stops are not yet in the kit's hex list.

## Trader app (`app/`)

- **Status:** kept as the first version of the terminal. Not yet aligned to the brand kit. Run it with `node app/serve.js`.

## Archive

- `site/archive/` keeps `landing-v15.html` to `landing-v18.html` and the old logo drafts for reference only.

## Documentation Platform (`docs/`)

- **Done:** Comprehensive, production-grade technical documentation platform built in `docs/` (`docs/index.html`, `docs/docs.css`, `docs/docs.js`).
- **Done:** 100% token-compliant styling using `brand/kit/tokens.css` with zero hard-coded hex colors; dual-theme support (Dark & Light mode) with persistent preference.
- **Done:** Complete technical coverage across 8 parts: Protocol Overview, Problem of Forced Liquidation, Delta Hedging Approach, Core Principles & Security Invariants (INV-1 to INV-5), Glossary & FAQ, Position Health & Math ($H$), 14-Stage Hedge Lifecycle, Hedge Sizing ($\gamma$) & Trailing Unwind ($\tau$), Worked Numerical Quant Models, Smart Contract Specifications (`AegisVault.sol`, `AegisSentinelRegistry.sol`, `AegisFeeCollector.sol`), Precompile `0x0801` and Predeploy `0x0802`, Sentinel Node Operator Guide (25k $AEGIS bond, latency SLAs, slashing), and Developer SDK Quickstart.
- **Done:** Interactive features including instantaneous full-text search (`Ctrl+K`), client-side hash routing, interactive code block copy, responsive table of contents (TOC) with scroll-spy, and mobile drawer navigation.
- **Done:** Connected Documentation and GitHub links in `index.html` across the topbar, mobile drawer, and footer Resources column with `target="_blank" rel="noopener"` to open in dedicated tabs.
- **Done:** Optimized mobile responsive header for `docs/`: eliminated text overlap by relocating desktop-only links to the drawer, adding mobile search trigger icon, and verifying layout at 390px width.

## Next

- Finalize live app deployment URL for "Launch app" buttons.
- Community governance resolution on wordmark case ("Aegis" vs "AEGIS") and navy on white token nuances.
