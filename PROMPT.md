# AEGIS Protocol — Autonomous Master Implementation Prompt

> **Single-Shot Autonomous Execution Blueprint for Coding Agents**  
> Target Systems: Solidity `0.8.24` / Foundry (`forge`), Node.js v20+ / TypeScript (`@aegis/sentinel`), Vanilla ES2023 Web3 Terminal  
> Target Networks: Elysium L2 (Chain ID `99801`), HyperCore L1 CLOB (`0x0801` Precompile, `0x0802` Predeploy)  
> Brand Design System: AEGIS Brand Kit (`brand/kit/tokens.css`, dual-theme, Marcellus/Inter)  
> Operational Directive: Execute all steps sequentially. Verify each step at checkpoints. Do not deviate from security invariants INV-1 through INV-5.

---

## 1. Executive Summary & System Architecture

### 1.1 The Problem & Solution
On decentralized lending and leveraged trading platforms, sharp downward market wicks cause borrower collateral valuations to breach maintenance liquidation thresholds ($H \le 1.00$). Third-party liquidators seize borrower collateral, assess punishing liquidation penalties (5% to 10%), and dump spot assets into illiquid orderbooks, worsening market cascades.

**AEGIS** eliminates liquidation by executing surgical delta hedging:
1. **Zero-Gas Synchronous Telemetry**: Queries live mark price and orderbook depth on every block via Elysium EVM Precompile `0x0801` (~70ms latency).
2. **Autonomous Short Hedging**: When vault health breaches user parameters ($H \le H_{\text{trigger}}$ or $P_{\text{collateral}} \le P_{\text{trigger}}$), authorized Sentinel nodes dispatch short perpetual orders to HyperCore CLOB via sub-second intent Predeploy `0x0802`.
3. **Strict Non-Custodial Boundary (INV-1)**: Users retain 100% custody of collateral; Sentinels execute trade-only orders via delegated EIP-712 session keys mathematically incapable of withdrawing or transferring capital.
4. **Trailing Unwind**: As market wicks rebound, AEGIS trails recovery ($P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$), closes the short hedge with cash profit, restores collateral health, and prevents liquidation without spot loss.
5. **Economic Flywheel (INV-4)**: A 10% performance fee on averted liquidation penalties is split 50/50: half market-buys and burns `$AEGIS` via Ascend Closed Hook Pools, and half distributes real yield in USDC/HYPE to governance stakers.

---

### 1.2 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            ELYSIUM L2 SMART CONTRACTS                             |
|                        (Solidity 0.8.24, 100-200ms Blocks)                        |
|  +---------------------------+  +-------------------------------+  +------------+ |
|  |      AegisVault.sol       |  |   AegisSentinelRegistry.sol   |  | FeeCollector| |
|  | - Vault collateral state  |  | - 25,000 $AEGIS bonding       |  | - 10% fee  | |
|  | - ProConfig parameters    |  | - SLA tracking & 10% slash    |  | - 50% burn | |
|  | - Trade-only session keys |  | - Active node whitelist       |  | - 50% yield| |
|  | - manualOverride()        |  +-------------------------------+  +------------+ |
|  +---------------------------+                 |                                  |
+------------------------------------------------|----------------------------------+
           ^                      |              |
           |                      | Write Intent |
  0x0801   | Synchronous          v              |
Precompile | Zero-Gas Read    +---------------------+
  (~70ms)  |                  | 0x0802 Predeploy    |
           |                  | (ElysiumCoreWriter) |
           |                  +---------------------+
           |                             |
+------------------------------------+   | CLOB Intent Dispatch
| HYPERCORE L1 MATCHING ENGINE       |<--+ (< 100ms Execution)
| - Perpetual Orderbook (HYPE/USDC)  |
| - Sub-second trade fills           |
+------------------------------------+
           ^
           | Off-Chain Monitoring Loop (100ms)
