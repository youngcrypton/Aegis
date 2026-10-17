# AEGIS Protocol — System Specification

> **Autonomous Non-Custodial Delta-Hedging Risk Sentinel on Elysium L2 and HyperCore**  
> Document Version: 1.0.0  
> Status: Draft — Ready for Architecture Review  
> Author: Project Architect (`youngcrypton/Aegis`)  
> Target Tooling: Foundry (`forge`), Node.js Sentinel Keeper, Vanilla Web3 Pro-Terminal

---

## 1. Overview

### 1.1 What Is AEGIS Protocol?
AEGIS is an autonomous, non-custodial risk sentinel and high-frequency delta-hedging protocol built natively for **Elysium L2** (100–200ms block times) and the **HyperCore L1 Central Limit Order Book (CLOB)** perpetual matching engine.

In decentralized lending and leveraged trading markets, sudden market drawdowns cause collateral valuations to breach maintenance margins ($H \le 1.00$). Traditional liquidation engines seize the borrower's collateral, impose severe penalties (5% to 10%), and dump spot assets into thinning orderbooks, exacerbating cascading liquidations.

AEGIS replaces punitive liquidation with surgical delta hedging:
1. **Zero-Gas Telemetry**: Continuously evaluates vault health in real time via synchronous EVM Precompile `0x0801` (~70ms read from HyperCore).
2. **Autonomous Hedging**: When health breaches a user-configured threshold ($H \le H_{\text{trigger}}$ or $P_{\text{collateral}} \le P_{\text{trigger}}$), authorized Sentinel nodes open short perpetual hedges on HyperCore via sub-second intent Predeploy `0x0802`.
3. **Non-Custodial Security**: Users retain 100% custody of assets; Sentinels execute trade-only orders via session keys mathematically prevented from withdrawing capital (Invariant INV-1).
4. **Trailing Unwind**: Once market wicks bottom out, AEGIS trails recovery ($P_{\text{lowest}} \cdot (1 + \tau)$), closes the short hedge at a cash profit, restores collateral health, and prevents liquidation without loss of spot collateral.
5. **Protocol Flywheel**: A 10% performance fee on averted liquidation penalties is split 50/50: half market-buys and burns `$AEGIS` via Ascend Closed Hook Pools, and half distributes real yield in USDC/HYPE to governance stakers.

### 1.2 Target Audience
1. **Institutional Funds & Treasury Managers**: Protocols borrowing against treasuries who cannot afford liquidation penalties or forced asset dumping.
2. **Pro Margin & Basis Traders**: Advanced traders seeking automated, granular short hedging with configurable trigger levels, order types (Post-Only limit vs. IOC), and trailing profit targets.
3. **Sentinel Node Operators**: Stakers running high-speed keeper infrastructure bonding 25,000+ `$AEGIS` to earn execution rewards.
4. **Ascend & Elysium Ecosystem LPs**: Stakers seeking sustainable real yield backed by liquidation-prevention revenue.

### 1.3 Key Differentiators
- **Sub-Second Execution Reaction**: Sub-100ms intent dispatch via Elysium `0x0801` precompile and `0x0802` predeploy, vs. 12-second latency on Ethereum or 1–2 second latency on generic rollups.
- **Collateral Preservation Over Liquidation**: Protects the underlying collateral asset; short perp profits offset spot decline rather than selling off spot collateral at market bottoms.
- **100% Non-Custodial Session Keys**: Sentinel authority is strictly confined to opening and closing hedges on HyperCore. Capital withdrawal is cryptographically impossible.
- **Granular Pro-Trader Parameter Control**: Custom hedge coverage ratios ($\gamma \in [0.10, 1.00]$), trailing tolerances ($\tau \in [0.005, 0.05]$), and instant manual killswitch override.
- **Zero Token Inflation Flywheel**: 100% of staking yield is real yield (USDC/HYPE) generated from 10% performance fees, with 50% permanently burned.

### 1.4 Competitive Landscape

