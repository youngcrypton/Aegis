# AGENTS.md

**STOP. The AEGIS brand kit is the only standard for UI, graphics and social assets. Read `brand/kit/aegis-brand-kit.html` and use `brand/kit/tokens.css` before you write any UI. The brand is not yours to change: the open items (wordmark case "Aegis" vs "AEGIS", and navy on white) are unresolved, so follow the kit as written and flag them. Never pick a side, and never invent, override or substitute a colour, typeface or style.**

These rules apply to every agent and contributor writing UI, graphics or copy for AEGIS, whatever tool they use.

## Brand is mandatory for UI

1. **Use the AEGIS brand kit for all UI.** Read `brand/kit/aegis-brand-kit.html` before creating or changing any screen, component, page, image, social asset or graphic. Do not invent a new palette, typeface, spacing scale, icon style or motion style.
2. **Use the tokens.** Import `brand/kit/tokens.css`. Reference colours only as `var(--…)` tokens (`--ground`, `--raised`, `--ink`, `--ink-2`, `--rule`, `--accent`, `--on-accent`, `--hedge`, `--danger`, `--violet`, `--bg-base`). No hard-coded hex values in components.
3. **Two themes, always.** Every UI renders in light and dark. Dark is not a second design: follow the kit's token pattern (light on `:root`; dark in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and in `:root[data-theme="dark"]`).
4. **Typography.** Display: Marcellus (`--display`). Text and UI: Inter (`--text`). Use only the kit's type scale. Headings use `text-wrap: balance`.
5. **Layout.** Use the kit's spacing and the 16px minimum side gutter. No horizontal page scroll at phone width (about 400px). Use `min-width: 0` on grid and flex children that hold text.
6. **Contrast.** Text must meet WCAG AA (4.5:1 for body text) in both themes, using the kit's contrast table as the reference.
7. **Surfaces.** Flat panels with a 16px radius, 1px `--rule` borders, `--raised` fill. No glows or decorative gradients on product UI; the aurora and mark belong to the landing page and kit only.
8. **Voice.** Plain and direct, per the kit's voice section. Use the copy in `DESIGN.md` for technical claims; do not change figures.

## Changing the brand

- Do not edit `aegis-brand-kit.html` or `tokens.css` to suit one screen. If a screen needs a token that does not exist, propose the addition in the pull request and update the kit and tokens together.
- The open items in the kit (wordmark case, navy on white) are unresolved. Do not pick a side in product code; use the kit as written and flag the question.

## Checking your work

Before you hand back UI work, render it in light and dark and confirm: no horizontal overflow at 390px, all text readable in both themes, and no colour outside the tokens.