+------------------------------------+
| SENTINEL KEEPER DAEMON             |
| - Evaluates $H$ on every block     |
| - Computes optimal size $Q_{hedge}$|
| - Signs 0x0802 intent via key      |
+------------------------------------+
```

---

### 1.3 Verification of Facts vs Development Assumptions

In accordance with protocol security and audit standards, any coding agent executing this prompt must strictly distinguish between **verified local facts** and **development assumptions/stubs**:

| System Component | Status | Reality & Operational Protocol |
| :--- | :---: | :--- |
| **Solidity & Foundry** | **Verified Fact** | Solidity `0.8.24`, Foundry `v1.7.1` installed and verified locally. |
| **OpenZeppelin Contracts** | **Verified Fact** | `@openzeppelin/contracts` `v5.x` installed in `lib/openzeppelin-contracts`. |
| **AEGIS Brand Tokens** | **Verified Fact** | Official tokens in `brand/kit/tokens.css`; guidelines in `AGENTS.md`. |
| **Elysium L2 Chain ID `99801`** | **Assumption/Stub** | Target testnet ID. Local tests must use Foundry local VM and mocks. |
| **RPC `rpc.elysium-l2.xyz`** | **Assumption/Stub** | Development endpoint. Verify reachability before live broadcasting. |
| **Precompiles `0x0801` / `0x0802`** | **Assumption/Stub** | Real precompiles reside on Elysium nodes. Local tests must mock with `MockHyperCorePrecompile` etched to `0x0801` and `MockHyperCoreWriter` at `0x0802`. |
| **Ascend Hook Pools** | **Assumption/Stub** | Real AMM pool on Elysium. Local tests use `MockAscendHookPool`. |
| **Non-Custodial Boundary** | **Verified Requirement** | Contracts and Sentinels must never have transfer/withdrawal access to user funds (**INV-1**). |

> [!CAUTION]
> **Live Safety Rule**: Never hardcode private keys, seed phrases, or sensitive API secrets. Never execute transactions against a live mainnet or move real funds without explicit human authorization.

---

## 2. Technology Stack & Locked Toolchain

| Layer | Technology | Locked Version | Rationale & Responsibility |
| :--- | :--- | :---: | :--- |
| **Smart Contracts** | Solidity | `0.8.24` | EVM Cancun target; transient storage (`TSTORE`/`TLOAD`), custom errors. |
| **Contract Toolchain** | Foundry (`forge`) | `>=0.2.0` | High-frequency invariant fuzz testing, gas profiling, native deployment. |
| **Contract Standards**| OpenZeppelin Contracts | `v5.0.2` | `ReentrancyGuardUpgradeable`, `SafeERC20`, `ECDSA`, `EIP712`. |
| **L2 Precompiles** | Elysium L2 Hooks | `0x0801` / `0x0802` | `0x0801` synchronous read; `0x0802` (`ElysiumCoreWriter`) intent lane. |
| **Sentinel Keeper** | Node.js / TypeScript | Node `v20.12+`, TS `5.4.5` | Asynchronous 100ms block event loop; EIP-712 signing; WebSocket listener. |
| **Keeper Libraries** | `ethers` / `ws` / `zod` | ethers `v6.12.0`, ws `8.16.0`, zod `3.23.0` | Fast JSON-RPC, WebSocket multiplexing, typed config validation. |
| **Pro-Trader Terminal**| Vanilla HTML5 / ES6 JS | ES2023 | Sub-50KB bundle, zero build steps, 60 FPS DOM telemetry rendering. |
| **Design System** | Vanilla CSS Tokens | `brand/kit/tokens.css` | 100% brand kit compliance: dual-theme (Light/Dark), Marcellus/Inter fonts. |

---

## 3. Complete Project Directory Layout

```
aegis/
├── contracts/                        # Core Solidity Smart Contracts
│   ├── AegisTypes.sol                # Enums, Data Structs (VaultPosition, ProConfig), Custom Errors
│   ├── AegisVault.sol                # Vault management, ProConfig, Session keys, manualOverride()
│   ├── AegisSentinelRegistry.sol     # 25,000 $AEGIS bonding, node status, 10% SLA slashing
│   ├── AegisFeeCollector.sol         # 10% performance fee capture, 50% buyback/burn, 50% yield
│   ├── core/
│   │   └── TradeIntentExecutor.sol   # EIP-712 structured hash verification & 0x0802 intent dispatch
│   ├── adapters/
│   │   └── HyperCoreOracleAdapter.sol# Low-level staticcall wrapper for 0x0801 precompile
│   └── interfaces/
│       ├── IAegisVault.sol           # External interface for AegisVault
│       ├── IAegisSentinelRegistry.sol# External interface for Sentinel Registry
│       ├── IAegisFeeCollector.sol    # External interface for Fee Collector
│       ├── IAscendHookPool.sol       # External interface for Ascend AMM buyback pool
│       └── IHyperCoreWriter.sol      # Interface for 0x0802 predeploy
│
├── test/                             # Comprehensive Foundry Test Suite
│   ├── unit/
│   │   ├── HyperCoreAdapters.t.sol   # Precompile staticcalls & mock token tests
│   │   ├── SentinelRegistry.t.sol    # Staking, unstaking, SLA violation tests
│   │   ├── FeeCollector.t.sol        # 50/50 fee routing & buyback-burn tests
│   │   └── AegisVault.t.sol          # Vault deposit, parameter setting, override tests
│   ├── invariants/
│   │   ├── InvariantCustody.t.sol    # Invariant INV-1: Non-Custodial verification
│   │   ├── InvariantSlashing.t.sol   # Invariant INV-2: Slashing bounds (< 10%)
│   │   ├── InvariantOverride.t.sol   # Invariant INV-3: Instant manual override killswitch
│   │   ├── InvariantFeeSplit.t.sol   # Invariant INV-4: Strict 50/50 fee conservation
│   │   ├── InvariantNonce.t.sol      # Invariant INV-5: Monotonic nonces
│   │   └── handlers/
│   │       └── VaultHandler.sol      # Invariant fuzz action orchestrator
│   ├── fuzz/
│   │   └── MarginMathFuzz.t.sol      # Differential fuzzing for H, gamma, tau
│   └── mocks/
│       ├── MockHyperCorePrecompile.sol # Simulates 0x0801 mark price and orderbook returns
│       ├── MockHyperCoreWriter.sol     # Simulates 0x0802 predeploy order capture
│       ├── MockERC20.sol               # Mintable test ERC-20 (HYPE, USDC, AEGIS)
│       └── MockAscendHookPool.sol      # Simulates Ascend Closed Hook Pool buyback & burn
│
├── script/                           # Deployment & Seeding Scripts
│   ├── DeployAegis.s.sol             # Elysium L2 production deployment pipeline
│   └── SeedMockEnvironment.s.sol     # Local devnet test seeding
│
├── keeper/                           # Sentinel Node Daemon (@aegis/sentinel)
│   ├── src/
│   │   ├── index.ts                  # Daemon entry point & orchestrator loop
│   │   ├── telemetry.ts              # 100ms WebSocket block listener & 0x0801 poller
│   │   ├── risk_engine.ts            # Mathematical risk evaluator (H, gamma, trigger check)
│   │   ├── trailing_tracker.ts       # Bottom wick tracker & profit-take calculator
│   │   ├── order_signer.ts           # EIP-712 signer using session key
│   │   └── config.ts                 # Typed configuration parser & RPC setup
│   ├── .env.example                  # Environment variable blueprint
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── app/                              # Pro-Trader Web Terminal (Vanilla Client)
│   ├── index.html                    # Terminal DOM layout (16px flat cards, Marcellus/Inter)
│   ├── styles.css                    # 100% tokenized CSS importing brand/kit/tokens.css
│   ├── app.js                        # Client state engine, simulation bar, Web3 wallet connect
│   └── serve.js                      # Local HTTP server (port 3000)
│
├── brand/                            # Single Source of Truth Brand Assets
│   ├── kit/
│   │   ├── aegis-brand-kit.html      # Living specification
│   │   └── tokens.css                # Official design tokens
│   └── x/                            # Social headers, profile avatars, banners
│
├── foundry.toml                      # Foundry compiler & RPC configuration
├── remappings.txt                    # OpenZeppelin & Forge Std remappings
├── .gitignore                        # Git ignore rules (protects PROMPT.md, build outputs)
└── README.md                         # Protocol documentation
```

---

## 4. Configuration Files & Environment Templates

### 4.1 `foundry.toml`
Create `foundry.toml` at the project root:
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
test = "test"
script = "script"
solc_version = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
via_ir = true
fs_permissions = [{ access = "read-write", path = "./" }]

[fuzz]
runs = 1000
max_test_rejects = 65536

[invariant]
runs = 256
depth = 128
fail_on_revert = false

[rpc_endpoints]
elysium_testnet = "https://rpc.elysium-l2.xyz"
hypercore_l1 = "https://rpc.hyperliquid.xyz"
```