| Feature / Metric | AEGIS Protocol | Traditional Liquidation (Aave/Compound) | Manual Stop-Loss Hedging | Automated Bots (Gelato/Keep3r) |
| :--- | :---: | :---: | :---: | :---: |
| **Asset Loss on Drawdown** | **Zero Spot Sold** (Short offset) | **5%–10% Penalty + Collateral Sold** | Zero Spot Sold | Zero Spot Sold |
| **Execution Latency** | **< 100ms** (Precompile 0x0801/0x0802) | 1–12 seconds (Mempool dependent) | 5–60 seconds (Human lag) | 2–15 seconds (Relayer queues) |
| **Custody Requirement** | **Non-Custodial** (Session key) | Non-Custodial smart contract | Full user custody | Delegation or bot key |
| **Orderbook Matching** | **HyperCore L1 CLOB** | AMM Spot Liquidity | CEX / DEX CLOB | DEX AMM Swap |
| **Unwind Automation** | **Dynamic Trailing Lock ($\tau$)** | None (Position liquidated) | Manual close | None / Rigid limit |
| **Downside Slippage Protection** | **Bounded via SLA & Slashing** | High (Dumping on market) | Unbounded | Variable |

---

## 2. Core Concepts & Domain Glossary

| Term | Symbol / Code | Definition |
| :--- | :---: | :--- |
| **Health Factor** | $H$ | Numerical ratio of discounted collateral value to total borrowed debt liability. When $H \le 1.00$, the position is subject to liquidation. |
| **Delta-Hedge Ratio** | $\gamma$ | Proportion of position risk hedged via short perpetual contracts ($\gamma \in [0.10, 1.00]$). $\gamma = 1.00$ achieves full delta-neutrality. |
| **Trailing Tolerance** | $\tau$ | Percentage distance above the lowest recorded wick price ($P_{\text{lowest}}$) triggering hedge unwinding and profit lock ($\tau \in [0.5\%, 5.0\%]$). |
| **Precompile `0x0801`** | `0x0801` | Synchronous, zero-gas EVM precompile reading HyperCore L1 orderbook mid-prices, mark prices, and depth with ~70ms latency. |
| **Predeploy `0x0802`** | `0x0802` | Non-custodial fast-write contract (`ElysiumCoreWriter`) dispatching trade-only order intents to HyperCore CLOB keepers. |
| **Sentinel Node** | — | Off-chain keeper daemon evaluating position health on every 100ms Elysium block and submitting hedge intents when triggers breach. |
| **Slashable Bond** | — | 25,000 `$AEGIS` minimum stake bonded in `AegisSentinelRegistry.sol`, subject to 10% slashing on SLA breaches or slippage violations. |
| **Trade-Only Session Key** | — | Delegated cryptographic key authorized strictly for `placeLimitOrder()` and `cancelOrder()` via `0x0802`, incapable of transfers or withdrawals. |
| **Manual Override** | `manualOverride()` | Emergency single-transaction killswitch in `AegisVault.sol` revoking Sentinel authorization and closing resting orders instantly. |
| **Ascend Closed Hook Pool** | — | Automated market maker pool venue on Elysium where 50% of protocol fees market-buy and burn `$AEGIS` to `0x000...dead`. |

---

## 3. Functional Requirements

### 3.1 Vault Management & Delegation

#### 3.1.1 Position Registration & Parameter Configuration
- **User Story**: As a pro trader or treasury manager, I want to register my collateralized borrowing position and set custom hedge parameters so that AEGIS protects my vault autonomously.
- **Description**: Users deposit collateral and configure `triggerMode`, `priceTrigger`, `healthFactorTrigger`, `hedgeRatioBps`, `trailingTakeProfitBps`, and `maxSlippageBps`.
- **Acceptance Criteria**:
  - [ ] User can register a vault position with collateral token, debt liability, and liquidation threshold.
  - [ ] User can delegate a trade-only session key to `AegisVault.sol`.
  - [ ] Parameters are constrained to valid ranges (`hedgeRatioBps`: 1,000–10,000; `healthFactorTrigger`: 1.02–1.30; `maxSlippageBps`: 10–100).
  - [ ] Emits `ProConfigUpdated(address indexed user, uint256 triggerPrice, uint256 triggerHealth)`.
