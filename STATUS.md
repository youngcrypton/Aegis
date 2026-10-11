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

## Next

- Add real footer URLs and the live app link.
- Decide on the wordmark case and navy on white.