### 4.2 `remappings.txt`
Create `remappings.txt` at the project root:
```text
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
```

### 4.3 `keeper/.env.example`
Create `keeper/.env.example`:
```env
# Network RPC Endpoints
ELYSIUM_RPC_URL="https://rpc.elysium-l2.xyz"
ELYSIUM_WS_URL="wss://ws.elysium-l2.xyz"
HYPERCORE_RPC_URL="https://rpc.hyperliquid.xyz"

# Smart Contract Addresses (Set after deployment)
AEGIS_VAULT_ADDRESS="0x0000000000000000000000000000000000000000"
AEGIS_REGISTRY_ADDRESS="0x0000000000000000000000000000000000000000"
AEGIS_FEE_COLLECTOR_ADDRESS="0x0000000000000000000000000000000000000000"

# Sentinel Node Operator Identity
# NOTE: Trade-only session private key ONLY. Never use vault owner/fund-holding keys.
SENTINEL_SESSION_PRIVATE_KEY="0x0000000000000000000000000000000000000000000000000000000000000000"
SENTINEL_OPERATOR_ADDRESS="0x0000000000000000000000000000000000000000"

# Operational Parameters
POLL_INTERVAL_MS=100
MAX_SLIPPAGE_BPS=50
LOG_LEVEL="info"
DRY_RUN=false
```