- **Edge Cases**:
  - Attempting to set $H_{\text{trigger}} \le 1.01$ reverts with `InvalidHealthTrigger()`.
  - Attempting to delegate a zero address session key reverts with `ZeroAddress()`.

#### 3.1.2 Emergency Manual Override Killswitch
- **User Story**: As a vault owner, I want to immediately revoke Sentinel access and cancel all resting orders in an emergency so that I retain absolute manual authority over my assets.
- **Description**: Executing `manualOverride()` instantly deactivates automated hedging, revokes the active session key, cancels resting hedge intents on HyperCore, and returns total control to the user.
- **Acceptance Criteria**:
  - [ ] Callable only by the vault owner at any block time.
  - [ ] Executes within a single transaction without multi-block timelocks.
  - [ ] Revokes Sentinel execution rights and sets `manualOverrideActive = true`.
  - [ ] Emits `ManualOverrideTriggered(address indexed user, uint256 timestamp)`.
- **Edge Cases**:
  - Sentinel attempting to submit orders after `manualOverride()` is called reverts with `OverrideActive()`.

### 3.2 Autonomous Delta-Hedging Engine

#### 3.2.1 Real-Time Telemetry & Trigger Evaluation
- **User Story**: As a Sentinel node operator, I want to evaluate vault health factors on every Elysium block using precompile `0x0801` so that I detect trigger breaches within sub-100ms.
- **Description**: Sentinels query `0x0801` for mark price $P$, calculate $H = \frac{\sum Q_i \cdot P_i \cdot T_i}{D_{\text{total}}}$, and check against user trigger conditions:
  $$\text{Trigger} = (H \le H_{\text{trigger}}) \lor (P_{\text{collateral}} \le P_{\text{trigger}})$$
- **Acceptance Criteria**:
  - [ ] Mark prices are synchronously queried from `0x0801` with zero EVM gas overhead.
  - [ ] Calculated health factor matches formal mathematical model within $10^{-6}$ precision.
  - [ ] Triggers evaluate to `true` when either threshold condition is breached.
- **Constraints**:
  - Must evaluate across all active registered vaults within 80ms of new block header receipt.

#### 3.2.2 Hedge Sizing & Sub-Second Order Dispatch
- **User Story**: As a protected vault owner, I want AEGIS to size and submit an exact short perpetual hedge on HyperCore so that collateral decline is offset by perpetual short gains.
- **Description**: Sentinel calculates short size $Q_{\text{hedge}} = \gamma \cdot \frac{D - (Q_C \cdot P \cdot T)}{P_{\text{perp}} \cdot (1 - T)}$ (or $Q_{\text{hedge}} = \gamma \cdot Q_C$ for delta-neutral locking) and submits a signed trade intent to `0x0802`.
- **Acceptance Criteria**:
  - [ ] Hedge size $Q_{\text{hedge}}$ is strictly bounded by user-defined $\gamma$.
  - [ ] Order intent dispatched to `0x0802` enforces user-configured `orderType` (Post-Only limit vs. IOC).
  - [ ] Emits `OrderIntentEmitted(address indexed user, uint32 perpIndex, int256 size, uint256 price)`.
  - [ ] Verified non-custodial: transaction payload is mathematically restricted to trading operations.
- **Edge Cases**:
  - If HyperCore orderbook depth cannot absorb $Q_{\text{hedge}}$ within `maxSlippageBps`, order splits or posts limit order to prevent adverse fill.

### 3.3 Trailing Take-Profit & Unwind Engine

#### 3.3.1 Lowest Wick Tracking & Dynamic Unwind Trigger
- **User Story**: As a vault owner, I want AEGIS to track the bottom of the drawdown wick and close the short hedge as the price rebounds so that hedge gains are locked into cash.
- **Description**: When a short hedge is active, the Sentinel records $P_{\text{lowest}} = \min(P_{\text{lowest}}, P_{\text{current}})$. The exit trigger dynamically updates to:
  $$P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$$
  When $P_{\text{current}} \ge P_{\text{exit}}$, Sentinel executes buy-to-close on HyperCore via `0x0802`.
