---
name: "AEGIS Protocol Design System & Architecture Specification"
version: "1.0.0"
archetype: "Cybernetic Pro-Terminal / Modular Bento Grid"
references:
  - name: "Hyperliquid High-Frequency Trading Terminal"
    url: "https://hyperliquid.xyz"
  - name: "Linear Modern Spatial UI"
    url: "https://linear.app"
  - name: "BentoGrids Pro Dashboard Standards"
    url: "https://bentogrids.com"
tokens:
  colors:
    background:
      base: "#0A0D14"
      surface: "rgba(18, 22, 34, 0.75)"
      elevated: "#161B26"
    borders:
      subtle: "rgba(255, 255, 255, 0.08)"
      glow: "rgba(0, 242, 254, 0.35)"
    accent:
      primary: "#00F2FE"
      secondary: "#8B5CF6"
      success: "#10B981"
      warning: "#F59E0B"
      danger: "#EF4444"
  typography:
    fonts:
      heading: "Outfit, -apple-system, sans-serif"
      body: "Inter, -apple-system, sans-serif"
      mono: "JetBrains Mono, monospace"
    weights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
  layout:
    grid: "12-column responsive bento"
    radius:
      card: "14px"
      button: "8px"
      pill: "9999px"
    blur:
      backdrop: "12px"
  motion:
    duration:
      fast: "150ms"
      normal: "250ms"
      slow: "400ms"
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# AEGIS Protocol: Architecture & Design System Specification

Specification Standard: Modern Web & Web3 Systems Engineering  
Target Audience: Senior Backend Engineers, Smart Contract Developers, and Quant Traders  
Scope: Pro Trader & Institutional Risk Engine on Elysium L2 and HyperCore  
Date: October 2026  

---

## 1. Executive Summary & Problem Scope

### 1.1 The Problem
On Hyperliquid and Elysium, leveraged traders, collateralized borrowers, and liquidity pools face sudden market drawdowns. When asset prices crash rapidly:
1. Collateral ratios drop below maintenance thresholds.
2. Third-party liquidation engines seize the collateral, impose severe penalties (5% to 10%), and dump positions at the worst possible market prices.
3. Existing automation on Ethereum or HyperEVM is too slow (1 to 12 second blocks), cannot read order books with zero latency, and relies on dumping spot tokens on AMMs rather than hedging.

### 1.2 The AEGIS Solution
AEGIS is an autonomous, non-custodial risk sentinel and delta-hedging protocol built natively for Elysium L2 and HyperCore.
- Instead of liquidating and selling user collateral, AEGIS opens opposite short perpetual hedges on HyperCore via sub-second execution lanes.
- The user maintains 100% custody of their assets via trade-only session keys that are mathematically blocked from withdrawing capital.
- This specification prioritizes **Tier 1: Institutional & Pro Trader Mode**, granting experienced traders total control over trigger parameters, hedge ratios, trailing profit-taking, and instant manual overrides.
- Automated preset modes (Conservative, Balanced, Aggressive) are documented for Phase 2 implementation in the long-term roadmap.

---

## 2. Core System Architecture

```
[ USER WALLET / VAULT ]
   - Retains custody of capital
   - Delegates trade-only session key to AegisVault
   - Sets custom hedge parameters or triggers manual override
              |
              | Pro-Trader Configuration
              v
[ ELYSIUM L2 SMART CONTRACTS (100-200ms Blocks) ]
   +-------------------------------------------------------------------------+
   | AegisVault.sol: Stores health bands, trigger levels, and margin limits  |
   | AegisSentinelRegistry.sol: Node bonding, slashable stakes, SLAs         |
   | AegisFeeCollector.sol: Fee capture, 50/50 buyback-burn and real yield   |
   +-------------------------------------------------------------------------+
        ^                                                   |
        | 0x0801 Precompile Read                            | 0x0802 Predeploy Write
        | (Zero Gas, ~70ms)                                 | (Sub-second Intent Lane)
        |                                                   v
[ HYPERCORE READ PRECOMPILE ]                       [ ELYSIUM CORE WRITER ]
   - Address: 0x0801                                   - Address: 0x0802
   - Live Spot & Perp Orderbooks                       - Dispatches trade-only orders
   - Mark prices & depth levels                        - Emits OrderIntentEmitted
                                                            |
                                                            v
                                                    [ HYPERCORE CLOB L1 ]
                                                       - Perpetual Matching Engine
                                                       - Atomic Hedge Execution
```