### 4.4 `keeper/package.json`
Create `keeper/package.json`:
```json
{
  "name": "@aegis/sentinel",
  "version": "1.0.0",
  "description": "High-Frequency Autonomous Risk Sentinel Keeper Daemon for Elysium L2 and HyperCore",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "ethers": "^6.12.0",
    "ws": "^8.16.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "@types/ws": "^8.5.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
```

### 4.5 `keeper/tsconfig.json`
Create `keeper/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### 4.6 `keeper/Dockerfile`
Create `keeper/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

### 4.7 `keeper/docker-compose.yml`
Create `keeper/docker-compose.yml`:
```yaml
version: '3.8'

services:
  sentinel-keeper:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 5. Domain Types & Packed Storage Layout (`contracts/AegisTypes.sol`)

Create `contracts/AegisTypes.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

enum TriggerMode {
    PRICE,              // 0: Trigger strictly on collateral price breach
    HEALTH_FACTOR,      // 1: Trigger strictly on Health Factor breach
    HYBRID              // 2: Trigger on either (H <= H_trigger OR P <= P_trigger)
}

enum OrderType {
    POST_ONLY_LIMIT,    // 0: Resting liquidity order on HyperCore CLOB
    IOC,                // 1: Immediate-or-cancel market taker
    MARKET              // 2: Immediate market fill
}

enum VaultState {
    STANDBY,            // 0: Healthy, risk monitored
    ARMED,              // 1: Health factor within 5% of trigger
    HEDGED,             // 2: Short perpetual hedge active on HyperCore
    UNWOUND,            // 3: Hedge closed, cash profit locked
    OVERRIDDEN          // 4: Emergency manual override active
}

// Packed ProConfig struct: Exactly 3 EVM storage slots
struct ProConfig {
    // Slot 1 (15 bytes used, 17 bytes free)
    uint8 triggerMode;              // 1 byte
    uint8 orderType;                // 1 byte
    uint16 hedgeRatioBps;           // 2 bytes (1000 = 10% to 10000 = 100%)
    uint16 trailingTakeProfitBps;   // 2 bytes (50 = 0.5% to 500 = 5.0%)
    uint16 maxSlippageBps;          // 2 bytes (10 = 0.1% to 100 = 1.0%)
    uint48 sessionKeyExpiry;        // 6 bytes (Unix timestamp)
    bool manualOverrideActive;      // 1 byte
    // Slot 2 (32 bytes)
    uint256 priceTrigger;           // Collateral price threshold scaled 1e8
    // Slot 3 (32 bytes)
    uint256 healthFactorTrigger;    // Health factor threshold scaled 1e4 (11000 = 1.10)
}

// Packed VaultPosition struct: Exactly 4 EVM storage slots
struct VaultPosition {
    // Slot 1 (28 bytes used, 4 bytes free)
    address owner;                  // 20 bytes
    uint16 liquidationThresholdBps; // 2 bytes (e.g. 8000 = 80%)
    uint48 lastHedgeBlock;          // 6 bytes
    // Slot 2 (32 bytes used)
    address collateralToken;        // 20 bytes
    uint96 collateralAmount;        // 12 bytes (up to 79B units at 1e18)
    // Slot 3 (32 bytes used)
    uint256 debtAmountUsdc;         // Borrowed debt in USDC (scaled 1e6)
    // Slot 4 (20 bytes used)
    address sessionKey;             // Delegated trade-only signer
}

struct ActiveHedge {
    bool isOpen;
    uint32 perpMarketIndex;
    uint256 size;                   // Position size in base tokens
    uint256 entryPrice;             // Fill price on HyperCore (scaled 1e8)
    uint256 lowestWickPrice;        // Monotonically non-increasing low
    uint256 trailingExitPrice;      // Exit trigger = lowestWick * (1 + tau)
}

struct SentinelNode {
    address operator;
    uint256 bondedAmount;           // Staked $AEGIS tokens (scaled 1e18)
    bool isActive;                  // True if bond >= 25,000 $AEGIS
    uint32 successfulHedges;
    uint16 slashCount;
}

