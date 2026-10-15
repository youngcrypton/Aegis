# Aegis Protocol — Official Lightpaper

<figure><img src=".gitbook/assets/aegis-banner.png" alt="Aegis Protocol — Autonomous Risk Engine &amp; Delta Hedging"><figcaption><b>Aegis</b>: Autonomous sub-second risk engine bridging Elysium Orbit L2 smart contracts with HyperCore CLOB.</figcaption></figure>

<div align="center">

[![Elysium Orbit L2](https://img.shields.io/badge/Network-Elysium%20Testnet%20(99801)-5FD9BE?style=flat-square&logo=ethereum&logoColor=white)](https://testnet.elysiumscan.org)
[![HyperCore CLOB](https://img.shields.io/badge/CLOB-Hyperliquid%20HyperCore-6928ED?style=flat-square)](https://hyperliquid.xyz)
[![Foundry Tests](https://img.shields.io/badge/Tests-157%2F157%20Passing%20(100%25)-07705F?style=flat-square&logo=foundry)](https://github.com/youngcrypton/Aegis)
[![Invariant INV-1](https://img.shields.io/badge/Invariant-INV--1%20Zero--Custody-5FD9BE?style=flat-square)](https://github.com/youngcrypton/Aegis)

</div>

{% hint style="info" %}
**Elysium Orbit L2 Testnet Alignment:** Chain ID `99801` • Hyperliquid L1 (HyperCore)  
**Foundry & Keeper Verification:** 157 / 157 Automated Tests Passing (100% Pass Rate)  
**Canonical Testnet USDC:** `0x7D29d8047B905000459c0E80c34a26CeedcB47b2`
{% endhint %}

## Abstract

Forced liquidations remain the primary systemic risk vector in collateralized decentralized finance. Traditional debt protocols rely on abrupt, irreversible collateral auctions that seize borrower assets at fire-sale discounts (5% to 10% penalty surcharges), realize permanent capital loss at market troughs, and trigger cascading network-wide insolvency cascades. 

**AEGIS** introduces an autonomous, non-custodial risk engine and synthetic delta-hedging protocol designed for the Elysium Orbit L2 ecosystem and HyperCore (Hyperliquid's L1 high-performance CLOB). Rather than liquidating spot collateral, AEGIS dynamically neutralizes directional downside exposure ($\Delta$) by dispatching counterbalancing short perpetual futures contracts on HyperCore before liquidation thresholds are breached. Spot collateral remains 100% intact within the user's primary vault under zero-custody delegation (Invariant **INV-1**). 

To ensure immediate testability on stock Arbitrum Nitro ArbOS prior to the upcoming validator hardfork, AEGIS implements a **Modular Dual-Mode Architecture**, operating via modular oracle and dispatch adapters today and hot-swapping to native zero-gas precompiles (`0x0801` and `0x0802`) post-hardfork with zero vault migration. The protocol enforces Phase 1C deferred fee debt accounting, guaranteeing that emergency unwind operations are never blocked by liquidity deficits. Across 14 Foundry test suites, 5 Keeper test suites, and 6 live RPC verification suites, AEGIS maintains a 100% pass rate across 157 automated tests.

---

## Key Protocol Pillars

| Architectural Pillar | Protocol Guarantee | Verification Metric |
| :--- | :--- | :--- |
| **Zero Custody Loss (INV-1)** | Collateral never moves out of the user vault; session keys are trade-only. | 160,000+ fuzz runs, 0 unauthorized balance movements |
| **Modular Dual-Mode Stack** | Operates on stock ArbOS today, hot-swapping to native 0x0801/0x0802 post-hardfork. | `RelayedOracleAdapter.sol` + `AgentDispatchAdapter.sol` |
| **Phase 1C Non-Blocking Debt** | Unwinds never revert if liquid USDC is zero; fees are tracked in `feeDebts[user]`. | 100% pass rate on zero-balance stress tests |
| **50/50 Fee Conservation (INV-4)** | 10% fee strictly divided between Ascend buyback-burn and Sentinel node yield. | Tested across all unwind amounts in `AegisFeeCollector.sol` |

---

## Navigating This Lightpaper

Follow the reading order in the sidebar or jump directly to:
* [Part I: Introduction](chapter-1-introduction/liquidation-crisis.md) — The liquidation crisis and the "Hold the Line" thesis.
* [Part II: System Architecture](chapter-2-architecture/system-overview.md) — Vaults, Sentinels, and the HyperCore L1 CLOB bridge.
* [Part III: Mathematical Specifications](chapter-3-math-model/health-factor.md) — Formal definitions of Health Factor ($H$), sizing ($\gamma$), and unwinds ($\tau$).
* [Part IV: Fee & Liquidity Settlement](chapter-4-fee-engine/deferred-fee-debt.md) — Non-blocking Phase 1C deferred debt.
* [Part V: Sentinel Keeper Network](chapter-5-sentinel-network/bonding-slashing.md) — 25,000 $AEGIS bonding and cryptographic boundaries.
* [Part VI: Tokenomics](chapter-6-tokenomics/supply-flywheel.md) — Fixed 700M cap and deflationary Ascend buyback-and-burn flywheel.
* [Part VII: Formal Verification](chapter-7-formal-verification/invariants.md) — Invariants INV-1 to INV-5 and test scorecard.
* [Part VIII: Protocol Roadmap](chapter-8-roadmap/milestones.md) — Milestone tracking to Mainnet Genesis.
