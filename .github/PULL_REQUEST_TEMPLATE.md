## Description
Please include a summary of the changes and the related issue/feature. Mention any architectural rationale and non-obvious design decisions.

Fixes # (issue)

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance / Gas optimization

## Invariant Verification Checklist
- [ ] **INV-1 (Custody Isolation):** Confirmed session keys have trade-only permissions and cannot move collateral.
- [ ] **INV-2 (Monotonic Health):** Confirmed unwinds require price rebound and improve health factor.
- [ ] **INV-3 (Manual Override):** Confirmed single-transaction revocation works unimpeded.
- [ ] **INV-4 (Strict Fee Conservation):** Confirmed 50/50 fee split conservation.
- [ ] **INV-5 (Anti-Replay Nonces):** Confirmed strictly monotonic nonces.

## Automated Testing Checklist
- [ ] `forge test` passes (all 115 tests passing, 0 failures)
- [ ] `npm test` in `keeper/` passes (all 29 tests passing, 0 failures)
- [ ] `node test/test_frontend_truthfulness.js` passes (all 13 tests passing)
- [ ] UI changes strictly adhere to `brand/kit/tokens.css` with support for Light and Dark modes.