// Custom Protocol Error Signatures
error InvalidHealthTrigger();
error InsufficientBondAmount();
error SessionKeyExpired();
error UnauthorizedCaller();
error SlippageExceeded();
error OverrideActive();
error ZeroAddress();
error PrecompileReadFailed(uint32 perpIndex);
error PredeployWriteFailed();
error SlashExceedsMaxBound();
error UnauthorizedSessionKey();
error IntentExpired();
```

---

## 6. Mathematical Formulas & Quant Specifications

Implement these equations with zero deviation across contracts, keeper, and frontend:

### 6.1 Health Factor ($H$)
$$H = \frac{Q_{\text{collateral}} \cdot P_{\text{collateral}} \cdot T}{D_{\text{total}}}$$
- $Q_{\text{collateral}}$: Collateral token balance (scaled 1e18).
- $P_{\text{collateral}}$: Mark price obtained via `0x0801` (scaled 1e8).
- $T$: Maintenance liquidation threshold (e.g. $0.80 = 80\% = 8000\text{ bps}$).
- $D_{\text{total}}$: Borrowed debt liability in USDC (scaled 1e6).
- **Liquidation Condition**: $H \le 1.00$.
- **Trigger Breach**: $(H \le H_{\text{trigger}}) \lor (P_{\text{collateral}} \le P_{\text{trigger}})$.

### 6.2 Short Hedge Sizing ($Q_{\text{hedge}}$)
$$Q_{\text{hedge}} = \gamma \cdot \frac{D_{\text{total}} - (Q_{\text{collateral}} \cdot P_{\text{current}} \cdot T)}{P_{\text{perp}} \cdot (1 - T)}$$
- Full delta-neutral lock ($\gamma = 1.00$):
  $$Q_{\text{hedge}} = Q_{\text{collateral}}$$
- Partial hedging ($\gamma \in [0.25, 0.50]$): Opens only the exact short position required to sustain post-hedge health factor $H \ge 1.15$.

### 6.3 Trailing Take-Profit & Unwind Equation
While a short hedge is active, the Sentinel records:
$$P_{\text{lowest}} = \min(P_{\text{lowest}}, P_{\text{current}})$$
The dynamic profit-take exit trigger is:
$$P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$$
- $\tau$: User-configured tolerance (e.g. $\tau = 0.015$ for $1.5\%$).
- When $P_{\text{current}} \ge P_{\text{exit}}$, Sentinel executes buy-to-close on HyperCore via `0x0802`.
- Realized cash profit:
  $$\text{Realized Cash Profit} = Q_{\text{hedge}} \cdot (P_{\text{entry}} - P_{\text{exit}})$$
- Averted liquidation fee assessed:
  $$\text{Fee}_{\text{protocol}} = 0.10 \cdot (0.05 \cdot \text{Collateral Valuation})$$

---

## 7. Step-by-Step Implementation Sequence

Execute following this strict dependency chain. Run the stated test commands at each verification checkpoint.

---

### Step 1: Foundation Scaffolding & Core Types
**Target Files:**
- `foundry.toml`
- `remappings.txt`
- `contracts/AegisTypes.sol`

**Instructions:**
1. Populate `foundry.toml` with the Cancun/via_ir configuration from §4.1.
2. Populate `remappings.txt` from §4.2.
3. Write `contracts/AegisTypes.sol` containing all enums, packed structs, and errors from §5.

**Verification Checkpoint:**
```bash
forge build
```
*Expected: 0 errors, 0 warnings.*

---

### Step 2: HyperCore Precompile Adapters & Test Mocks
**Target Files:**
- `contracts/adapters/HyperCoreOracleAdapter.sol`
- `contracts/interfaces/IHyperCoreWriter.sol`
- `test/mocks/MockHyperCorePrecompile.sol`
- `test/mocks/MockHyperCoreWriter.sol`
- `test/mocks/MockERC20.sol`

**Instructions:**
1. Implement `HyperCoreOracleAdapter.sol` using inline assembly `staticcall` to query `0x0801`.
2. Implement `MockHyperCorePrecompile.sol` allowing test harnesses to set synthetic mark prices (`setMockPrice(uint32,uint256)`).
3. Implement `MockHyperCoreWriter.sol` recording received orders from `0x0802`.
4. Implement standard mintable `MockERC20.sol` (6 decimals for USDC, 18 for HYPE and AEGIS).

**Verification Checkpoint:**
```bash
forge test
```
*Expected: Compiles cleanly with 0 failures.*

---

### Step 3: Sentinel Registry & Bond Escrow Contract
**Target Files:**
- `contracts/interfaces/IAegisSentinelRegistry.sol`
- `contracts/AegisSentinelRegistry.sol`
- `test/unit/SentinelRegistry.t.sol`

**Instructions:**
1. Implement `bondStake(uint256 amount)`: requires `amount >= 25,000 * 1e18`, transfers tokens via `SafeERC20`, activates node.
2. Implement `unstake(uint256 amount)`: verifies remaining bond $\ge 25,000 \times 10^{18}$.
3. Implement `exitSentinel()`: full unbond and deactivation.
4. Implement `slashSentinel(address operator, address victim, uint256 slashBps, string calldata reason)`:
   - **Enforce Invariant INV-2**: `slashBps <= 1000` (max 10%).
   - Deduct `(bondedAmount * slashBps) / 10000` and transfer directly to `victim` wallet.
   - Deactivate node if remaining bond drops below 25,000 tokens.
5. Write unit tests in `test/unit/SentinelRegistry.t.sol` verifying minimum bond, slashing cap, and victim payout.

**Verification Checkpoint:**
```bash
forge test --match-contract SentinelRegistryTest
```
*Expected: All unit tests pass.*

---

### Step 4: Fee Collector & 50/50 Flywheel Engine
**Target Files:**
- `contracts/interfaces/IAscendHookPool.sol`
- `contracts/interfaces/IAegisFeeCollector.sol`
- `contracts/AegisFeeCollector.sol`
- `test/mocks/MockAscendHookPool.sol`
- `test/unit/FeeCollector.t.sol`

**Instructions:**
1. Implement `processAvertedFee(address vaultOwner, uint256 savedPenaltyAmount)`:
   - Calculates 10% fee in USDC.
   - Divides into exactly 50% buyback budget and 50% yield budget (**Invariant INV-4**).
2. Implement `executeBuybackAndBurn()`:
   - Swaps USDC budget for `$AEGIS` on Ascend Hook Pool.
   - Transfers `$AEGIS` to `0x000000000000000000000000000000000000dEaD`.
3. Implement `distributeYield()` distributing USDC to stakers.
4. Write unit tests in `test/unit/FeeCollector.t.sol` asserting exact 50/50 split, zero rounding leakage, and dead-address transfers.

**Verification Checkpoint:**
```bash
forge test --match-contract FeeCollectorTest
```
*Expected: All unit tests pass.*

---

### Step 5: Trade-Only Session Key Intent Executor
**Target Files:**
- `contracts/core/TradeIntentExecutor.sol`

**Instructions:**
1. Inherit OpenZeppelin `EIP712("AEGIS Protocol", "1.0.0")`.
2. Define `HEDGE_INTENT_TYPEHASH = keccak256("HedgeIntent(address vault,uint32 perpIndex,int256 size,uint256 limitPrice,uint256 nonce,uint256 deadline)")`.
3. Implement `_verifyAndDispatch()`:
   - Verify `block.timestamp <= deadline`.
   - Increment nonce `vaultNonces[vaultOwner]++` (**Invariant INV-5**).
   - Recover signer via `ECDSA.recover(digest, signature)`.
   - Revert if signer $\neq$ authorized session key (**Invariant INV-1**).
   - Dispatch order call to `0x0802`.

**Verification Checkpoint:**
```bash
forge build
```
*Expected: Clean build with 0 errors.*

---

### Step 6: Primary Vault Contract & Lifecycle Engine
**Target Files:**
- `contracts/interfaces/IAegisVault.sol`
- `contracts/AegisVault.sol`
- `test/unit/AegisVault.t.sol`

**Instructions:**
1. Inherit `TradeIntentExecutor`, `ReentrancyGuardUpgradeable`, `Ownable`.
2. Implement `registerPosition(address collateralToken, uint256 amount, uint256 debtUsdc, uint16 ltvBps)`.
3. Implement `setProConfig(ProConfig calldata config)`:
   - Validate bounds: `hedgeRatioBps` $\in [1000, 10000]$, `healthFactorTrigger` $\in [10200, 13000]$, `maxSlippageBps` $\in [10, 100]$.
4. Implement `delegateSessionKey(address key, uint48 duration)`.
5. Implement `executeHedgeIntent()`:
   - Read mark price from `HyperCoreOracleAdapter`.
   - Compute health factor $H$; verify trigger breach.
   - Verify session key signature via `_verifyAndDispatch()`.
   - Update `activeHedges[vaultOwner]`.
6. Implement `manualOverride()` (**Invariant INV-3**):
   - Atomically set `manualOverrideActive = true` and revoke session key in a single transaction.

**Verification Checkpoint:**
```bash
forge test --match-contract AegisVaultTest
```
*Expected: All unit tests pass.*

---

### Step 7: Formal Invariant Fuzzing Suite (INV-1 through INV-5)
**Target Files:**
- `test/invariants/InvariantCustody.t.sol`
- `test/invariants/InvariantSlashing.t.sol`
- `test/invariants/InvariantOverride.t.sol`
- `test/invariants/InvariantFeeSplit.t.sol`
- `test/invariants/InvariantNonce.t.sol`
- `test/invariants/handlers/VaultHandler.sol`

**Instructions:**
Implement stateful Foundry invariant test harnesses:
1. `InvariantCustody`: Proves Sentinel has 0 token allowance and contract balance strictly equals user deposits (**INV-1**).
2. `InvariantSlashing`: Proves slashed bond $\le 10\%$ of active stake and recipient is victim (**INV-2**).
3. `InvariantOverride`: Proves calling `manualOverride()` instantly blocks all subsequent keeper calls (**INV-3**).
4. `InvariantFeeSplit`: Proves `feesCaptured == burnedFees + yieldFees` (zero unallocated leakage, **INV-4**).
5. `InvariantNonce`: Proves nonces strictly increment monotonically with zero replay (**INV-5**).

**Verification Checkpoint:**
```bash
forge test --match-contract Invariant --fuzz-runs 10000
```
*Expected: 10,000+ fuzz runs with 0 invariant violations.*

---

### Step 8: Differential Margin Math Fuzzing
**Target Files:**
- `test/fuzz/MarginMathFuzz.t.sol`

**Instructions:**
Implement property-based tests verifying:
- $H$ monotonicity against decreasing price $P$.
- $Q_{\text{hedge}}$ correctly establishes delta-neutral coverage for $\gamma = 1.00$.
- $P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$ strictly exceeds $P_{\text{lowest}}$ for all $\tau > 0$.

**Verification Checkpoint:**
```bash
forge test --match-contract MarginMathFuzz
```
*Expected: 5,000+ runs with 0 errors.*

---

### Step 9: Sentinel Keeper Daemon (`@aegis/sentinel`)
**Target Files:**
- `keeper/package.json`
- `keeper/tsconfig.json`
- `keeper/src/config.ts`
- `keeper/src/telemetry.ts`
- `keeper/src/risk_engine.ts`
- `keeper/src/trailing_tracker.ts`
- `keeper/src/order_signer.ts`
- `keeper/src/index.ts`

**Instructions:**
1. Setup Node.js project in `keeper/` using locked dependencies from §4.4.
2. Implement `config.ts` parsing `.env` using Zod validation.
3. Implement `telemetry.ts` connecting to Elysium WebSocket, receiving 100ms blocks.
4. Implement `risk_engine.ts` evaluating $H$ and $Q_{\text{hedge}}$ via the exact formulas in §6.
5. Implement `trailing_tracker.ts` recording $P_{\text{lowest}}$ and evaluating $P_{\text{current}} \ge P_{\text{lowest}} \cdot (1 + \tau)$.
6. Implement `order_signer.ts` creating EIP-712 typed signatures using delegated session keys.
7. Wire orchestrator loop in `index.ts`.

**Verification Checkpoint:**
```bash
cd keeper && npm run build
```
*Expected: TypeScript compiles cleanly to `dist/` with 0 errors.*

---

### Step 10: Pro-Trader Terminal Refactoring (`app/`)
**Target Files:**
- `app/styles.css`
- `app/index.html`
- `app/app.js`

**Instructions:**
1. In `app/styles.css`:
   - Import `brand/kit/tokens.css`.
   - Remove ALL hardcoded hex colors (`#00F2FE`, `#8B5CF6`, `#0A0D14`).
   - Replace with `var(--ground)`, `var(--raised)`, `var(--ink)`, `var(--accent)`, `var(--hedge)`, `var(--danger)`.
   - Enforce 16px border-radius and 1px `var(--rule)` borders. Remove all neon glows.