### 2.1 Component Specifications

#### Component 1: Elysium L2 Smart Contracts (Solidity 0.8.24)
1. **`AegisTypes.sol`**: Shared data schemas, enums, parameter structs, and error definitions.
2. **`AegisVault.sol`**:
   - Manages user positions, collateral tracking, and delegated trade-only session keys.
   - Enforces user-configured Pro Trader parameters: Trigger Price, Trigger Health Factor, Hedge Ratio, Trailing Stop-Loss, and Order Type.
   - Implements the `manualOverride()` killswitch allowing users to instantly close hedges or revoke Sentinel authority.
3. **`AegisSentinelRegistry.sol`**:
   - Manages Sentinel node operator registration.
   - Enforces minimum slashable bond staking of 25,000 $AEGIS per node.
   - Executes slash penalties if a node fails uptime SLAs or violates user slippage bounds.
4. **`AegisFeeCollector.sol`**:
   - Collects the 10% performance fee on averted liquidation penalties.
   - Splits fee revenue: 50% routes to Ascend Closed Hook Pools to market-buy and burn $AEGIS, and 50% distributes as real yield in USDC/HYPE to $AEGIS stakers.

#### Component 2: Hyperliquid Edge Connectors
1. **`0x0801` HyperCore Market-Data Precompile**:
   - Synchronous, zero-gas EVM precompile reading HyperCore L1 state.
   - Exposes:
     - `getSpotMarket(uint32 tokenIndex)`: Returns bid, ask, mid, and last trade prices.
     - `getPerpMarket(uint32 perpIndex)`: Returns perp mark price, funding rate, open interest.
     - `getOrderbookDepth(uint32 perpIndex, uint8 levels)`: Returns cumulative bids and asks.
2. **`0x0802` `ElysiumCoreWriter` Predeploy**:
   - Non-custodial fast-write predeploy on Elysium.
   - Emits signed trade intents that co-located HyperCore keepers pick up and execute on the L1 CLOB within 100 milliseconds.

#### Component 3: Sentinel Backend Daemon (`@aegis/sentinel`)
- Developed in TypeScript/Node.js with ethers.js and native WebSocket listeners.
- Evaluates registered positions on each 100ms Elysium block.
- Calculates portfolio Greeks, health factor ratios, and orderbook liquidity depth.
- Signs hedge transactions using the user's trade-only session key and dispatches them to `0x0802`.
- Tracks trailing profit targets on active hedges to lock in cash gains during market wicks.

---

## 3. Mathematical Models & Margin Formulas

### 3.1 Health Factor Formulation
For any collateralized position or vault with collateral assets $C$ and debt liability $D$:

$$H = \frac{\sum_{i=1}^{n} (Q_i \cdot P_i \cdot T_i)}{D_{\text{total}}}$$

Where:
- $Q_i$ is the quantity of collateral asset $i$.
- $P_i$ is the mark price of asset $i$ obtained synchronously via `0x0801`.
- $T_i$ is the liquidation threshold ratio of asset $i$ (e.g., 0.80 for 80%).
- $D_{\text{total}}$ is the total borrowed debt in USDC.

If $H \le 1.00$, the position is subject to immediate protocol liquidation.

### 3.2 Pro-Trader Trigger Condition
A hedge order is triggered when either condition evaluates to true based on user configuration:

$$\text{Trigger Condition} = (H \le H_{\text{trigger}}) \lor (P_{\text{collateral}} \le P_{\text{trigger}})$$

