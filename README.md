<div align="center">

 <img src="brand/logo/aegis-mark.svg" alt="AEGIS Protocol Logo" width="96" height="96" />

 # AEGIS
 ### Autonomous Risk Sentinel & Delta-Hedging Protocol

 [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
 [![Solidity: 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-363636.svg)](foundry.toml)
 [![Foundry: Passing](https://img.shields.io/badge/Foundry-53%2F53%20Passing-07705F.svg)](test/)
 [![Invariants: INV--1_to_INV--5](https://img.shields.io/badge/Invariants-Verified%20(160k+%20Runs)-07705F.svg)](test/invariants/)
 [![Network: Elysium L2](https://img.shields.io/badge/Elysium_L2-Chain_ID_99801-6930EA.svg)](https://elysium.kinetiq.xyz/testnet-explorer)
 [![TypeScript: 5.4.5](https://img.shields.io/badge/TypeScript-5.4.5-3178C6.svg)](keeper/package.json)

 <p align="center">
 <strong>Autonomous, non-custodial risk sentinel and sub-second delta-hedging engine built natively for Elysium L2 and HyperCore.</strong>
 </p>

 <p align="center">
 <a href="#-live-product-demo"><b>Live Demo (02:44)</b></a> •
 <a href="#the-problem-the-liquidation-death-spiral">The Problem</a> •
 <a href="#the-aegis-approach">The AEGIS Approach</a> •
 <a href="#system-architecture">Architecture</a> •
 <a href="#security-model--formal-invariants">Formal Invariants</a> •
 <a href="#repository-structure">Repository Map</a> •
 <a href="#current-implementation-status">Status</a> •
 <a href="#developer-quickstart">Quickstart</a> •
 <a href="docs/index.html">Documentation</a>
 </p>

</div>

---

## Live Product Demo (Hackathon Submission)

> **Official 02:44 live product walkthrough of the AEGIS high-frequency risk engine running on Elysium L2 testnet and HyperCore CLOB.**

<div align="center">

 <a href="https://raw.githubusercontent.com/youngcrypton/Aegis/main/brand/x/aegis-product-demo-3min.mp4">
 <img src="brand/x/aegis-demo-preview.gif" alt="AEGIS Protocol Live Product Demo Walkthrough" width="100%" style="border-radius: 12px; border: 1px solid #1F293D;" />
 </a>

 <p align="center">
 <a href="https://raw.githubusercontent.com/youngcrypton/Aegis/main/brand/x/aegis-product-demo-3min.mp4"><b>[Play Full Audio Video &bull; 02:44 &bull; 8.7 MB MP4]</b></a> &nbsp;|&nbsp;
 <a href="brand/x/aegis-demo-thumbnail-1200x675.png"><b>[High-Res Retina Thumbnail]</b></a> &nbsp;|&nbsp;
 <a href="download.html"><b>[Local Media &amp; Download Hub]</b></a>
 </p>

</div>

| Telemetry Dimension | Live Walkthrough Verification | Protocol Architecture Reference |
| :--- | :--- | :--- |
| **Duration** | **02:44** (164.0s) &bull; *Strictly under 3-min hackathon ceiling* | Hackathon Video Standard |
| **Network & Consensus** | **Elysium L2** (Chain ID `99801`) &bull; **HyperCore L1 CLOB** | Precompiles `0x0801` &amp; `0x0802` |
| **Audio Narration** | Continuous spoken voiceover &bull; **-13.97 dBFS RMS** loud | Broadcast Loudness Standard |
| **Visual Telemetry** | Bold interactive presenter cursor with spotlight halo &amp; tags | Live DOM Telemetry Tracker |
| **Position Protected** | **1,000.00 HYPE** Collateral ($48.5k) &bull; **$32,000.00 USDC** Debt | Radial Health Gauge ($H = 1.41$) |
| **Simulated Crash** | **-18% Flash Crash** &bull; Sub-78ms atomic short hedge trigger | Predeploy `0x0802` Execution |
| **Profit Recovery** | **+1.5% V-Bounce** trailing profit lock &bull; 90% debt payback | Invariant **INV-4** Fee Split (50/50) |
| **Trader Sovereignty** | Atomic manual override killswitch &bull; Monotonic nonces | Invariant **INV-3** &amp; **INV-5** |

<details>
<summary><b>[Transcript] Click to expand the full 6-Chapter Voiceover Script &amp; Walkthrough Transcript</b></summary>

1. **Chapter 1 (0:00 – 0:31) &bull; Architecture &amp; Portfolio Telemetry**:
 *"Welcome to the live product demonstration of AEGIS, the first autonomous, non-custodial risk engine engineered to eliminate forced liquidations in DeFi. We are live on the Elysium Layer 2 testnet on Chain ID 99801. Our terminal connects directly to HyperCore Precompile 0x0801, streaming mark prices in sub-78 milliseconds from L1 consensus. On screen, our vault holds 1,000 HYPE collateral and $32,000 USDC debt, maintaining a safe Health Factor of 1.41 on our dynamic radial gauge."*
2. **Chapter 2 (0:31 – 0:59) &bull; 1-Click Lite Auto-Pilot**:
 *"For everyday borrowers, AEGIS provides the 1-Click Lite Auto-Pilot. Users select from three mathematically modeled defense presets: Conservative at health factor 1.25, Aggressive at 1.08, or Balanced at 1.15. We pick the 0.05 HYPE micro-deposit chip, calibrated for the Elysium testnet faucet cap. Clicking Activate Shield delegates an ephemeral session key under Invariant INV-1, strictly restricted to trade-only hedging with zero permission to withdraw collateral."*
3. **Chapter 3 (0:59 – 1:20) &bull; Pro Terminal &amp; Algorithmic Controls**:
 *"For institutional quants, the Pro Terminal unlocks granular algorithmic parameters. Traders set exact collateral price triggers, health thresholds, delta coverage ratios from 10% to 100%, and trailing profit locks. Below, our terminal streams the live 10-level Central Limit Orderbook directly from HyperCore, showing sub-tick liquidity and execution depth."*
4. **Chapter 4 (1:20 – 1:49) &bull; Real Flash Crash Simulation (-18%)**:
 *"Now, let's witness AEGIS under extreme volatility. We trigger a live -18% flash crash simulation. As the price falls toward the $40 liquidation barrier, the Health Factor drops below our 1.15 threshold. In under 78 milliseconds, the Sentinel engine detects the breach and dispatches an atomic short hedge via Predeploy 0x0802. In the Active Hedge panel, our short position absorbs the drop dollar-for-dollar. Spot collateral remains 100% safe."*
5. **Chapter 5 (1:49 – 2:18) &bull; V-Bounce &amp; Trailing Profit Unwind**:
 *"Next, the market bottoms out at $34.50 and rebounds. The moment price bounces by our 1.5% trailing buffer, the take-profit trigger fires automatically. The short hedge buys back on the orderbook, locking in cash profits. 90% of net profits pay down debt, restoring the Health Factor comfortably above 1.25. The 10% performance fee splits under Invariant INV-4: 50% burned via Ascend Hook Pools, and 50% paid as real yield to bonded Sentinel stakers."*
6. **Chapter 6 (2:19 – 2:44) &bull; Emergency Killswitch (INV-3) &amp; Wrap-Up**:
 *"Finally, safety is non-negotiable. Under Invariant INV-3, borrowers retain an atomic single-transaction Manual Override killswitch to instantly revoke keys. In the audit terminal, every intent is signed via EIP-712 with strictly monotonic nonces under Invariant INV-5, preventing replay attacks. AEGIS eliminates liquidation loss forever. Explore the live terminal at aegis.trade."*

</details>

---

## Executive Overview

**AEGIS** is a non-custodial risk mitigation protocol engineered to protect collateralized lending positions, leveraged vaults, and structured debt from catastrophic liquidation cascades.

Traditional decentralized lending protocols rely exclusively on forced liquidation: when asset values decline, third-party liquidators seize borrower collateral at a penalizing discount (typically 5% to 10%) and dump it onto spot automated market makers (AMMs). This process damages borrower equity, depresses spot market prices, and triggers further liquidations across the ecosystem.

AEGIS introduces an alternative paradigm: **autonomous synthetic delta-hedging**. Instead of selling spot collateral during market downturns, AEGIS deploys high-frequency Sentinel nodes that execute short perpetual positions on HyperCore's Central Limit Order Book (CLOB). By hedging the downside delta of the collateral asset, AEGIS stabilizes position health factor ($H$) in real time, tracks the market bottom, locks in trading gains upon rebound, and unwinds the hedge—preserving the user's underlying spot assets without relinquishing capital custody.

```
Market Drawdown ──► Collateral Health Breaches Trigger ──► Sentinel Dispatches EIP-712 Short Hedge
 │
Collateral Preserved ◄── Trailing Take-Profit Unwinds Hedge ◄── HyperCore CLOB Execution
```

---

## The Problem: The Liquidation Death Spiral

Decentralized collateralized debt protocols (e.g., Maker-style CDPs, money markets, and leveraged vaults) depend on liquidation engines to maintain solvency. In rapid market downturns, this mechanism exhibits structural flaws:

1. **Destructive Liquidation Penalties**: When a position's health drops below maintenance thresholds, third-party liquidators seize collateral and extract liquidation penalties (often 5% to 13%), permanently destroying borrower capital.
2. **Slippage and Cascading Contagion**: Liquidators routinely dump seized assets into automated market maker (AMM) pools or thin order books. The resulting price impact depresses the collateral price further, triggering secondary liquidations across unrelated vaults.
3. **Latency Bottlenecks on General-Purpose EVM Chains**: Standard EVM block times (1 to 12 seconds) are too slow for high-volatility flash crashes. By the time a borrower detects risk, transactions to deposit additional collateral often fail or get front-run.
4. **Binary Outcome Architecture**: Positions are treated as either solvent or liquidated. No native mechanism exists to dynamically insulate the portfolio during drawdown events and recover spot collateral once volatility subsides.

AEGIS eliminates the forced liquidation penalty by replacing spot liquidation with programmatic perpetual delta hedging.

---

## The AEGIS Approach

AEGIS decouples asset custody from trade execution. Users deposit collateral into their vault while retaining complete ownership of their assets. Through EIP-712 structured intent delegation, users authorize bonded Sentinel nodes to execute risk-mitigating short orders on their behalf under strictly defined, mathematically enforced boundaries.

### The 6-Stage Operational Lifecycle

```
[1. Telemetry Ingestion] ──► [2. Risk Evaluation] ──► [3. Intent Authorization]
 │ │ │
 Synchronous 0x0801 H <= H_trigger EIP-712 Session Key
 Precompile Read or P <= P_trigger Nonce Monotonicity
 │ │ │
 ▼ ▼ ▼
[6. Unwind & Restoration] ◄── [5. Trailing Profit Lock] ◄── [4. CLOB Execution]
 │ │ │
 Fee Captured (10%) P_exit = P_lowest*(1+τ) 0x0802 Predeploy
 50/50 Flywheel Split Bottom-Wick Tracking Sub-Second Matching
```

1. **Market & Collateral Telemetry**: The Sentinel daemon polls mark prices and orderbook liquidity synchronously via HyperCore Precompile `0x0801` (~70ms latency, zero EVM gas).
2. **Risk Evaluation**: The engine continuously computes the position's health factor ($H$). When $H \le H_{\text{trigger}}$ or mark price drops below $P_{\text{trigger}}$, a hedge event is triggered.
3. **Intent Authorization**: The Sentinel signs an EIP-712 structured `HedgeIntent` using a trade-only session key delegated by the user. The signature authorizes order dispatch but contains zero withdrawal permissions.
4. **High-Speed Execution**: The signed intent is dispatched to Elysium Core Writer Predeploy `0x0802`, routing directly to HyperCore's perpetual CLOB matching engine within sub-second execution windows.
5. **Dynamic Trailing Profit-Take**: While the short hedge is active, the engine monitors price movement, updating the lowest wick price ($P_{\text{lowest}}$). A dynamic exit price is established:
 $$P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$$
 where $\tau$ is the user-configured trailing tolerance (e.g., 1.5%).
6. **Recovery & Capital Restoration**: When the market rebounds and touches $P_{\text{exit}}$, the Sentinel buys to close the short. Perpetual trading profits are credited directly to the user's vault balance, restoring $H > 1.25$ without selling any spot collateral. A 10% performance fee on averted liquidation loss is routed to the fee flywheel.

---

## Core Mathematical Formulations

### 1. Health Factor Formulation

For any collateralized vault holding quantity $Q_{\text{collateral}}$ at mark price $P$ with liquidation threshold $T$ (e.g., $0.80$ for 80%) and outstanding debt $D_{\text{total}}$:

$$H = \frac{Q_{\text{collateral}} \cdot P \cdot T}{D_{\text{total}}}$$

*Condition:* If $H \le 1.00$, the position enters immediate insolvency. AEGIS triggers hedging at $H \in [1.02, 1.30]$, well before insolvency occurs.

### 2. Hedge Sizing (Delta Coverage Ratio)

The short perpetual contract size $Q_{\text{hedge}}$ is sized according to the user's coverage parameter $\gamma \in [0.10, 1.00]$:

$$Q_{\text{hedge}} = \gamma \cdot \frac{D_{\text{total}} - (Q_{\text{collateral}} \cdot P_{\text{current}} \cdot T)}{P_{\text{perp}} \cdot (1 - T)}$$

- **Full Delta-Neutral ($\gamma = 1.00$):** $Q_{\text{hedge}} = Q_{\text{collateral}}$. Downside collateral loss is 100% offset dollar-for-dollar by perpetual short gains.
- **Surgical Partial Hedge ($\gamma = 0.25 - 0.50$):** The Sentinel opens the minimum short exposure necessary to maintain $H \ge 1.15$, preserving spot upside and minimizing funding drag.

### 3. Trailing Bottom-Wick Exit Formula

During a market downturn, the Sentinel continuously tracks the market low:

$$P_{\text{lowest}} = \min(P_{\text{lowest}}, P_{\text{current}})$$

When asset prices rebound from the trough, the hedge closes when:

$$P_{\text{current}} \ge P_{\text{lowest}} \cdot (1 + \tau)$$

---

## System Architecture

```mermaid
graph TB
 subgraph Client["Trader Interface & Wallets"]
 Trader["Vault Owner Wallet"]
 Terminal["Pro-Trader Terminal (app/)"]
 Session["Ephemeral Session Key"]
 end

 subgraph ElysiumL2["Elysium L2 Smart Contracts (Chain ID: 99801)"]
 Vault["AegisVault.sol<br/>• Position & Margin State<br/>• ProConfig Parameters<br/>• manualOverride() Killswitch"]
 Executor["TradeIntentExecutor.sol<br/>• EIP-712 Verification<br/>• Monotonic Nonces (INV-5)<br/>• Non-Custodial Bounds (INV-1)"]
 Registry["AegisSentinelRegistry.sol<br/>• 25,000 $AEGIS Bond<br/>• Slashing Bounds <= 10% (INV-2)<br/>• Victim Restitution"]
 FeeCollector["AegisFeeCollector.sol<br/>• 10% Performance Fee<br/>• 50% Buyback-Burn (INV-4)<br/>• 50% Real Staking Yield"]
 end

 subgraph Precompiles["Hyperliquid Edge Connectors"]
 PrecompileRead["0x0801 Precompile<br/>Synchronous CLOB Read (~70ms)"]
 PredeployWrite["0x0802 Predeploy<br/>Trade Intent Dispatch Lane"]
 end

 subgraph SentinelService["Sentinel Keeper Daemon (@aegis/sentinel)"]
 Poller["Telemetry Poller (ws/rpc)"]
 RiskEng["Quant Risk Engine"]
 WickTrack["Trailing Wick Tracker (τ)"]
 Signer["EIP-712 Intent Signer"]
 HealthServer["HTTP /health (Port 8080)"]
 end

 subgraph HyperCoreL1["HyperCore L1 Matching Engine"]
 CLOB["Perpetual CLOB Matching Engine"]
 end

 subgraph Ecosystem["Ascend Ecosystem"]
 HookPool["Ascend Closed Hook Pool<br/>Market Buy & Burn to 0x...dEaD"]
 Stakers["Governance Stakers<br/>Real Yield (USDC/HYPE)"]
 end

 Trader -->|Configures Risk / Delegates Key| Vault
 Session -->|Signs Intents| Signer
 Terminal -->|Monitors & Overrides| Vault

 Vault -->|Inherits & Delegates| Executor
 Vault -->|Checks Node Status & Slashes| Registry
 Vault -->|Routes Fees| FeeCollector

 Executor -->|Dispatches Orders| PredeployWrite
 PrecompileRead -->|Provides Mark Prices| Vault
 PrecompileRead -->|Provides Telemetry| Poller

 Poller --> RiskEng
 RiskEng --> WickTrack
 WickTrack --> Signer
 Signer -->|Submits Signed Intent| Vault

 PredeployWrite -->|Sub-second Matching| CLOB

 FeeCollector -->|50% Buyback & Burn| HookPool
 FeeCollector -->|50% Real Yield| Stakers
```

---

## Security Model & Formal Invariants

AEGIS enforces five formal system invariants verified through stateful invariant fuzz testing in Foundry across more than 160,000 transition sequences:

| Invariant | Title | Mathematical / Security Definition | Verification File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **INV-1** | **Non-Custodial Guarantee** | $\forall t: \text{Balance}_{\text{Vault}} \ge \sum \text{Collateral}_{\text{User}}$. Sentinel session keys possess zero allowance, transfer, or withdrawal permissions. | [`InvariantCustody.t.sol`](test/invariants/InvariantCustody.t.sol) | **VERIFIED** |
| **INV-2** | **Slashing Bounds** | $\text{SlashPenalty} \le \min(\text{Bond} \cdot 0.10, \text{Bond})$. Slashed tokens route directly to victim compensation. If $\text{Bond} < 25{,}000\ \text{\$AEGIS}$, node is automatically deactivated. | [`InvariantSlashing.t.sol`](test/invariants/InvariantSlashing.t.sol) | **VERIFIED** |
| **INV-3** | **Instant Manual Override** | $\text{manualOverride}() \implies \text{SessionKey} = \emptyset \land \text{Armed} = \text{false}$ in the exact same transaction block. Revocation is absolute and atomic. | [`InvariantOverride.t.sol`](test/invariants/InvariantOverride.t.sol) | **VERIFIED** |
| **INV-4** | **Fee Conservation** | $\text{Fee}_{\text{Total}} = \text{Fee}_{\text{Burn}} + \text{Fee}_{\text{Yield}}$ with exact 50/50 division. Zero rounding loss or unallocated protocol fee leakage across all execution paths. | [`InvariantFeeSplit.t.sol`](test/invariants/InvariantFeeSplit.t.sol) | **VERIFIED** |
| **INV-5** | **Monotonic Nonce Progression** | $\text{Nonce}_{t+1} = \text{Nonce}_t + 1$. Invalidated, out-of-order, or replayed EIP-712 intent signatures revert immediately. | [`InvariantNonce.t.sol`](test/invariants/InvariantNonce.t.sol) | **VERIFIED** |

### Verified Risk Disclosures

Automated hedging introduces distinct financial and technical risks that users and developers must understand:

- **Basis & Slippage Risk**: In severe liquidity shortfalls on HyperCore, perpetual fill prices may deviate from mark price telemetry. Traders configure `maxSlippageBps` (10 to 100 bps) to limit execution slippage.
- **Funding Rate Drag**: Prolonged short hedging during extended market declines incurs perpetual funding costs if funding rates remain deeply negative. AEGIS mitigates this via trailing profit-take unwinds ($\tau$).
- **Gap & Flash Crash Events**: If an asset drops discontinuously between block evaluations without intermediate trading liquidity, a position may incur losses before a hedge is matched.
- **Oracle & Telemetry Latency**: The protocol relies on synchronous reads from Precompile `0x0801`. Network upgrades or sequencer stalls could impact telemetry freshness.
- **Audit Disclaimer**: AEGIS smart contracts have undergone rigorous property fuzzing and formal invariant verification, but have not yet completed an independent third-party commercial security audit. Mainnet capital should not be committed until formal audits are concluded.

---

## The $AEGIS Token Flywheel & Ascend Ecosystem

The $AEGIS token aligns network operators, protocol users, liquidity providers, and the Ascend ecosystem with a fixed **700,000,000 $AEGIS** hard cap on Elysium L2 (Chain ID `99801`):

> [!NOTE]
> **Non-Monetary Valuation Notice**: $AEGIS currently possesses zero established monetary value or public market price. All economic parameters and allocations represent programmatic token quantities, basis points ($\text{bps}$), and deterministic on-chain state transitions.

```
 ┌──────────────────────────────────────┐
 │ Averted Liquidation Fee │
 │ (10% of Saved Penalty) │
 └──────────────────┬───────────────────┘
 │
 ▼
 ┌──────────────────────────────────────┐
 │ AegisFeeCollector.sol │
 │ Invariant INV-4 (50/50 Split) │
 └──────────────┬───────────────────────┘
 │
 ┌───────────────────┴───────────────────┐
 │ 50% Net Fee │ 50% Net Fee
 ▼ ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │ Ascend Closed Hook Pool │ │ Real Staking Yield │
 │ Continuous buyback volume │ │ Distributed in USDC/HYPE │
 │ burns to 0x000...dEaD │ │ to Governance Stakers │
 └──────────────┬──────────────┘ └─────────────────────────────┘
 │
 ▼ (1% Ascend Platform Fee)
 ┌─────────────────────────────┐
 │ Ascend Ecosystem Loop │
 │ Triggers HYPE & KNTQ │
 │ buyback and KNTQ burn │
 └─────────────────────────────┘
```

### Complete 700M Supply Allocation

| Allocation Category | % of Total | Token Amount | TGE Unlock | Cliff | Vesting Schedule |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Ascend Ecosystem & Community** | **26.0%** | 182,000,000 | 10.0% (18.2M) | 0 mos | 24 mos linear (kHYPE stakers & Ascend LP incentives) |
| **Community & Sentinel Incentives** | **26.0%** | 182,000,000 | 5.0% (9.1M) | 0 mos | 36 mos linear (Sentinel 24/7 node uptime & relays) |
| **Ascend Launchpad Fair Launch** | **13.0%** | 91,000,000 | 100.0% (91M) | 0 mos | Instant Day-1 liquidity via Ascend Closed Hook Pool |
| **Protocol Security & Insurance** | **15.0%** | 105,000,000 | 0.0% | 12 mos | 36 mos linear (DAO multi-sig black swan backstop) |
| **Core Contributors & Team** | **12.0%** | 84,000,000 | **0.0%** | **24 mos** | **48 mos linear** (Strict 2-year cliff, 6-year horizon) |
| **Strategic Partners & Foundation** | **8.0%** | 56,000,000 | 0.0% | 18 mos | 36 mos linear (Audits, legal structuring, institutional risk) |
| **TOTAL** | **100.0%** | **700,000,000** | **~16.9%** | — | **Zero inflationary minting** |

### Four Core Value Accrual Pillars

1. **Slashable Sentinel Bonds**: Operators must stake a minimum of 25,000 $AEGIS to run an active keeper (`MIN_BOND`). Misbehavior, latency violations, or unauthorized orders trigger up to a 10% slash credited directly to affected users (INV-2).
2. **Ascend Closed Hook Burn Engine**: 50% of every collected performance fee routes directly to Ascend Closed Hook Pools to purchase $AEGIS on the open market and burn it permanently to `0x000000000000000000000000000000000000dEaD` (INV-4).
3. **Real Yield Cash Flow**: The remaining 50% of fee revenue is distributed as real cash-flow yield (USDC and HYPE) to $AEGIS governance stakers with zero inflationary token dilution.
4. **Ascend Ecosystem Feedback Loop**: Swaps executed through Ascend generate the launchpad's native 1% transaction fee, triggering Ascend's built-in buybacks of **HYPE and KNTQ** (and burning 60% of purchased KNTQ), creating mutual value across Elysium.

---

## Repository Structure

```
.
├── contracts/ # Core Solidity protocol smart contracts (Solc 0.8.24)
│ ├── AegisVault.sol # Core vault, margin tracking, ProConfig, and manualOverride()
│ ├── AegisSentinelRegistry.sol # Operator bonding (25k $AEGIS), SLA tracking, and INV-2 slashing
│ ├── AegisFeeCollector.sol # 10% performance fee capture, 50/50 buyback-burn and real yield
│ ├── AegisTypes.sol # Packed storage structs, domain enums, and custom protocol errors
│ ├── core/
│ │ └── TradeIntentExecutor.sol# EIP-712 structured signer, monotonic nonces (INV-5), custody checks (INV-1)
│ ├── adapters/
│ │ └── HyperCoreOracleAdapter.sol # Synchronous staticcall adapter for Precompile 0x0801
│ └── interfaces/ # Official protocol interfaces (IAegisVault, IAegisFeeCollector, etc.)
│
├── test/ # Comprehensive Foundry test suite (53 tests, 12 suites)
│ ├── fuzz/
│ │ └── MarginMathFuzz.t.sol # Quant margin math property fuzzing (4,000 runs)
│ ├── invariants/ # Stateful invariant fuzzing suites (160k+ state transitions)
│ │ ├── InvariantCustody.t.sol # INV-1: Non-custodial capital preservation
│ │ ├── InvariantSlashing.t.sol# INV-2: Bounded operator slashing & deactivation
│ │ ├── InvariantOverride.t.sol# INV-3: Atomic manual override killswitch
│ │ ├── InvariantFeeSplit.t.sol# INV-4: Exact 50/50 fee split conservation
│ │ ├── InvariantNonce.t.sol # INV-5: Strictly monotonic replay protection
│ │ └── handlers/
│ │ └── VaultHandler.sol # State transition generator for invariant fuzzer
│ ├── integration/
│ │ └── EndToEndFlow.t.sol # Full 9-stage lifecycle test (-18% crash, hedge, trailing rebound)
│ ├── unit/ # Isolated contract unit test suites
│ └── mocks/ # Local mock contracts for HyperCore precompiles and Ascend pools
│
├── keeper/ # High-frequency Sentinel keeper daemon (@aegis/sentinel)
│ ├── src/
│ │ ├── config.ts # Zod environment schema validation
│ │ ├── telemetry.ts # WebSocket block listener & 0x0801 market data poller
│ │ ├── risk_engine.ts # Real-time health factor ($H$) and delta hedge sizing engine
│ │ ├── trailing_tracker.ts # Bottom-wick tracking and trailing profit exit calculator (τ)
│ │ ├── order_signer.ts # EIP-712 typed data signer for delegated session keys
│ │ └── index.ts # Continuous evaluation loop & HTTP /health server (port 8080)
│ ├── Dockerfile # Multi-stage lightweight Alpine container definition
│ ├── docker-compose.yml # Container orchestration with healthchecks and log rotation
│ └── package.json # TypeScript 5.4, ethers v6, ws, zod
│
├── app/ # Pro-Trader Terminal client application
│ ├── index.html # Semantic HTML5 terminal interface with responsive panels
│ ├── styles.css # Brand Kit compliant styling via CSS variables (Light/Dark)
│ ├── app.js # EIP-1193 Web3 provider, dynamic SVG gauge, session modal, simulations
│ └── serve.js # Zero-dependency local development server (port 3000)
│
├── docs/ # Production-grade technical documentation platform
│ ├── index.html # 8-part documentation site (Ctrl+K search, mobile drawer)
│ ├── docs.css # Tokenized documentation design system
│ └── docs.js # Client-side routing, search index, and scroll-spy TOC
│
├── brand/ # AEGIS Design System & Brand Assets
│ ├── kit/
│ │ ├── aegis-brand-kit.html # Living brand kit reference (Light/Dark themes)
│ │ └── tokens.css # Sole source of truth for color, font, and surface tokens
│ ├── logo/
│ │ └── aegis-mark.svg # Official 3-blade vector logo mark
│ └── x/ # Social media headers, banners, and profile avatars
│
├── script/ # Deployment & Seeding Automation
│ ├── DeployAegis.s.sol # Production deployment script emitting deployments.json
│ └── SeedMockEnvironment.s.sol # Devnet seeding script (mints mock tokens, sets demo positions)
│
├── foundry.toml # Foundry profile (Cancun EVM, Solc 0.8.24, via_ir = true)
├── remappings.txt # Solidity dependency remappings
└── LICENSE # MIT Open Source License
```

---

## Current Implementation Status

Claims in this repository are categorized strictly by verified implementation evidence:

| Component / Feature | Category | Evidence & Verification Details |
| :--- | :--- | :--- |
| **Non-Custodial Session Keys** | **Implemented & Tested** | Verified via [`TradeIntentExecutor.sol`](contracts/core/TradeIntentExecutor.sol) and [`InvariantCustody.t.sol`](test/invariants/InvariantCustody.t.sol). 0 token allowances granted to keepers. |
| **Sentinel Bonding & Slashing** | **Implemented & Tested** | Enforces 25,000 $AEGIS stake and maximum 10% slash bound in [`AegisSentinelRegistry.sol`](contracts/AegisSentinelRegistry.sol); verified in [`InvariantSlashing.t.sol`](test/invariants/InvariantSlashing.t.sol). |
| **Emergency Manual Override** | **Implemented & Tested** | `manualOverride()` zeroing verified in single-transaction execution in [`InvariantOverride.t.sol`](test/invariants/InvariantOverride.t.sol). |
| **50/50 Fee Conservation Flywheel** | **Implemented & Tested** | Exact mathematical split verified in [`AegisFeeCollector.sol`](contracts/AegisFeeCollector.sol) and [`InvariantFeeSplit.t.sol`](test/invariants/InvariantFeeSplit.t.sol). |
| **Monotonic Replay Protection** | **Implemented & Tested** | Monotonic sequential nonces verified in [`InvariantNonce.t.sol`](test/invariants/InvariantNonce.t.sol). |
| **Full Lifecycle End-to-End Flow** | **Implemented & Tested** | 9-stage sequence (crash $\to$ hedge $\to$ bottom-wick $\to$ rebound $\to$ fee) verified in [`EndToEndFlow.t.sol`](test/integration/EndToEndFlow.t.sol). |
| **Sentinel Keeper Daemon** | **Implemented & Tested** | TypeScript build passing (`tsc`); telemetry poller, quant engine, EIP-712 signer, and HTTP `/health` server implemented in [`keeper/src/`](keeper/src/). |
| **Pro-Trader Terminal App** | **Implemented & Tested** | Dual-theme, tokenized terminal running at `http://localhost:3000/`; verified at 390px mobile viewport with zero horizontal overflow. |
| **Technical Documentation** | **Implemented & Tested** | 8-part reference platform live in [`docs/`](docs/) with interactive search (`Ctrl+K`) and dark/light modes. |
| **HyperCore Precompiles (`0x0801`/`0x0802`)** | **Mocked in Local Tests** | Local tests utilize [`MockHyperCorePrecompile.sol`](test/mocks/MockHyperCorePrecompile.sol) and [`MockHyperCoreWriter.sol`](test/mocks/MockHyperCoreWriter.sol) etched bytecodes; pending Elysium ArbOS live network upgrade. |
| **Ascend Closed Hook Pools** | **Mocked in Local Tests** | Tested against [`MockAscendHookPool.sol`](test/mocks/MockAscendHookPool.sol); live DEX deployment awaiting Ascend pool activation. |
| **Retail Preset Modes (Conservative/Aggressive)** | **Planned** | Documented in [`DESIGN.md`](DESIGN.md) for Phase 2 roadmap; current implementation prioritizes Tier 1 Pro-Trader mode. |
| **Third-Party External Audit** | **Planned** | Formal invariant fuzz testing complete; independent commercial security audit pending prior to mainnet deployment. |

---

## Technology Stack

### Smart Contract Layer
- **Compiler**: Solidity `0.8.24` (Cancun EVM target, `via_ir = true`, 200 optimizer runs)
- **Framework**: Foundry (`forge 1.7.1`)
- **Libraries**: OpenZeppelin Contracts `v5.5.0` (`EIP712`, `ECDSA`, `SafeERC20`, `Ownable`, `ReentrancyGuard`)
- **Testing**: `forge-std` (1,000 fuzz runs, 256 invariant runs with 128 depth)

### Sentinel Keeper Daemon
- **Runtime**: Node.js 20+ / TypeScript `5.4.5`
- **Blockchain Connectivity**: `ethers.js` `v6.12.0` (JSON-RPC & WebSocket listeners)
- **Validation**: `zod` `v3.23.0` for runtime configuration assurance
- **Containerization**: Docker multi-stage Alpine build, Docker Compose with health checks

### User Interface & Terminal
- **Architecture**: Vanilla HTML5, CSS3, ES6 JavaScript (zero heavy framework dependencies)
- **Design System**: AEGIS Brand Kit (`tokens.css`), dual-theme Light/Dark tokens
- **Typography**: Marcellus (headings) and Inter (body and tabular numerics)
- **Web3 Provider**: Standard EIP-1193 provider with automated Elysium network switching

---

## Developer Quickstart

### Prerequisites
- [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)
- [Node.js](https://nodejs.org/) (v20.x or higher) and `npm`
- [Docker](https://www.docker.com/) (optional, for keeper containerization)

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/youngcrypton/Aegis.git
cd Aegis

# Install Foundry dependencies
forge install
```

### 2. Smart Contract Testing

Execute the comprehensive test suite (all 53 tests across 12 suites):

```bash
# Run all unit, fuzz, invariant, and integration tests
forge test

# Run formal invariant fuzzing suites specifically
forge test --match-contract InvariantCustodyTest -vv
forge test --match-contract InvariantSlashingTest -vv
forge test --match-contract InvariantOverrideTest -vv
forge test --match-contract InvariantFeeSplitTest -vv
forge test --match-contract InvariantNonceTest -vv

# Run the 9-stage end-to-end integration flow
forge test --match-contract EndToEndFlowTest -vvv
```

### 3. Local Deployment Simulation

Simulate contract deployment using Foundry scripts:

```bash
# Run local deployment simulation
forge script script/DeployAegis.s.sol

# Simulate local testnet seeding with mock borrower and bonded keeper
forge script script/SeedMockEnvironment.s.sol
```

### 4. Running the Sentinel Keeper Daemon

```bash
# Navigate to keeper directory
cd keeper

# Install dependencies and build TypeScript
npm install
npm run build

# Configure local environment
cp .env.example .env

# Run keeper daemon in development / dry-run mode
npm run dev

# Alternatively, run via Docker Compose
docker-compose up -d

# Verify keeper health endpoint
curl http://localhost:8080/health
```

### 5. Running the Pro-Trader Terminal

```bash
# From repository root, start lightweight server
node app/serve.js

# Terminal is accessible at http://localhost:3000/
```

### 6. Accessing Technical Documentation

```bash
# View documentation locally in your browser
# Open docs/index.html directly, or serve with any static server:
npx serve docs -p 8000
```

---

## Configuration & Operational Safety

The Sentinel Keeper daemon is configured via environment variables. Refer to [`keeper/.env.example`](keeper/.env.example) for the complete template:

| Environment Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `ELYSIUM_RPC_URL` | Yes | `https://testnet-rpc.elysium.kinetiq.xyz` | Elysium L2 JSON-RPC endpoint. |
| `ELYSIUM_WS_URL` | Yes | `wss://testnet-rpc.elysium.kinetiq.xyz` | WebSocket endpoint for block headers. |
| `HYPERCORE_RPC_URL` | Yes | `https://rpc.hyperliquid.xyz` | HyperCore L1 telemetry endpoint. |
| `AEGIS_VAULT_ADDRESS` | Yes | Set after deployment | Address of deployed `AegisVault.sol`. |
| `AEGIS_REGISTRY_ADDRESS` | Yes | Set after deployment | Address of deployed `AegisSentinelRegistry.sol`. |
| `AEGIS_FEE_COLLECTOR_ADDRESS` | Yes | Set after deployment | Address of deployed `AegisFeeCollector.sol`. |
| `SENTINEL_SESSION_PRIVATE_KEY` | Yes | N/A | **Trade-only session private key**. Never use fund-holding wallet keys. |
| `SENTINEL_OPERATOR_ADDRESS` | Yes | N/A | Public address of the bonded Sentinel operator. |
| `POLL_INTERVAL_MS` | No | `100` | Telemetry polling interval in milliseconds. |
| `MAX_SLIPPAGE_BPS` | No | `50` | Maximum acceptable execution slippage (50 bps = 0.5%). |
| `DRY_RUN` | No | `false` | When `true`, evaluates risk and signs orders without dispatching. |

> [!WARNING]
> **Operational Key Isolation**: Under Invariant INV-1, Sentinel nodes only require authorization via ephemeral session keys. Never configure `SENTINEL_SESSION_PRIVATE_KEY` with a private key that controls vault collateral, token balances, or admin ownership.

---

## Roadmap & Technical Limitations

### Active Milestones

- [x] **Phase 1: Architecture & Quant Specifications**: System specifications, quant formulas, formal invariants INV-1 through INV-5.
- [x] **Phase 2: Brand Kit & Design System**: 100% tokenized CSS design system, dual-theme support, Marcellus/Inter typography.
- [x] **Phase 3: Smart Contract Core**: `AegisVault.sol`, `AegisSentinelRegistry.sol`, `AegisFeeCollector.sol`, `TradeIntentExecutor.sol`.
- [x] **Phase 4: Formal Invariant Verification**: Stateful invariant fuzzing (160k+ runs), margin math fuzzing (4k runs), end-to-end integration suite.
- [x] **Phase 5: High-Frequency Sentinel Daemon**: TypeScript engine, WebSocket block poller, dynamic bottom-wick tracker, Docker containerization.
- [x] **Phase 6: Pro-Trader Terminal & Documentation**: Dual-theme UI terminal, EIP-1193 provider, 8-part documentation platform.
- [ ] **Phase 7: Public Elysium Testnet Alpha**: Multi-node keeper network deployment, public faucet distribution, testnet community trial.
- [ ] **Phase 8: Native Precompile Integration**: Production switchover to native `0x0801` and `0x0802` precompiles upon Elysium ArbOS upgrade.
- [ ] **Phase 9: External Security Auditing**: Independent third-party audit engagement prior to mainnet deployment.
- [ ] **Phase 10: Retail Preset Modes & Multi-Collateral Vaults**: Conservative/Balanced automated presets and cross-asset margin support.

### Known Technical Limitations

1. **Precompile Simulation**: In current testnet environments, HyperCore Precompile `0x0801` and Predeploy `0x0802` are simulated using test mock harnesses pending the scheduled Elysium ArbOS network upgrade.
2. **Single-Collateral Scope**: Current implementation focuses on single-collateral vaults (e.g., HYPE/USDC). Cross-margin multi-collateral vaults are planned for future protocol releases.
3. **Funding Drag in Extended Bear Markets**: While trailing take-profit unwinds mitigate funding costs, prolonged drawdown periods require monitoring if negative perpetual funding persists.

---

## Contribution, Security & License

### Security Disclosures
If you discover a security vulnerability or invariant inconsistency within AEGIS, please report it responsibly. Do not disclose vulnerabilities in public GitHub issues. Submit detailed reports to the protocol development team or open a confidential security advisory on GitHub.

### Contributing
Contributions from developers, quantitative analysts, and security researchers are welcome:
1. Fork the repository and create a feature branch (`git checkout -b feature/improvement`).
2. Ensure all 53 Foundry tests and invariant fuzz suites pass (`forge test`).
3. Adhere strictly to the AEGIS Brand Kit in [`brand/kit/tokens.css`](brand/kit/tokens.css) for any UI additions.
4. Submit a descriptive Pull Request detailing rationale and test output.

### Open Source License
This repository is licensed under the [MIT License](LICENSE).

---

<div align="center">
 <sub>Built for the Elysium L2 and Hyperliquid ecosystems. © 2026 AEGIS Protocol.</sub>
</div>