2. In `app/index.html`:
   - Enforce Marcellus display headings and Inter body text.
   - Insert official 3-blade SVG logo from `brand/kit/aegis-brand-kit.html`.
   - Verify responsive layout with zero horizontal overflow at 390px mobile width.
3. In `app/app.js`:
   - Wire simulation bar (-18% crash, retracement, reset) to mathematical models in §6.
   - Implement EIP-1193 `connectWallet()` requesting accounts on Chain ID `99801`.
   - Implement dynamic SVG health factor gauge rendering Danger, Warning, and Safe zones.

**Verification Checkpoint:**
```bash
node app/serve.js
```
*Expected: Open http://localhost:3000/ — terminal renders in Light and Dark mode using brand kit tokens; simulator buttons update live telemetry.*

---

### Step 11: Deployment Pipeline & End-to-End Smoke Test
**Target Files:**
- `script/DeployAegis.s.sol`
- `test/integration/EndToEndFlow.t.sol`

**Instructions:**
1. Implement `DeployAegis.s.sol` orchestrating deployment of `AegisFeeCollector`, `AegisSentinelRegistry`, and `AegisVault`.
2. Implement `EndToEndFlow.t.sol` verifying the complete lifecycle:
   - Deposit collateral $\rightarrow$ simulate crash $\rightarrow$ keeper triggers short hedge $\rightarrow$ price bounces $\rightarrow$ hedge unwound with profit $\rightarrow$ 10% fee split 50/50 $\rightarrow$ vault health restored ($H > 1.25$).