- **Acceptance Criteria**:
  - [ ] $P_{\text{lowest}}$ updates monotonically downwards during the duration of the hedge.
  - [ ] Exit threshold $P_{\text{exit}}$ dynamically calculates according to user tolerance $\tau$.
  - [ ] When price bounces past $P_{\text{exit}}$, buy-to-close order dispatches within 1 block.
  - [ ] Cash profit is credited to the user vault balance, restoring $H > 1.25$.
  - [ ] Emits `HedgeUnwound(address indexed user, uint256 exitPrice, int256 realizedPnl, uint256 newHealth)`.

### 3.4 Sentinel Registry, Node Bonding & Slashing

#### 3.4.1 Node Registration & 25,000 $AEGIS Bonding
- **User Story**: As a prospective Sentinel node operator, I want to bond 25,000 `$AEGIS` in the registry contract so that I qualify to execute hedges and earn protocol bounties.
- **Description**: Node operators deposit $\ge 25,000$ `$AEGIS` into `AegisSentinelRegistry.sol`. Nodes become active once the bond is confirmed.
- **Acceptance Criteria**:
  - [ ] Staking fewer than 25,000 tokens reverts with `InsufficientBondAmount()`.
  - [ ] Node status changes to `ACTIVE` upon successful transfer and registration.
  - [ ] Emits `SentinelRegistered(address indexed operator, uint256 bondedAmount)`.

#### 3.4.2 SLA Enforcement & Bond Slashing
- **User Story**: As a vault owner, I want underperforming Sentinel nodes to be penalized if they fail to hedge my position in time so that node reliability is economically enforced.
- **Description**: If an active node fails to submit a hedge within 3 blocks of a trigger breach, or fills an order exceeding `maxSlippageBps`, the contract slashes 10% of the node's bonded stake and transfers it directly to the affected vault owner as compensation.
- **Acceptance Criteria**:
  - [ ] Slashing amount is capped at 10% of active bond per infraction (Invariant INV-2).
  - [ ] Slashed tokens are transferred to the user, not retained by protocol owner.
  - [ ] Node with bond dropping below 25,000 `$AEGIS` is automatically deactivated until replenished.
  - [ ] Emits `SentinelSlashed(address indexed operator, address indexed victim, uint256 slashedAmount, string reason)`.

### 3.5 Fee Capture, Buyback-and-Burn & Real Yield Flywheel

#### 3.5.1 10% Averted Liquidation Fee Calculation
- **User Story**: As the protocol ecosystem, I want AEGIS to capture a 10% performance fee on averted liquidation penalties so that the protocol generates sustainable revenue from real economic value.
- **Description**: When a hedge successfully unwinds and restores health, `AegisFeeCollector.sol` charges 10% of the liquidation penalty that was averted (e.g., if a 5% liquidation penalty on $100k TVL was avoided = $5,000 saved, fee = $500 USDC).
- **Acceptance Criteria**:
  - [ ] Fee is assessed only on realized profit / averted penalty, never on user principal.
  - [ ] Assessed fee routes cleanly to `AegisFeeCollector.sol`.
  - [ ] Emits `FeeCollected(address indexed user, uint256 feeAmountUsdc)`.

#### 3.5.2 50/50 Revenue Routing (Buyback-Burn & Real Yield)
- **User Story**: As an `$AEGIS` staker, I want 50% of protocol fees to market-buy and burn tokens and 50% to distribute real yield so that token value compounds without inflation.
- **Description**: `AegisFeeCollector.sol` splits net fee revenue:
  - 50% routes to Ascend Closed Hook Pools to purchase `$AEGIS` on the open market and burn it to `0x000000000000000000000000000000000000dEaD`.
  - 50% routes to the Staking Yield pool, distributing liquid USDC and HYPE to governance stakers.
- **Acceptance Criteria**:
  - [ ] Split ratio is hardcoded to exactly 50/50 with zero fee leakage (Invariant INV-4).
  - [ ] Buyback transaction calls the Ascend Hook Pool router and verifies burn address receipt.
  - [ ] Emits `BuybackAndBurnExecuted(uint256 usdcSpent, uint256 aegisBurned)` and `YieldDistributed(uint256 usdcAmount)`.

