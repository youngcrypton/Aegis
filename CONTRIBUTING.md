# Contributing to AEGIS Protocol

Thank you for your interest in contributing to **AEGIS Protocol** — the autonomous, non-custodial risk sentinel and automated delta-hedging engine built for Elysium L2 and HyperCore.

We welcome contributions from protocol researchers, Solidity engineers, quantitative developers, security auditors, and frontend builders.

---

## Code of Conduct

All contributors and community participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all collaborators with respect and professionalism.

---

## Development Environment Setup

### Prerequisites

* **Foundry:** Install `forge`, `cast`, and `anvil` via [getfoundry.sh](https://getfoundry.sh/).
* **Node.js:** v18.x or v20.x LTS.
* **Python:** 3.10+ (for optional simulation scripts).

### Repository Initialization

```bash
# Clone the repository
git clone https://github.com/youngcrypton/Aegis.git
cd Aegis

# Install root dependencies
npm install

# Install Foundry submodules / dependencies
forge install

# Install Sentinel Keeper daemon dependencies
cd keeper
npm install
cd ..
```

---

## Testing & Verification Standards

AEGIS maintains a zero-regression, 100% pass-rate requirement across all protocol layers. Every PR must pass all three test suites:

### 1. Smart Contract & Formal Invariant Suites (Foundry)
```bash
# Run all unit, integration, and fuzz invariant tests (115 tests)
forge test

# Run invariant property fuzzing suites with verbose output
forge test --match-contract InvariantCustodyTest -vvv
forge test --match-contract InvariantHealthTest -vvv
forge test --match-contract InvariantOverrideTest -vvv
forge test --match-contract InvariantFeeSplitTest -vvv
forge test --match-contract InvariantNonceTest -vvv
```

### 2. Sentinel Keeper Daemon Suites (Jest)
```bash
cd keeper
npm test
cd ..
```

### 3. Frontend Truthfulness & Live RPC Telemetry
```bash
node test/test_frontend_truthfulness.js
```

---

## Core Invariant Guidelines (Non-Negotiable)

When writing or modifying smart contracts in `contracts/`, you **must preserve the 5 formal protocol invariants**:

1. **INV-1 (Custody Isolation):** Delegated session keys must **never** hold authority to transfer, withdraw, or encumber vault collateral. Only trade-only short hedging calls are permitted.
2. **INV-2 (Monotonic Health):** Hedge unwinds must strictly improve vault Health Factor ($H_{post} > H_{pre}$).
3. **INV-3 (Manual Override):** Vault owners must retain the unilateral right to instantly revoke Sentinel session keys in a single transaction via `manualOverride()`.
4. **INV-4 (Strict Fee Conservation):** Protocol fees must be conserved: exactly 50% routed to Ascend buyback-and-burn, and exactly 50% distributed to bonded Sentinel stakers.
5. **INV-5 (Cryptographic Nonces):** EIP-712 order intents must use monotonically incrementing per-vault nonces to prevent replay attacks.

---

## Brand Kit Compliance

Any additions or modifications to the user interface (`app/`, `index.html`, `access.html`) must strictly adhere to [`AGENTS.md`](AGENTS.md) and the **AEGIS Brand Kit** in [`brand/kit/tokens.css`](brand/kit/tokens.css):

* **Typography:** Display headings use `Marcellus` (`--display`). Body and UI elements use `Inter` (`--text`).
* **Colors:** Reference colors **only** via `var(--...)` tokens (`--ground`, `--raised`, `--ink`, `--ink-2`, `--rule`, `--accent`, `--on-accent`, `--hedge`, `--danger`, `--violet`, `--bg-base`). **No hard-coded hex codes in components.**
* **Two Themes:** Every screen must support light and dark modes natively.
* **Responsive Layout:** Ensure clean mobile layouts with no horizontal overflow at 390px viewport width.

---

## Pull Request Process

1. Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make clean, atomic commits following the Conventional Commits specification (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
3. Verify that all 157 automated tests pass locally.
4. If modifying static frontend assets, run `node build.js` to update `./dist`.
5. Open a Pull Request on GitHub with a comprehensive description of changes, rationale, and test results.

---

## Reporting Security Issues

Please **do not** open public GitHub issues for security vulnerabilities. Review our [Security Policy](SECURITY.md) for confidential reporting procedures.