**Verification Checkpoint:**
```bash
forge test --match-contract EndToEndFlow -vvv
```
*Expected: Complete integration scenario passes with 100% success.*

---

## 8. Formal Invariant Verification Matrix

| Invariant | Property Name | Mathematical Guarantee | Verified In |
| :---: | :--- | :--- | :--- |
| **INV-1** | **Non-Custodial Boundary** | Sentinel allowance $= 0$; contract cannot initiate collateral transfers to unauthorized addresses. | `test/invariants/InvariantCustody.t.sol` |
| **INV-2** | **Slashing Bounds** | $\text{Slashed Amount} \le 0.10 \cdot \text{Bond}$; funds transfer directly to affected user. | `test/invariants/InvariantSlashing.t.sol` |
| **INV-3** | **Instant Manual Override** | `manualOverride()` atomically terminates Sentinel authority in the same transaction block. | `test/invariants/InvariantOverride.t.sol` |
| **INV-4** | **Fee Conservation** | $\text{Fees Captured} \equiv \text{Burned Amount} + \text{Yield Distributed}$; zero leakage. | `test/invariants/InvariantFeeSplit.t.sol` |
| **INV-5** | **Monotonic Nonces** | Nonces increment sequentially per vault: $\text{Nonce}_{n+1} = \text{Nonce}_n + 1$; zero replay capability. | `test/invariants/InvariantNonce.t.sol` |