### 3.6 Pro-Trader Web Terminal & Web3 Client

#### 3.6.1 Live Telemetry & Simulation Modes
- **User Story**: As a trader, I want a reactive, token-compliant web terminal where I can monitor live vault telemetry, simulate crash scenarios, and manage Pro parameters.
- **Description**: Lightweight vanilla HTML5/JS/CSS client adhering strictly to `brand/kit/tokens.css` with dual-theme switching, live health gauges, orderbook spreads, and a stress-test simulation bar (-18% crash, retracement, reset).
- **Acceptance Criteria**:
  - [ ] Renders seamlessly in both Light and Dark modes without hard-coded hex styles.
  - [ ] Responsive layout with zero horizontal overflow at 390px mobile viewport.
  - [ ] Stress-test simulation triggers health gauge updates and simulated hedge placements.
  - [ ] Connects to real Web3 wallets (MetaMask, Rabby) via injected EIP-1193 provider to read live vault data.

---

## 4. Architecture Overview

### 4.1 System Components

```
+----------------------------------------------------------------------------------------------------+
|                                    PRO-TRADER WEB TERMINAL                                         |
|                 Vanilla JS / HTML5 / tokens.css / Dual-Theme (Port 3000 / Static CDN)               |
|                    - Live Telemetry & Health Gauges   - Parameter Management (setProConfig)        |
|                    - Interactive Stress Simulation     - Emergency Manual Override Killswitch       |
+----------------------------------------------------------------------------------------------------+
                                      |                      ^
                                      | EIP-1193 / RPC       | WebSocket Events
                                      v                      |
+----------------------------------------------------------------------------------------------------+
|                                  ELYSIUM L2 SMART CONTRACTS                                        |
|                                    (Solidity 0.8.24, 100-200ms Blocks)                             |
|  +---------------------------+  +-------------------------------+  +----------------------------+  |
|  |      AegisVault.sol       |  |   AegisSentinelRegistry.sol   |  |    AegisFeeCollector.sol   |  |
|  | - Vault collateral state  |  | - 25,000 $AEGIS bonding       |  | - 10% penalty fee capture  |  |
|  | - ProConfig parameters    |  | - SLA tracking & 10% slash    |  | - 50% Ascend Buyback/Burn  |  |
|  | - Trade-only session keys |  | - Active node whitelist       |  | - 50% USDC/HYPE Real Yield |  |
|  | - manualOverride()        |  +-------------------------------+  +----------------------------+  |
|  +---------------------------+                 |                                                   |
+------------------------------------------------|---------------------------------------------------+
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

### 4.2 Component Interactions & Latency Budget
- **0–70ms**: Sentinel queries mark price from `0x0801` precompile upon new block header.
- **70–80ms**: Sentinel evaluates $(H \le H_{\text{trigger}}) \lor (P \le P_{\text{trigger}})$ and calculates optimal hedge sizing $Q_{\text{hedge}}$.
- **80–100ms**: Sentinel signs trade intent with trade-only session key and dispatches to `0x0802`.
- **100–200ms**: HyperCore keepers execute order on CLOB. Next block confirms hedge state.

### 4.3 External Integrations
1. **HyperCore CLOB L1**: Perpetual futures market venue executing atomic hedges.
2. **Ascend Closed Hook Pools**: Decentralized AMM pool on Elysium executing the automated 50% buyback-and-burn.
3. **Elysium L2 JSON-RPC**: Node connection for transaction dispatch and event log queries.

---

## 5. Data Model

### 5.1 Core Entities

#### `VaultPosition`
Represents an individual borrower's protected position.
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `owner` | `address` | Owner wallet address | Non-zero |
| `collateralToken` | `address` | Token address of collateral (e.g. HYPE) | Whitelisted ERC-20 |
| `collateralAmount`| `uint256` | Quantity of collateral deposited | Scaled 1e18 |
| `debtAmountUsdc` | `uint256` | Borrowed debt liability in USDC | Scaled 1e6 |
| `liquidationThresholdBps` | `uint16` | Maintenance threshold (e.g., 8,000 = 80%) | 5,000–9,500 |
| `sessionKey` | `address` | Delegated trade-only signer | Authorized address |
| `sessionKeyExpiry`| `uint256` | Timestamp when session key expires | Max 30 days |
| `manualOverrideActive` | `bool` | Emergency killswitch status | Default `false` |

#### `ProConfig`
Trader-specific customization parameters stored per vault.
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `triggerMode` | `uint8` | `0` = PRICE, `1` = HEALTH, `2` = HYBRID | Valid enum |
| `priceTrigger` | `uint256` | Price threshold in USD (scaled 1e8) | > Liquidation price |
| `healthFactorTrigger` | `uint256` | Health threshold (scaled 1e4, e.g. 11,000 = 1.10) | 10,200–13,000 |
| `hedgeRatioBps` | `uint16` | Hedge coverage $\gamma$ (1,000 to 10,000 bps) | 10% to 100% |
| `orderType` | `uint8` | `0` = POST_ONLY_LIMIT, `1` = IOC, `2` = MARKET | Valid enum |
| `trailingTakeProfitBps`| `uint16` | Trailing exit tolerance $\tau$ (50 to 500 bps) | 0.5% to 5.0% |
| `maxSlippageBps` | `uint16` | Slippage tolerance (10 to 100 bps) | 0.1% to 1.0% |

#### `ActiveHedge`
Runtime state of an open protective hedge.
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `vault` | `address` | Associated vault owner | Active vault |
| `isOpen` | `bool` | Status flag | Default `false` |
| `perpMarketIndex` | `uint32` | HyperCore perpetual market ID | Valid market |
| `hedgeSize` | `uint256` | Size of short position | > 0 when open |
| `entryPrice` | `uint256` | Execution fill price on HyperCore | Scaled 1e8 |
| `lowestPriceWick` | `uint256` | Lowest mark price recorded during drawdown | Monotonically non-increasing |
| `trailingExitPrice` | `uint256` | Price triggering unwind ($P_{\text{lowest}} \cdot (1 + \tau)$) | Dynamically updated |

#### `SentinelNode`
Registered keeper node in `AegisSentinelRegistry.sol`.
| Field | Type | Description | Constraints |
| :--- | :--- | :--- | :--- |
| `operator` | `address` | Node operator address | Non-zero |
| `bondedAmount` | `uint256` | Staked `$AEGIS` tokens | $\ge 25,000 \times 10^{18}$ |
| `isActive` | `bool` | Execution authorization status | `true` if bond $\ge 25\text{k}$ |
| `successfulHedges`| `uint32` | Total valid hedge executions | Counter |
| `slashedCount` | `uint16` | Number of times penalized | Counter |

---

## 6. Smart Contract API Surface

### 6.1 `AegisVault.sol`
```solidity
interface IAegisVault {
    function registerPosition(address collateralToken, uint256 amount, uint256 debtUsdc, uint16 ltvBps) external;
    function setProConfig(ProConfig calldata config) external;
    function delegateSessionKey(address sessionKey, uint256 duration) external;
    function executeHedgeIntent(address vaultOwner, uint32 perpIndex, int256 size, uint256 limitPrice) external;
    function executeUnwindIntent(address vaultOwner, uint32 perpIndex, uint256 exitPrice) external;
    function manualOverride() external;
    function getVaultHealth(address vaultOwner) external view returns (uint256 healthFactor, bool isTriggered);
}
```

### 6.2 `AegisSentinelRegistry.sol`
```solidity
interface IAegisSentinelRegistry {
    function bondStake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function slashSentinel(address operator, address victim, uint256 slashBps, string calldata reason) external;
    function isSentinelAuthorized(address operator) external view returns (bool);
}
```

### 6.3 `AegisFeeCollector.sol`
```solidity
interface IAegisFeeCollector {
    function processAvertedFee(address vaultOwner, uint256 savedPenaltyAmount) external;
    function executeBuybackAndBurn() external;
    function claimYield() external;
}
```

### 6.4 Standard Error Signatures
```solidity
error InvalidHealthTrigger();
error InsufficientBondAmount();
error SessionKeyExpired();
error UnauthorizedCaller();
error SlippageExceeded();
error OverrideActive();
error ZeroAddress();
```

---

## 7. User Interface Specification

### 7.1 Interface Type
Pro-Trader High-Density Financial Terminal (Vanilla HTML5 / CSS3 / ES6 JavaScript).

### 7.2 Core Views & Panels
1. **Top Navigation Bar**: Brand lockup (Marcellus font), Elysium L2 network badge (Chain ID 99801), real-time latency indicator (~70ms), trade-only session key status pill, wallet connection button, and theme switcher (`#themeBtn`).
2. **Hero Stats Strip**: 5 flat 16px-radius cards with 1px `var(--rule)` borders:
   - Protected Portfolio TVL ($)
   - Health Factor ($H$) with status badge (`SAFE`, `ARMED`, `HEDGING`, `DANGER`)
   - Sentinel Defense Status
   - Liquidations Averted ($ saved)
   - `$AEGIS` Burned & Staker APR readout