Where $H_{\text{trigger}}$ and $P_{\text{trigger}}$ are explicitly set by the trader.

### 3.3 Hedge Sizing (Delta Coverage Ratio)
The short perpetual hedge quantity $Q_{\text{hedge}}$ is calculated using the trader's chosen coverage ratio $\gamma \in [0.10, 1.00]$:

$$Q_{\text{hedge}} = \gamma \cdot \frac{D_{\text{total}} - (Q_{\text{collateral}} \cdot P_{\text{current}} \cdot T)}{P_{\text{perp}} \cdot (1 - T)}$$

For full delta-neutral lock ($\gamma = 1.00$):

$$Q_{\text{hedge}} = Q_{\text{collateral}}$$

For surgical partial hedging ($\gamma = 0.25$ to $0.50$):
The Sentinel opens only the minimum short perpetual size required to hold $H \ge 1.15$, preserving spot upside and minimizing hedge transaction fees.

### 3.4 Trailing Profit-Take and Unwind Equation
When a short hedge is active, the Sentinel records the lowest price reached during the market dip ($P_{\text{lowest}}$).
The trailing profit-take exit threshold $P_{\text{exit}}$ is defined as:

$$P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$$

Where $\tau$ is the user-configured trailing tolerance (e.g., $\tau = 0.015$ for 1.5%).
- If the price drops from $45.00 to $43.00, $P_{\text{lowest}} = 43.00$.
- The trailing exit activates at $P_{\text{exit}} = 43.00 \cdot (1 + 0.015) = 43.645$.
- If price bounces to $43.65, the Sentinel buys to close the short, capturing $+1.35$ per coin in net profit.
- Spot collateral is preserved, and cash profit is deposited into the user's vault balance.

---

## 4. Pro Trader Customization Schema

Pro Traders configure their parameters via `AegisVault.sol::setProConfig()`:

| Parameter Field | Type | Allowed Range | Description |
| :--- | :--- | :--- | :--- |
| `triggerMode` | `enum TriggerMode` | `PRICE`, `HEALTH_FACTOR`, `HYBRID` | Determines what triggers the hedge. |
| `priceTrigger` | `uint256` | Scaled 1e8 | Exact collateral price to start hedging. |
| `healthFactorTrigger`| `uint256` | `10200` to `13000` (1.02 to 1.30) | Health factor threshold for execution. |
| `hedgeRatioBps` | `uint16` | `1000` to `10000` (10% to 100%) | Proportion of position to hedge. |
| `orderType` | `enum OrderType` | `LIMIT_POST_ONLY`, `IOC`, `MARKET` | Execution preference on HyperCore. |
| `trailingTakeProfitBps`| `uint16` | `50` to `500` (0.5% to 5.0%) | Distance for trailing profit lock. |
| `maxSlippageBps` | `uint16` | `10` to `100` (0.1% to 1.0%) | Maximum acceptable orderbook slippage. |
| `manualOverrideActive`| `bool` | `true`, `false` | Emergency killswitch overriding all logic. |

---

## 5. Tokenomics: The $AEGIS Flywheel

The $AEGIS token has three non-negotiable economic sinks designed to prevent capital decay:

```
                  +----------------------------------------------+
                  |         AEGIS PROTOCOL ACTIVITY              |
                  | Averts liquidations & executes delta-hedges  |
                  +----------------------------------------------+
                                         |
                                         | 10% Performance Fee Collected
                                         v
                  +----------------------------------------------+
                  |            AegisFeeCollector.sol             |
                  |           Denominated in USDC / HYPE         |
                  +----------------------------------------------+
                                   /            \
                50% Net Revenue   /              \   50% Net Revenue
                                 v                v
            +------------------------+      +------------------------+
            |  MARKET BUY & BURN     |      |  REAL YIELD STAKERS    |
            | Purchases $AEGIS on    |      | Distributed in USDC    |
            | Ascend Hook Pools and  |      | and HYPE to governance |
            | permanently burns to   |      | stakers                |
            | 0x0000...dead          |      +------------------------+
            +------------------------+
```