---

## 9. Brand Kit & UI Compliance Rules

Any agent modifying or authoring UI code must adhere to these inviolable rules:
1. **Source of Truth**: Read `brand/kit/aegis-brand-kit.html` and import `brand/kit/tokens.css`.
2. **Tokens Only**: Never use hardcoded hex or RGB colors in components. Use `var(--ground)`, `var(--raised)`, `var(--ink)`, `var(--ink-2)`, `var(--rule)`, `var(--accent)`, `var(--on-accent)`, `var(--hedge)`, `var(--danger)`, `var(--violet)`.
3. **Dual-Theme**: Every UI component must render cleanly in both Light and Dark themes. Follow `:root` (light) and `:root[data-theme="dark"]` / `@media (prefers-color-scheme: dark)` patterns.
4. **Typography**: Display headings use **Marcellus** (`--display`). Body and numbers use **Inter** (`--text`). Headings use `text-wrap: balance`.
5. **Surfaces**: 16px border-radius, 1px `var(--rule)` borders, `var(--raised)` background. Zero glows or neon drop shadows.
6. **Mobile Gutter**: 16px minimum side gutter; zero horizontal page scroll at 390px phone width.
7. **Open Brand Items**: Follow the kit as written for unresolved brand items (wordmark case "Aegis" vs "AEGIS", and navy on white). Do not pick a side; flag the open question.

---

## 10. Autonomous Agent Execution & Reporting Protocol

When executing the steps above, the autonomous coding agent must follow this protocol:
1. **Sequential Execution**: Execute steps in strict order (1 through 11). Never skip dependency stages.
2. **Local Verification**: Run the verification command for each step immediately after writing the files. Never proceed if a step fails.
3. **Honest Reporting**:
   - Report the exact CLI command executed and its output.
   - Never fabricate test passes or mock success. If a test fails, state the exact error message and file line.
   - Distinguish verified local assertions from external network assumptions.
4. **Git Privacy Boundary**:
   - `PROMPT.md` must remain in `.gitignore`.
   - Never commit, push, or publish sensitive prompt files or environment files (`.env`).
   - Do not publish code to public remotes without explicit authorization.

---

## 11. Final Master Acceptance Checklist

Before declaring the protocol implementation fully complete, verify:
- [ ] `foundry.toml` and `remappings.txt` properly configured and active.
- [ ] `forge build` compiles all contracts (`contracts/`) with 0 errors and 0 warnings.
- [ ] `forge test` passes 100% of unit, fuzz, and invariant test suites.
- [ ] Stateful invariant tests for INV-1 through INV-5 execute 10,000+ runs with 0 violations.
- [ ] `cd keeper && npm run build` compiles TypeScript keeper daemon cleanly to `dist/`.
- [ ] Terminal UI (`app/`) runs on `http://localhost:3000/`, renders in Light and Dark mode using brand tokens, and has zero horizontal scroll at 390px.
- [ ] End-to-end integration test (`EndToEndFlow.t.sol`) validates the full lifecycle (deposit $\rightarrow$ crash $\rightarrow$ short hedge $\rightarrow$ bounce $\rightarrow$ unwind $\rightarrow$ 50/50 fee capture).