3. **Simulation Stress Bar**: Flash crash simulator (-18%), retracement tester, and live 100ms ticker feed toggle.
4. **Position & Health Gauge Bento**:
   - Collateral, debt, liquidation price, live mark price.
   - Dynamic 3-zone health buffer bar (Rose danger, Amber warning, Emerald safe zones) with live pointer.
   - Active Hedge Terminal box displaying real-time entry price, lowest wick, unrealized PnL, and net portfolio delta.
5. **Pro-Trader Control Form**: Inputs for Trigger Mode, Price Trigger, Health Factor Trigger, Hedge Coverage Ratio, Trailing Profit-Take, Order Type, Max Slippage, and prominent Emergency Manual Override button.
6. **Live Telemetry & Event Log**: High-density feed of real-time `OrderIntentEmitted`, `HyperCore Fill`, and `Trailing Stop Adjusted` events with timestamp, block number, and transaction hash links.

### 7.3 Responsive & Token Rules
- **Themes**: Light and Dark supported natively via CSS custom properties from `brand/kit/tokens.css`.
- **Surfaces**: 16px radius, 1px `var(--rule)` borders, `var(--raised)` background, zero decorative glows on product UI.
- **Mobile Behavior**: Stacks cleanly into a single vertical column with minimum 16px side gutters and zero horizontal scroll at 390px viewport width.

