# AEGIS Protocol — Official Project Submission & Launchpad Proposal
**Submission Dossier for the Ascend Protocol Core Team & Ecosystem Reviewers**

* **Date:** October 2026
* **Target Network:** Elysium Orbit L2 (Chain ID 99801) • HyperCore (Hyperliquid L1)
* **Category:** Autonomous Risk Engine & Liquidation Sentinel
* **Audit Verdict:** **FIT FOR SUBMISSION (READY)**

---

## 1. Project + Links

| Detail | Information / Verified Link |
| :--- | :--- |
| **Project Name** | **Aegis Protocol** (Aegis) |
| **X (Twitter)** | [https://x.com/aegis_hedge](https://x.com/aegis_hedge) (`@aegis_hedge`) |
| **Live Website / App** | [https://aegishedge.xyz](https://aegishedge.xyz) (Terminal: [https://aegishedge.xyz/app](https://aegishedge.xyz/app)) |
| **Discord Server** | [https://discord.gg/vcF6X2cM8a](https://discord.gg/vcF6X2cM8a) |
| **GitHub Repository** | [https://github.com/youngcrypton/Aegis](https://github.com/youngcrypton/Aegis) |
| **GitBook & Docs** | [https://aegishedge.xyz/gitbook](https://aegishedge.xyz/gitbook) (Repo: [`/docs`](file:///c:/Users/ascend%20X%20elysium/docs/README.md)) |

---

## 2. Project Overview

### • What We’re Building on Aegis
Aegis is an autonomous, non-custodial risk engine and synthetic delta-hedging protocol built for Elysium Orbit L2 and HyperCore (Hyperliquid's L1 high-performance CLOB). Rather than liquidating borrower collateral through fire-sale auctions when market prices plunge, Aegis autonomously opens counterbalancing short perpetual futures on HyperCore to neutralize directional downside risk ($\Delta = 0$), keeping 100% of user collateral intact inside the primary vault under zero-custody delegation.

### • Who Aegis is For
DeFi borrowers, money market depositors, leveraged margin traders, and ecosystem token holders across Elysium L2 who want to borrow against their assets without fearing liquidation wipeouts, bottom-tick collateral dumps, or predatory 5–10% penalty surcharges.

### • What Problem Aegis Solves
Traditional collateralized debt protocols rely on abrupt, irreversible collateral auctions during volatility spikes. These auctions seize borrower equity at steep discounts, realize permanent capital losses at market troughs, and trigger catastrophic contagion cascades across the ecosystem. Aegis replaces auctions with automated, sub-second hedging that preserves the borrower's spot collateral until market mean-reversion occurs.

### • Why People Would Use Aegis (The Ascend → HyperCore Continuum)
Ascend is the premier launchpad and DEX on Elysium, guiding tokens through its 4-stage LaunchPath all the way to graduation into HyperCore perpetual markets. Once these tokens graduate, they become primary collateral assets across Elysium money markets. However, volatile new tokens carry substantial liquidation risk.

**Aegis acts as the ultimate safety blanket for the Ascend ecosystem:** As long as tokens keep launching on Ascend and ascending to HyperCore perpetuals, users can borrow against and trade them with complete confidence because they can hedge their downside on Aegis. Furthermore, Aegis programmatically routes 50% of its performance fees into Ascend Closed Hook Pools to buy back and burn $AEGIS, driving permanent volume and liquidity back to Ascend.

---

## 4. Current Status + Launch Plan

### • Working (Functional Today on Aegis)
* **100% Verified Modular Smart Contracts on Elysium L2 Testnet (Chain ID `99801`):**
  * **`AegisVault.sol`**: [`0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29`](https://testnet.elysium.kinetiq.xyz/address/0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29?tab=contract) — *Verified on Explorer*
  * **`AegisSentinelRegistry.sol`**: [`0x6C64188e1D677Eb85E4aD71836650310281f0893`](https://testnet.elysium.kinetiq.xyz/address/0x6C64188e1D677Eb85E4aD71836650310281f0893?tab=contract) — *Verified on Explorer*
  * **`AegisFeeCollector.sol`**: [`0xCA9D24c4B5025dA065d1AEf92808aB1698f267ae`](https://testnet.elysium.kinetiq.xyz/address/0xCA9D24c4B5025dA065d1AEf92808aB1698f267ae?tab=contract) — *Verified on Explorer*
  * **`RelayedOracleAdapter.sol`**: [`0x8829386b87F6CFbf64A3f75916BC96bAb0B12991`](https://testnet.elysium.kinetiq.xyz/address/0x8829386b87F6CFbf64A3f75916BC96bAb0B12991?tab=contract) — *Verified on Explorer*
  * **`AgentDispatchAdapter.sol`**: [`0xBAD4C895DBcA78F10764D73274dC1f314c80237e`](https://testnet.elysium.kinetiq.xyz/address/0xBAD4C895DBcA78F10764D73274dC1f314c80237e?tab=contract) — *Verified on Explorer*
  * **`MockERC20.sol` ($AEGIS Token)**: [`0x606f01e0cd5B90d09A99442e4265a915CeCa5104`](https://testnet.elysium.kinetiq.xyz/address/0x606f01e0cd5B90d09A99442e4265a915CeCa5104?tab=contract) — *Verified on Explorer*
* **Ascend Hook Pool Integration in Code:** `AegisFeeCollector.sol` natively interfaces with Ascend's `IAscendHookPool` (`0x2C9e2da841fE245a4d572f94191eB1884866aeBc`) and Universal Router (`0x90332B0ECbb2c9517F405627b0Dd5D5265246563`), enforcing programmatic buyback-and-burn directly on Ascend pools.
* **100% Automated Test Suite Pass Rate:** 116/116 Foundry unit/invariant/fuzz tests passing across 160,000+ fuzz runs verifying Invariants INV-1 to INV-5 and Phase 1C deferred fee debt; 29/29 Sentinel keeper tests passing.
* **Live Production Web Terminal:** Deployed at [https://aegishedge.xyz/app](https://aegishedge.xyz/app) with multi-wallet injection (MetaMask, Bitget, OKX, Opus), live RPC telemetry, Concentric Health Gauge, and Lite Auto-Pilot vs Pro Terminal modes.
* **Complete Documentation:** GitBook portal published at [https://aegishedge.xyz/gitbook](https://aegishedge.xyz/gitbook) and full technical lightpaper in repository.

### • In Development (Preparing for Ascend & Elysium Mainnet)
* Decentralized Sentinel Keeper daemon cluster setup for multi-operator mainnet redundancy.
* Ascend concentrated liquidity pool provisioning for canonical `$AEGIS / USDC` and `$AEGIS / HYPE` pairs.
* Zero-downtime hot-swap architecture ready to switch from modular adapters to native Elysium ArbOS precompiles (`0x0801` HyperCore L1 memory reader & `0x0802` CLOB writer) post-hardfork without vault migration.

### • Before Launch (Milestones & Expected Timeline)

| Milestone | Target Window | Primary Deliverables |
| :--- | :---: | :--- |
| **Milestone 1: Testnet & Ascend Hook Pool Testing** | Weeks 1–2 | Ascend Hook Pool testnet validation, Elysium community testnet points sprint (Phase 1 Points). |
| **Milestone 2: External Security Audit** | Weeks 3–4 | Formal third-party security audit of smart contracts and invariant verification. |
| **Milestone 3: Ascend Fair Launch & TGE** | Week 5 | Ascend Launchpad Fair Launch & TGE on Elysium mainnet; Phase 1 & 2 Points 100% unlock. |
| **Milestone 4: Mainnet Live Hedging** | Week 6 | Activation of live mainnet autonomous delta hedging for WHYPE and graduated Ascend tokens. |

### • $AEGIS Token Plan (70% Community & Ecosystem Alignment)
The **$AEGIS** token has a strict, immutable hard cap of **700,000,000 tokens** with zero inflationary minting capabilities in its bytecode. The tokenomics are architected to prioritize **Elysium ecosystem users**, **kHYPE liquid stakers**, and **Ascend liquidity providers**:

| Strategic Allocation | Share (%) | Token Quantity | TGE Release | Cliff | Vesting Schedule & Operational Purpose |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **kHYPE Liquid Staking Rewards** | **20.0%** | **140,000,000** | 0.0% | 0 mos | 24 mos linear streaming to native **kHYPE stakers on Kinetiq** (users earn yield without selling principal). |
| **Phase 2: Mainnet Hedging Points** | **15.0%** | **105,000,000** | **100.0% (105M)** | 0 mos | **100% Unlocked at Ascend TGE** (Active Elysium borrowers defending loans with delta hedging). |
| **Ascend LP Incentives (POL)** | **15.0%** | **105,000,000** | 0.0% | 0 mos | 36 mos linear emissions to anchor deep liquidity in `$AEGIS/USDC` & `$AEGIS/HYPE` on Ascend. |
| **Protocol Security & Insurance** | **12.0%** | **84,000,000** | 0.0% | 12 mos | 36 mos linear (DAO multi-sig black-swan emergency reserve). |
| **Phase 1: Testnet Points Reward** | **10.0%** | **70,000,000** | **100.0% (70M)** | 0 mos | **100% Unlocked at Ascend TGE** (Early Elysium testnet testers & terminal experimenters). |
| **Ascend Launchpad Fair Launch** | **10.0%** | **70,000,000** | **100.0% (70M)** | 0 mos | **100% Unlocked at Ascend TGE** (Day-1 public liquidity via Ascend Closed Hook Pool). |
| **Core Contributors & Builders** | **10.0%** | **70,000,000** | **0.0%** | **24 mos** | **Strict 2-Year Hard Cliff**; zero tokens until Month 25, followed by 36 mos linear vesting (5-year alignment). |
| **Strategic Ecosystem & Audits** | **8.0%** | **56,000,000** | 0.0% | 12 mos | 24 mos linear (Audit grants, security bounties, foundation growth). |
| **TOTAL** | **100.0%** | **700,000,000** | **35.0% (245M)** | — | **70% Direct Community & Ecosystem Alignment. 0% Team Float at TGE.** |

* **The Ascend User Reward Flywheel (100% Community Rebates):**  
  All external fees, referral shares, and pool creator rebates returned to Aegis from Ascend's DEX architecture are **100% redirected to Elysium users and borrowers** as cash-back fee discounts and loyalty rewards. Zero funds are retained by developer accounts.
* **Token Utility:**  
  1. Staking and bonding for Sentinel Keeper nodes (25,000 $AEGIS minimum bond).
  2. Protocol risk parameter governance (tuning liquidation buffers, trailing exit thresholds $\tau$).
  3. Programmatic counter-cyclical 50% buyback-and-burn on Ascend Hook Pools.

### • Support Needed from Ascend
1. **Launchpad Scheduling:** Inclusion and scheduling in the Ascend Launchpad calendar for the $AEGIS Fair Launch.
2. **Ecosystem Co-Marketing:** Co-marketing and official ecosystem announcements recognizing Aegis as the primary liquidation defense layer for tokens graduating along the Ascend LaunchPath.
3. **Hook Pool Co-Deployment:** Technical coordination on Ascend Closed Hook Pool parameterization and fee-rebate routing for canonical $AEGIS liquidity pools.

---

## 5. After Launch & Roadmap Execution

* **Ascend Flywheel Expansion:** Continuous recycling of Ascend DEX pool creator rebates back into borrower cash-back discounts, creating a permanent incentive for traders to hold loans on Elysium.
* **Multi-Collateral Sentinels for Ascended Tokens:** As new tokens graduate through Ascend to HyperCore perpetuals, Aegis will immediately deploy dedicated Sentinel risk vaults for each asset, ensuring immediate leverage and debt viability across Elysium.
* **Phase 3 Staking & Real Yield Activation:** Launch of $AEGIS governance staking pools where 50% of all liquidation-prevention performance fees are distributed as non-inflationary real yield in canonical USDC to bonded node operators and stakers.
* **Native ArbOS Precompile Hot-Swap:** Hot-swap from modular adapters to native Elysium precompiles (`0x0801` HyperCore L1 memory reader and `0x0802` CLOB writer) with zero downtime and zero vault migration once validators activate the hardfork.
* **Institutional Risk SDK:** Release of the Aegis Keeper SDK allowing institutional funds and money markets on Elysium to integrate automated delta hedging natively into their lending frontends via 1-click SDK hooks.

---

## 6. Team Information

| Field | Details |
| :--- | :--- |
| **Team Size** | **3 Full-Time Builders** |
| **Relevant Experience** | • **Founder & Co-Founder:** Proven track record in full-stack Web3 engineering, high-throughput EVM smart contract architecture, high-frequency derivative systems, and motion/interface design. Extensive experience shipping production DeFi protocols, building custom AMM/vault infrastructures, and shipping ecosystem architectures.<br><br>• **Core Engineer:** Quantitative systems and off-chain keeper automation specialist focusing on sub-second WebSocket telemetry, EIP-712 cryptographic signatures, and risk simulation engines. |
| **Best Contact** | • **Telegram:** [@young_crypton](https://t.me/young_crypton)<br>• **Discord:** `@youngcrypton` |