### 5.1 Slashable Sentinel Bonds
- Operators must bond at least 25,000 $AEGIS to qualify as an active Sentinel node.
- If a node fails to submit a hedge within 3 blocks of a trigger condition or causes slippage exceeding `maxSlippageBps`, the contract slashes 10% of their bond and routes it to the user as compensation.

### 5.2 Real Cash Flow: Buyback & Burn
- Every averted liquidation charges a 10% fee on the avoided penalty.
- 50% of this fee market-buys $AEGIS on Ascend Hook Pools and burns it permanently.
- 50% is distributed to governance stakers as real yield in USDC and HYPE.

### 5.3 Protected TVL Quota
- Institutional users lock $AEGIS at a 1:50 ratio ($1 $AEGIS locked per $50 protected TVL).
- Protecting $1,000,000 of TVL requires locking 20,000 $AEGIS in the protocol.

### 5.4 Ascend 4-Stage Lifecycle
1. **Stage 1 (Launch)**: Fair-launch in an Ascend Closed Hook Pool paired with USDC.
2. **Stage 2 (Ascension)**: Qualifies for Ascend protocol-sponsored buybacks and staker distributions.
3. **Stage 3 (HyperCore Spot)**: Bridges via Mirror Bridge to HyperEVM, deploying `HyperCoreDepositWallet` for native CLOB listing.
4. **Stage 4 (HIP-3 Perpetuals)**: Launches perpetual contract on Kinetiq's HIP-3 venue.

---

## 6. UI/UX Design System Specification

### 6.1 Visual Identity & Archetype
- **Archetype**: Cybernetic Pro-Terminal / Modular Bento Grid.
- **Aesthetic**: Deep dark surfaces, high-contrast numerical readouts, subtle translucent glass borders, high-density data tables.
- **Color Tokens**:
  - Base Background: `#0A0D14`
  - Card Surface: `rgba(18, 22, 34, 0.75)` with `backdrop-filter: blur(12px)`
  - Elevated Elements: `#161B26`
  - Subtle Borders: `rgba(255, 255, 255, 0.08)`
  - Active Glow: `rgba(0, 242, 254, 0.35)`
  - Cyan Accent: `#00F2FE` (Primary branding and active states)
  - Purple Accent: `#8B5CF6` (Sentinel execution status)
  - Emerald Green: `#10B981` (Safe health factor, profit captures)
  - Amber Yellow: `#F59E0B` (Caution health factor zone)
  - Crimson Red: `#EF4444` (Danger zone, manual override killswitch)

### 6.2 Typography Tokens
- **Heading**: `Outfit`, sans-serif (weights: 600, 700; letter-spacing: -0.02em)
- **Body UI**: `Inter`, sans-serif (weights: 400, 500; base: 14px)
- **Monospace & Numerical**: `JetBrains Mono`, monospace with `font-variant-numeric: tabular-nums`

### 6.3 12-Column Responsive Bento Layout