---

## 8. Security Boundaries & Formal Invariants

AEGIS enforces five formal mathematical and cryptographic invariants:

- **INV-1: Non-Custodial Invariant**:
  Trade-only session keys delegated to `AegisVault.sol` are restricted strictly to `placeLimitOrder()` and `cancelOrder()` via `0x0802`. Neither the Sentinel node nor protocol contracts have authorization to withdraw, transfer, or encumber user collateral.
- **INV-2: Slashing Bound Invariant**:
  Penalties assessed against a Sentinel operator are strictly capped at the operator's active bonded balance in `AegisSentinelRegistry.sol`. Under no condition can slashed amounts exceed the active staked bond.
- **INV-3: Instant Manual Override Invariant**:
  Executing `manualOverride()` on `AegisVault.sol` takes immediate effect within the same transaction block, atomically revoking Sentinel authority and cancelling resting order intents without timelocks.
- **INV-4: Fee Conservation Invariant**:
  All performance fee revenue collected in `AegisFeeCollector.sol` is divided exactly 50.0% to Ascend Hook Pool buyback-and-burn and 50.0% to staking real yield. No unallocated fee diversion or administrator leakage exists.
- **INV-5: Monotonic Nonce Ordering**:
  Every trade intent submitted to `0x0802` enforces strictly sequential, per-vault nonces to prevent replay attacks across blocks and reentrancy vectors.

---

## 9. Deployment Model

### 9.1 Target Environments
- **Elysium L2 Testnet & Mainnet**: Chain ID `99801`, block time 100–200ms.
- **HyperCore L1**: Central Limit Order Book perpetual execution venue.
- **Client Deployment**: Static web hosting (Cloudflare Pages / Vercel / IPFS) serving vanilla assets with zero Node.js server dependencies in production.

