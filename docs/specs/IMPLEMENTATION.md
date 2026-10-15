# AEGIS Protocol — Implementation Plan

> **Technical Blueprint & Engineering Architecture**  
> Document Version: 1.0.0  
> Status: Draft — Phase 2 Blueprint  
> Derived From: [`SPECIFICATION.md`](file:///c:/Users/ascend%20X%20elysium/SPECIFICATION.md)  
> Target Tooling: Solidity `0.8.24`, Foundry (`forge`), Node.js v20+ / TypeScript (`@aegis/sentinel`), Vanilla ES6 Web3 Terminal

---

## 1. Tech Stack & Engineering Decisions

### 1.1 Stack Summary

| Layer | Technology | Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Smart Contracts** | Solidity | `0.8.24` | Native support for transient storage (`TSTORE`/`TLOAD`), custom errors, and EVM Shanghai/Cancun opcodes on Elysium L2. |
| **Contract Toolchain** | Foundry (`forge`) | Latest (`>=0.2.0`) | Blazing fast compilation, native Solidity unit/fuzz testing, stateful invariant testing for INV-1 through INV-5 without JS middleware lag. |
| **Contract Libraries** | OpenZeppelin Contracts | `v5.0.2` | Battle-tested primitives: `ReentrancyGuardUpgradeable`, `SafeERC20`, `ECDSA`, `EIP712`. |
| **Precompiles / L2 Hooks** | Elysium L2 Hooks | `0x0801` / `0x0802` | Synchronous zero-gas orderbook read (`0x0801`) and sub-100ms intent execution (`0x0802`) into HyperCore L1. |
| **Sentinel Keeper** | Node.js / TypeScript | Node `v20.x`, TS `5.4.x` | High-throughput asynchronous event loops, sub-10ms JSON-RPC parsing, native WebSocket multiplexing. |
| **Keeper Web3 Lib** | `ethers.js` / `viem` | `ethers v6.12` / `viem v2.x` | Robust EIP-712 signing, high-frequency contract call encoding, automatic connection reconnects. |
| **Pro-Trader Frontend** | Vanilla HTML5 + ES6 JS | Standard ES2023 | Lightweight, zero-build, instantly auditable, embeddable, sub-millisecond initial load, zero React/Next dependency bloat. |
| **UI Design System** | Vanilla CSS Tokens | `brand/kit/tokens.css` | 100% compliance with AEGIS brand kit: dual-theme (Light/Dark), Marcellus/Inter fonts, 16px flat panels, zero hardcoded hex. |
| **Testing / CI** | Forge Test + GitHub Actions | — | Automated invariant fuzzing (10,000+ runs per PR), gas reports, linting via `solhint` and `prettier`. |

---

### 1.2 Key Architectural Decisions (ADR-Lite)

#### Decision 1: Foundry over Hardhat for Smart Contract Engineering
- **Context**: AEGIS protocol relies on 5 formal system invariants (INV-1 to INV-5) that must be mathematically verified against reentrancy, malicious input, and flash-crash wicks.
- **Options Considered**:
  1. *Hardhat / TypeScript*: Rich plugin ecosystem, familiar JavaScript tooling, but slow test execution and limited property-based fuzzing.
  2. *Foundry (`forge`)*: Native Solidity testing, fast execution (Rust-based), advanced stateful invariant testing (`invariant_*`), and cheatcodes (`vm.warp`, `vm.prank`, `vm.mockCall`).
- **Choice**: **Foundry (`forge`)**.
- **Rationale**: Invariant testing in Solidity allows fuzzing thousands of random trade sequences per second, ensuring invariants like fee conservation (INV-4) and non-custodial boundaries (INV-1) hold across millions of randomized state transitions.
- **Consequences**: Developers write test harnesses in Solidity rather than TypeScript.

#### Decision 2: EVM Precompile `0x0801` for Synchronous Telemetry
- **Context**: Traditional oracles (Chainlink, Pyth) update every few seconds or minutes and cost substantial gas, making sub-100ms health factor monitoring impossible.
- **Options Considered**:
  1. *Push Oracles (Chainlink/Pyth)*: High latency (1–10s), gas cost per update, stale during sudden wicks.
  2. *Elysium Precompile `0x0801`*: Direct zero-gas synchronous read from HyperCore L1 memory (~70ms latency).
- **Choice**: **Precompile `0x0801`**.
- **Rationale**: Allows on-chain contracts and keeper nodes to read live mid-prices, mark prices, and depth atomically within the transaction evaluation loop at zero marginal gas cost.
- **Consequences**: Contracts rely on Elysium L2 architecture; mock harnesses required for local testing.

#### Decision 3: Trade-Only Session Keys over Contract Collateral Custody
- **Context**: In traditional DeFi, users transfer collateral directly into the protocol's vault contracts, introducing smart contract custody risk (reentrancy, drain hacks).
- **Options Considered**:
  1. *Custodial Protocol Vaults*: Complete asset lockup inside protocol contracts.
  2. *Trade-Only Delegated Session Keys*: Collateral remains in the user's account or lending market. Users delegate limited authority strictly to call `placeLimitOrder()` and `cancelOrder()` via `0x0802`.
- **Choice**: **Trade-Only Delegated Session Keys (Invariant INV-1)**.
- **Rationale**: Eliminates the catastrophic risk of total protocol collateral drain. Even if Sentinel nodes or contracts were compromised, malicious actors have zero mathematical ability to transfer user assets.
- **Consequences**: Requires careful cryptographic verification of session key expiration and order payloads.

#### Decision 4: Lightweight Vanilla Architecture for Pro-Trader Terminal
- **Context**: Pro traders require instantaneous boot times, high rendering frame rates (60 FPS DOM updates), and simple hosting without complex Node.js build pipelines.
- **Options Considered**:
  1. *Next.js / React SSR*: Heavy bundle size (300KB+), hydrated state overhead, frequent dependency breaking changes.
  2. *Vanilla HTML5 / CSS / ES6 JS*: Sub-50KB total payload, zero build steps, direct DOM binding, native CSS variable token switching.
- **Choice**: **Vanilla HTML5 / CSS / ES6 JavaScript**.
- **Rationale**: Perfectly aligns with the existing AEGIS code structure (`index.html`, `docs/`, `app/`), complies with `AGENTS.md`, and runs directly in any browser or local daemon.
- **Consequences**: DOM updates are managed manually via helper rendering functions rather than virtual DOM diffing.

---

### 1.3 Dependency Inventory

| Package / Repository | Purpose | License | Justification |
| :--- | :--- | :--- | :--- |
| `foundry-rs/forge-std` | Testing framework, assertions, cheatcodes | MIT / Apache-2.0 | Standard testing library for Foundry projects. |
| `OpenZeppelin/openzeppelin-contracts` | Safe math, ReentrancyGuard, EIP-712 | MIT | Industry-standard security primitives; prevents reinventing cryptographic hashes. |
| `ethers` (v6.12.0) | Keeper node JSON-RPC & EIP-712 signer | MIT | Robust, lightweight library for node interaction. |
| `ws` (v8.16.0) | High-speed WebSocket client | MIT | Sub-millisecond Elysium block and ticker listener. |
| `dotenv` (v16.4.5) | Environment variable management | BSD-2-Clause | Standard for local keeper configuration. |

---

## 2. Design Patterns & Applied Domain Sketches

Consulting the Project Architect design patterns catalog, the following 6 core patterns are implemented:

### 2.1 Pattern 1: Precompile Adapter Pattern (`HyperCoreOracleAdapter`)
- **Why**: Decouples `AegisVault.sol` from the low-level EVM staticcall semantics of precompile `0x0801`. Enables seamless mocking during Foundry unit tests.
- **Application**: The adapter queries `0x0801` via inline assembly / `staticcall`, decodes market parameters, and provides clean revert handling if the precompile is unreachable.

```solidity
// contracts/adapters/HyperCoreOracleAdapter.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library HyperCoreOracleAdapter {
    address internal constant PRECOMPILE_0x0801 = address(0x0801);

    struct MarketData {
        uint256 markPrice;      // Scaled 1e8
        uint256 indexPrice;     // Scaled 1e8
        int256 fundingRate;     // Scaled 1e8
        uint256 lastUpdated;
    }

    function getPerpPrice(uint32 perpIndex) internal view returns (uint256 markPrice) {
        bytes memory payload = abi.encodeWithSelector(0x3a4b9c1d, perpIndex);
        (bool success, bytes memory returnData) = PRECOMPILE_0x0801.staticcall(payload);
        if (!success || returnData.length < 32) {
            revert PrecompileReadFailed(perpIndex);
        }
        return abi.decode(returnData, (uint256));
    }

    error PrecompileReadFailed(uint32 perpIndex);
}
```

---

### 2.2 Pattern 2: Trade-Only Session Key Intent Executor
- **Why**: Enforces Invariant **INV-1 (Non-Custodial)**. Validates that orders executed by Sentinels match the user's authorized session key and call strictly `0x0802` trading methods without balance transfer rights.
- **Application**: Verifies EIP-712 structured signatures and dispatches trade intents.

```solidity
// contracts/core/TradeIntentExecutor.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

abstract contract TradeIntentExecutor is EIP712 {
    bytes32 internal constant HEDGE_INTENT_TYPEHASH = keccak256(
        "HedgeIntent(address vault,uint32 perpIndex,int256 size,uint256 limitPrice,uint256 nonce,uint256 deadline)"
    );

    address internal constant ELYSIUM_WRITER_0x0802 = address(0x0802);

    mapping(address => uint256) public vaultNonces;

    function _verifyAndDispatch(
        address vaultOwner,
        address delegatedKey,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        if (block.timestamp > deadline) revert IntentExpired();

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            HEDGE_INTENT_TYPEHASH,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            vaultNonces[vaultOwner]++,
            deadline
        )));

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != delegatedKey) revert UnauthorizedSessionKey();

        // Dispatch directly to 0x0802 sub-second intent lane
        (bool success, ) = ELYSIUM_WRITER_0x0802.call(
            abi.encodeWithSignature("submitOrder(address,uint32,int256,uint256)", vaultOwner, perpIndex, size, limitPrice)
        );
        if (!success) revert PredeployWriteFailed();
    }

    error IntentExpired();
    error UnauthorizedSessionKey();
    error PredeployWriteFailed();
}
```

---

### 2.3 Pattern 3: State Machine for Hedge Lifecycle
- **Why**: Models the transitions between vault safety states cleanly: `SAFE` $\rightarrow$ `ARMED` $\rightarrow$ `HEDGING` $\rightarrow$ `UNWINDING` $\rightarrow$ `RESTORED`.
- **Application**: Implemented in `AegisVault.sol` to ensure state updates execute monotonically.

```solidity
// State Machine definition
enum VaultState {
    STANDBY,    // Health Factor > Trigger threshold; no hedge
    ARMED,      // Health Factor nearing trigger; Sentinel standing by
    HEDGED,     // Short hedge active on HyperCore L1
    UNWOUND,    // Hedge closed; cash profit locked
    OVERRIDDEN  // Emergency manual override active; automation disabled
}
```

---

### 2.4 Pattern 4: Slashing & Bond Escrow Pattern
- **Why**: Enforces Invariant **INV-2 (Slashing Bounds)** and guarantees Sentinel accountability.
- **Application**: Tracks bonded balances, bounds slashing to active stakes, and routes slashed tokens directly to affected victims.

```solidity
// contracts/core/AegisSentinelRegistry.sol snippet
function slashSentinel(address operator, address victim, uint256 slashBps, string calldata reason) external onlyOwner {
    if (slashBps > 1000) revert SlashExceedsMaxBound(); // Max 10% per slash (INV-2)
    uint256 activeBond = nodes[operator].bondedAmount;
    uint256 slashAmount = (activeBond * slashBps) / 10000;
    
    nodes[operator].bondedAmount = activeBond - slashAmount;
    if (nodes[operator].bondedAmount < MIN_BOND) {
        nodes[operator].isActive = false;
    }
    
    aegisToken.safeTransfer(victim, slashAmount); // Slashed bond compensates victim directly
    emit SentinelSlashed(operator, victim, slashAmount, reason);
}
```

---

### 2.5 Pattern 5: Trailing Wick Tracker (Off-Chain Sentinel Engine)
- **Why**: Calculates the lowest wick price dynamically to determine profit-lock exit triggers ($P_{\text{lowest}} \cdot (1 + \tau)$).
- **Application**: Implemented in `@aegis/sentinel` keeper loop.

```typescript
// keeper/src/trailing_tracker.ts
export class TrailingWickTracker {
  private lowestPrice: number;
  private readonly tolerancePct: number;

  constructor(entryPrice: number, tolerancePct: number) {
    this.lowestPrice = entryPrice;
    this.tolerancePct = tolerancePct;
  }

  public updatePrice(currentPrice: number): { shouldUnwind: boolean; exitTrigger: number } {
    if (currentPrice < this.lowestPrice) {
      this.lowestPrice = currentPrice;
    }
    const exitTrigger = this.lowestPrice * (1 + this.tolerancePct);
    const shouldUnwind = currentPrice >= exitTrigger;
    return { shouldUnwind, exitTrigger };
  }
}
```

---

### 2.6 Pattern 6: Observer Pattern for WebSocket Telemetry
- **Why**: Handles incoming 100ms Elysium block headers and HyperCore orderbook feeds asynchronously without blocking order execution threads.
- **Application**: Sentinel keeper subscribes to ticker channels and fans out state checks to the risk computation engine.

---

## 3. Project Structure & Directory Layout

### 3.1 Complete Concrete Directory Tree

```
aegis/
├── contracts/                        # Core Solidity Smart Contracts (Foundry)
│   ├── AegisTypes.sol                # Enums, Data Structs (VaultPosition, ProConfig), Custom Errors
│   ├── AegisVault.sol                # Vault management, ProConfig, Session keys, manualOverride()
│   ├── AegisSentinelRegistry.sol     # 25,000 $AEGIS bonding, node status, 10% SLA slashing
│   ├── AegisFeeCollector.sol         # 10% performance fee capture, 50% buyback/burn, 50% yield
│   ├── adapters/
│   │   └── HyperCoreOracleAdapter.sol# Wrapper for 0x0801 precompile queries
│   └── interfaces/
│       ├── IAegisVault.sol           # External interface for AegisVault
│       ├── IAegisSentinelRegistry.sol# External interface for Registry
│       ├── IAegisFeeCollector.sol    # External interface for FeeCollector
│       └── IHyperCoreWriter.sol      # Interface for 0x0802 predeploy
│
├── test/                             # Foundry Test Suite
│   ├── unit/
│   │   ├── AegisVault.t.sol          # Vault deposit, parameter setting, override tests
│   │   ├── SentinelRegistry.t.sol    # Staking, unstaking, SLA violation tests
│   │   └── FeeCollector.t.sol        # 50/50 fee routing & buyback-burn tests
│   ├── invariants/
│   │   ├── InvariantCustody.t.sol    # Formal fuzz test: Invariant INV-1 (Non-Custodial)
│   │   ├── InvariantSlashing.t.sol   # Formal fuzz test: Invariant INV-2 (Slashing bounds)
│   │   ├── InvariantOverride.t.sol   # Formal fuzz test: Invariant INV-3 (Instant override)
│   │   ├── InvariantFeeSplit.t.sol   # Formal fuzz test: Invariant INV-4 (Fee conservation)
│   │   └── InvariantNonce.t.sol      # Formal fuzz test: Invariant INV-5 (Monotonic nonces)
│   ├── fuzz/
│   │   └── MarginMathFuzz.t.sol      # Differential fuzzing for Health Factor H & sizing gamma
│   └── mocks/
│       ├── MockHyperCorePrecompile.sol # Simulates 0x0801 return payloads in local tests
│       ├── MockHyperCoreWriter.sol     # Simulates 0x0802 predeploy order capture
│       ├── MockERC20.sol               # Test tokens (HYPE, USDC, AEGIS)
│       └── MockAscendHookPool.sol      # Simulates Ascend Closed Hook Pool buyback & burn
│
├── script/                           # Foundry Deployment & Interaction Scripts
│   ├── DeployAegis.s.sol             # Production deployment pipeline for Elysium L2
│   └── SeedMockEnvironment.s.sol     # Local devnet test seeding
│
├── keeper/                           # Sentinel Node Daemon (@aegis/sentinel)
│   ├── src/
│   │   ├── index.ts                  # Daemon entry point & process orchestrator
│   │   ├── telemetry.ts              # 0x0801 WebSocket listener & block monitor
│   │   ├── risk_engine.ts            # Mathematical model evaluator (H, gamma, trigger check)
│   │   ├── trailing_tracker.ts       # Bottom wick tracker & profit-take calculator
│   │   ├── order_signer.ts           # EIP-712 signer using session key
│   │   └── config.ts                 # Environment parser & RPC provider setup
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                    # Containerization for high-availability node operators
│
├── app/                              # Pro-Trader Web Terminal (Vanilla Client)
│   ├── index.html                    # Main terminal DOM layout (Dual-theme, 16px flat cards)
│   ├── styles.css                    # 100% tokenized styles importing brand/kit/tokens.css
│   ├── app.js                        # State engine, simulation bar, Web3 wallet provider hooks
│   └── serve.js                      # Node.js local preview server (port 3000)
│
├── docs/                             # Full Technical Documentation Platform
│   ├── index.html
│   ├── docs.css
│   └── docs.js
│
├── brand/                            # Brand Identity & Design System Standards
│   ├── kit/
│   │   ├── aegis-brand-kit.html      # Living brand kit specification
│   │   └── tokens.css                # Mandatory CSS custom properties
│   └── x/                            # Social headers, profile avatars, banners
│
├── foundry.toml                      # Foundry build, compiler & RPC configuration
├── SPECIFICATION.md                  # Project Architect System Specification (Phase 1)
├── IMPLEMENTATION.md                 # Project Architect Implementation Plan (Phase 2)
├── DESIGN.md                         # Architecture & Mathematical Models
├── STATUS.md                         # Workspace Progress Log
├── MEMORY.md                         # Session State & Endpoints
└── README.md                         # Repository Overview
```

---

### 3.2 Module Breakdown & Responsibilities

| Module | Location | Primary Responsibility | Key Files |
| :--- | :--- | :--- | :--- |
| **Contracts Core** | `contracts/` | Enforces on-chain vault rules, session keys, fee routing, and bonding. | `AegisVault.sol`, `AegisSentinelRegistry.sol`, `AegisFeeCollector.sol` |
| **Foundry Invariant Suite** | `test/invariants/` | Runs continuous fuzzing to mathematically verify invariants INV-1 to INV-5. | `InvariantCustody.t.sol`, `InvariantFeeSplit.t.sol` |
| **Sentinel Keeper** | `keeper/` | Off-chain node monitoring 100ms blocks, computing Greeks, and dispatching 0x0802 intents. | `index.ts`, `risk_engine.ts`, `order_signer.ts` |
| **Pro-Trader Terminal** | `app/` | Client-side trading interface for vault owners to monitor health and manage parameters. | `index.html`, `styles.css`, `app.js` |
| **Brand System** | `brand/kit/` | Single source of truth for color tokens, typography, and surface rules. | `tokens.css`, `aegis-brand-kit.html` |

---

## 4. Smart Contract Data Layer & Storage Layout

### 4.1 Storage Optimization in `AegisVault.sol`

To minimize gas costs during high-frequency execution on Elysium, structs are tightly packed into 32-byte slots:

```solidity
// contracts/AegisTypes.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

struct ProConfig {
    uint8 triggerMode;          // 1 byte  (0: PRICE, 1: HEALTH, 2: HYBRID)
    uint8 orderType;            // 1 byte  (0: POST_ONLY, 1: IOC, 2: MARKET)
    uint16 hedgeRatioBps;       // 2 bytes (1000 - 10000)
    uint16 trailingTakeProfitBps;// 2 bytes (50 - 500)
    uint16 maxSlippageBps;      // 2 bytes (10 - 100)
    uint48 sessionKeyExpiry;    // 6 bytes (Unix timestamp, valid up to year 8,000,000)
    bool manualOverrideActive;  // 1 byte
    // Slot 1 remainder: 17 bytes free
    uint256 priceTrigger;       // Slot 2: 32 bytes (scaled 1e8)
    uint256 healthFactorTrigger;// Slot 3: 32 bytes (scaled 1e4)
}

struct VaultPosition {
    address owner;              // 20 bytes
    uint16 liquidationThresholdBps; // 2 bytes (e.g. 8000 = 80%)
    uint48 lastHedgeBlock;      // 6 bytes
    // Slot 1 remainder: 4 bytes free
    address collateralToken;    // 20 bytes
    uint96 collateralAmount;    // 12 bytes (supports up to 79 billion tokens at 1e18)
    // Slot 2 complete: 32 bytes
    uint256 debtAmountUsdc;     // Slot 3: 32 bytes (scaled 1e6)
    address sessionKey;         // Slot 4: 20 bytes
}
```

---

## 5. Core Interface Implementation & Intent Protocol

### 5.1 Precompile `0x0801` Assembly Call
```solidity
function queryHyperCoreMark(uint32 perpIndex) internal view returns (uint256 markPrice) {
    bytes memory input = abi.encodePacked(uint8(0x01), perpIndex);
    bytes memory output = new bytes(32);
    assembly {
        // staticcall(gas, address, argsOffset, argsSize, retOffset, retSize)
        let success := staticcall(gas(), 0x0801, add(input, 32), mload(input), add(output, 32), 32)
        if iszero(success) {
            revert(0, 0)
        }
        markPrice := mload(add(output, 32))
    }
}
```

### 5.2 Predeploy `0x0802` Intent Submission
```solidity
function dispatchTo0x0802(address vault, uint32 perpIndex, int256 size, uint256 limitPrice) internal returns (bool) {
    bytes memory intentPayload = abi.encodeWithSignature(
        "placeHedgeIntent(address,uint32,int256,uint256)",
        vault,
        perpIndex,
        size,
        limitPrice
    );
    (bool success, ) = address(0x0802).call(intentPayload);
    return success;
}
```

---

## 6. Pro-Trader Terminal Implementation (`app/`)

### 6.1 Token Compliance & Zero-Hardcoded Styling
[`app/styles.css`](file:///c:/Users/ascend%20X%20elysium/app/styles.css) will be refactored to import [`brand/kit/tokens.css`](file:///c:/Users/ascend%20X%20elysium/brand/kit/tokens.css) directly:

```css
@import url("../brand/kit/tokens.css");

body {
  background-color: var(--ground);
  color: var(--ink);
  font-family: var(--text);
  margin: 0;
  padding: 0;
}

/* 16px Flat Surface Cards per Brand Kit */
.card, .metric-card {
  background: var(--raised);
  border: 1px solid var(--rule);
  border-radius: 16px;
  padding: 24px;
}

/* Brand Typography */
h1, h2, h3, .brand-title {
  font-family: var(--display);
  font-weight: 400;
}

/* Numerical Data */
.font-mono, .metric-value, .stat-val {
  font-variant-numeric: tabular-nums;
}
```

### 6.2 EIP-1193 Web3 Wallet Provider Integration
[`app/app.js`](file:///c:/Users/ascend%20X%20elysium/app/app.js) implements modular wallet connection:

```javascript
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    alert("Please install Rabby or MetaMask to connect to Elysium L2.");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    updateWalletUI(userAddress);
    loadVaultData(userAddress);
  } catch (err) {
    console.error("Wallet connection rejected:", err);
  }
}
```

---

## 7. Testing Architecture & Invariant Fuzzing

### 7.1 Invariant Verification Suite (`test/invariants/`)

Foundry stateful fuzzing continuously calls contract methods with random values to verify that system invariants never break:

```solidity
// test/invariants/InvariantCustody.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AegisVault} from "../../contracts/AegisVault.sol";

contract InvariantCustodyTest is Test {
    AegisVault public vault;

    function setUp() public {
        vault = new AegisVault();
    }

    // Invariant INV-1: Under no execution sequence can contract or sentinel withdraw user collateral
    function invariant_nonCustodialBalance() public view {
        // Assert vault contract balance of user token is exactly sum of user deposits
        // and sentinel has 0 allowance on token transfer
        assertEq(vault.totalUnauthorizedWithdrawals(), 0, "INV-1 Violation: Custody breached");
    }

    // Invariant INV-4: Performance fees collected must equal sum of burned + yield distributed
    function invariant_feeConservation() public view {
        uint256 feeCaptured = vault.totalFeesCaptured();
        uint256 feeDispatched = vault.totalBurnedFees() + vault.totalYieldDistributed();
        assertEq(feeCaptured, feeDispatched, "INV-4 Violation: Fee leakage detected");
    }
}
```

### 7.2 Running Tests Locally
```bash
# Run all unit tests
forge test

# Run formal invariant fuzzing with 10,000 runs
forge test --match-contract Invariant --fuzz-runs 10000

# View gas benchmarks
forge test --gas-report
```

---

## 8. Sentinel Keeper Daemon Architecture (`keeper/`)

### 8.1 Daemon Processing Loop
```
[Elysium Block Received via WebSocket] (~100ms)
                     |
                     v
   [Query 0x0801 Synchronous Precompile] (~70ms)
                     |
                     v
  [Evaluate H for All Registered Vaults]
          /                     \
    H > Trigger            H <= Trigger
         |                       |
   [Log Heartbeat]        [Compute Short Size Q_hedge]
                                 |
                          [Sign EIP-712 Intent via Session Key]
                                 |
                          [Dispatch to 0x0802 Predeploy]
                                 |
                          [Monitor Fill on HyperCore CLOB]
                                 |
                          [Initialize TrailingWickTracker]
```

### 8.2 Environment Configuration (`keeper/.env`)
```ini
ELYSIUM_RPC_URL="https://rpc.elysium-l2.xyz"
ELYSIUM_WS_URL="wss://ws.elysium-l2.xyz"
HYPERCORE_CHAIN_ID=99801
SENTINEL_OPERATOR_PRIVATE_KEY="0x..."
AEGIS_VAULT_ADDRESS="0x..."
AEGIS_REGISTRY_ADDRESS="0x..."
MAX_GAS_PRICE_GWEI=2.0
```

---

## 9. Deployment Strategy

### 9.1 Elysium L2 Deployment Pipeline (`script/DeployAegis.s.sol`)
1. **Deploy Mock Adapters** (if testnet) or link native `0x0801`/`0x0802` precompiles.
2. **Deploy `AegisFeeCollector.sol`** linked to Ascend Closed Hook Pool router.
3. **Deploy `AegisSentinelRegistry.sol`** with `$AEGIS` token address.
4. **Deploy `AegisVault.sol`** linked to Registry and Fee Collector.
5. **Transfer Ownership** to Elysium multisig timelock.

---

## 10. Implementation Quality Checklist

- [x] Tech stack specifies exact versions and justified trade-offs.
- [x] 6 concrete design patterns documented with domain-specific Solidity/TS code sketches.
- [x] Complete directory structure mapping every future file and module boundary.
- [x] Formal invariant testing strategy documented for INV-1 through INV-5.
- [x] Pro-Trader Terminal refactor specified to achieve 100% compliance with `brand/kit/tokens.css`.
- [x] Sentinel keeper daemon architecture and sub-100ms processing loop documented.