```
+----------------------------------------------------------------------------------------------------+
| TOP NAVIGATION: Logo, Network (Elysium L2 99801), Latency (72ms), Session Key Status, Wallet       |
+----------------------------------------------------------------------------------------------------+
| HERO STATS BENTO (Cols 1-12)                                                                       |
| [ Protected TVL: $2.45M ] [ Health: 1.34 SAFE ] [ Active Hedges: 1 ] [ Fees Saved: $18,420 ]      |
+------------------------------------------------------------------+---------------------------------+
| LIVE POSITION & HYPERCORE MONITOR (Cols 1-8)                     | PRO TRADER CONTROL PANEL (9-12) |
| - Collateral: 1,000 HYPE ($45,200)                               | - Mode: Pro Trader (Manual)     |
| - Debt: $32,000 USDC                                             | - Trigger Price: [$44.20]       |
| - Liquidation Price: $40.00                                      | - Trigger Health: [1.10]        |
| - Current Health Factor: 1.41                                    | - Hedge Coverage: [50%]         |
| - Live 0x0801 Perp Price: $45.18                                 | - Trailing Profit Take: [1.5%]  |
| - Active Hedge: 500 HYPE Short @ $44.90                          | - Order Type: [Post-Only Limit] |
| - Unrealized Hedge PnL: +$140.00                                 | - Slippage Limit: [0.20%]       |
| - Historical Protection Chart (Health vs Time)                   |                                 |
|                                                                  | [ UPDATE PRO PARAMETERS ]       |
|                                                                  | [ EMERGENCY KILLSWITCH ] (Red)  |
+------------------------------------------------------------------+---------------------------------+
| REAL-TIME SENTINEL EVENT FEED & EXECUTIONS (Cols 1-7)            | $AEGIS TOKEN FLYWHEEL (Cols 8-12|
| - [16:04:12] OrderIntentEmitted -> 500 HYPE Short via 0x0802     | - Staked Bond: 50,000 $AEGIS    |
| - [16:04:14] HyperCore Fill -> 500 @ $44.90 (0.01% slippage)     | - Total Burned: 142,390 $AEGIS  |
| - [16:08:22] Trailing Stop Adjusted -> $44.20 locked             | - Real Yield APR: 18.4% (USDC)  |
+------------------------------------------------------------------+---------------------------------+
```

---

## 7. Security Boundaries & Invariants

AEGIS enforces five formal system invariants verified by fuzz testing and formal audits:

1. **INV-1: Non-Custodial Invariant**:
   - Trade-only session keys delegated by users can only call `placeLimitOrder()` and `cancelOrder()` via `0x0802`.
   - Neither the Sentinel daemon nor any smart contract can withdraw or transfer user collateral.
2. **INV-2: Slashing Bound Invariant**:
   - Slashed penalties cannot exceed the operator's active bonded stake in `AegisSentinelRegistry.sol`.
3. **INV-3: Instant Manual Override Invariant**:
   - Calling `manualOverride()` on `AegisVault.sol` immediately deactivates Sentinel execution permissions, cancels all resting hedge orders on HyperCore, and returns 100% manual control to the user in a single transaction.
4. **INV-4: Fee Conservation Invariant**:
   - All performance fees collected are split exactly: 50% to buyback and burn, 50% to staking yield. No unallocated fee leakage exists.
5. **INV-5: Monotonic Nonce Ordering**:
   - All trade intents emitted to `0x0802` enforce sequential nonces to prevent replay attacks across blocks.

---

## 8. Development Roadmap

### Phase 1: Pro Trader & Institutional Engine (Current Focus)
- Deploy Solidity contracts to Elysium L2 (`AegisTypes`, `AegisSentinelRegistry`, `AegisVault`, `AegisFeeCollector`).
- Implement the `@aegis/sentinel` daemon reading `0x0801` and writing via `0x0802`.
- Build the Pro Trader Cybernetic Bento Terminal with full parameter controls and instant manual override.
- Comprehensive Foundry test suite (`forge test`) validating margin math, slashing bounds, and non-custodial invariants.

### Phase 2: Autonomous Set-and-Forget Presets (Roadmap)
- Implement algorithmic presets: Conservative (wide buffer), Balanced (medium buffer), and Aggressive (tight buffer).
- Machine learning volatility surface forecasting to predict sudden drawdowns before orderbooks thin out.

### Phase 3: Cross-Asset & LP Pool Defense (Roadmap)
- Expand protection to Ascend Closed Hook Pools to defend liquidity providers against impermanent loss and toxic arbitrage flow.
- Multi-collateral basket hedging on HyperCore.

### Phase 4: Stage 3 & 4 Ascend Graduation (Roadmap)
- Coordinate `HyperCoreDepositWallet` deployment on HyperEVM.
- Graduate $AEGIS to native HyperCore Spot orderbook.
- Launch $AEGIS perpetual futures market on Kinetiq's HIP-3 venue.