### 9.2 Tooling & Runtime
- **Smart Contracts**: Solidity `0.8.24`, Foundry (`forge`) toolchain for compilation, fuzz testing, and deployment scripts.
- **Keeper Daemon**: Node.js v20+ / TypeScript with ethers.js v6 and WebSocket connections to Elysium RPC.
- **Pro-Trader Terminal**: Vanilla HTML5/CSS/JS, served locally via lightweight `serve.js` (port 3000) or static HTTP.

---

## 10. Performance Requirements

- **Telemetry Read Latency**: Precompile `0x0801` synchronous execution time $\le 70\text{ms}$ at p50, $\le 90\text{ms}$ at p99.
- **Intent Submission SLA**: Sentinel order dispatch to `0x0802` within $\le 2$ blocks (200–400ms) of trigger condition satisfaction.
- **Slippage Constraint**: Execution on HyperCore must stay within user-configured `maxSlippageBps` (default 20 bps = 0.20%).
- **UI Responsiveness**: DOM updates render within 16ms (60 FPS); theme switches execute in < 50ms with zero layout shift.

---

## 11. Constraints, Non-Goals & Assumptions

### 11.1 Technical Constraints
- Requires Elysium L2 precompile `0x0801` and predeploy `0x0802` support.
- Requires HyperCore CLOB perpetual liquidity on the protected asset pair (e.g., HYPE-PERP).

### 11.2 Non-Goals
1. **Not a General Spot DEX**: AEGIS does not build an AMM or spot orderbook; it leverages HyperCore and Ascend.
2. **No Custodial Collateral Management**: AEGIS will never take custody of user collateral into protocol-owned treasury vaults.
3. **No Algorithmic Stablecoin**: `$AEGIS` is purely a governance, bonding, and fee-capture utility token, not a stablecoin.
4. **No Heavy Frontend Frameworks**: The Pro-Trader Terminal intentionally avoids React/Next.js/Node build dependencies to remain ultra-lightweight, auditable, and embeddable.
5. **No Cross-Chain Bridging in Phase 1**: Initial deployment is strictly anchored to Elysium L2 and native HyperCore channels.

### 11.3 Assumptions
- Elysium L2 maintains 100–200ms block intervals with reliable precompile availability.
- HyperCore keeper network processes `0x0802` trade intents within sub-second execution windows.
- Ascend Closed Hook Pools provide sufficient liquidity for the 50% buyback-and-burn mechanism.

### 11.4 Open Questions
- `[TBD: Brand Open Item 1]`: Wordmark casing convention — "Aegis" in Marcellus vs. "AEGIS" in tracked uppercase caps.
- `[TBD: Brand Open Item 2]`: Contrast refinement of dark navy on white ground across high-contrast banner exports.
- `[TBD: Contract Deployment]`: Specific factory deployer addresses on Elysium L2 testnet.

---

## 12. Future Considerations & Roadmap

- **Phase 1 (Current Focus)**:
  - Deploy core Solidity contracts (`AegisTypes.sol`, `AegisVault.sol`, `AegisSentinelRegistry.sol`, `AegisFeeCollector.sol`) with Foundry test suite.
  - Implement and run `@aegis/sentinel` keeper daemon.
  - Refactor Pro-Trader Web Terminal (`app/`) to 100% AEGIS brand kit compliance with real Web3 wallet hooks.
- **Phase 2 (Automated Presets)**:
  - Algorithmic risk presets: Conservative (wide buffer), Balanced (medium buffer), and Aggressive (tight buffer).
  - Machine-learning volatility forecast engine to anticipate rapid drawdowns before orderbooks thin out.
- **Phase 3 (LP & Multi-Asset Protection)**:
  - Defend liquidity providers on Ascend Closed Hook Pools against impermanent loss.
  - Multi-collateral basket hedging.
- **Phase 4 (Ascend Stages 3 & 4)**:
  - `HyperCoreDepositWallet` deployment on HyperEVM.
  - Native HyperCore Spot listing and HIP-3 perpetual launch on Kinetiq.
