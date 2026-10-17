# Protocol Roadmap: From Lean Testnet to Ecosystem Scaling

{% hint style="info" %}
**V1 Architecture Strategy:**  
Throughout the active testnet phase and V1 Mainnet Genesis, **AEGIS is laser-focused on pure autonomous delta hedging** for tokens with perpetual orderbooks on HyperCore, borrowers on Elysium, and tokens ascending from the Ascend Launchpad to HyperCore perpetual sessions. All staking contracts, fee collector distribution, and tokenomics yield mechanics are scheduled on our future roadmap.
{% endhint %}

## Phase 1: Testnet Alpha (Active Today) — Pure Autonomous Hedging
* ✅ **Core Non-Custodial Vault:** Deploy lean `AegisVault.sol` on Elysium Orbit L2 Testnet (Chain ID `99801`).
* ✅ **HyperCore Sub-Second Execution:** Real-time L1 CLOB order routing with sub-150ms execution latency.
* ✅ **Live Mainnet Price Telemetry:** Real-time mark price resolution against live Hyperliquid orderbook data.
* ✅ **Ascend-to-HyperCore Token Hedging:** Automated delta defense for WHYPE, WETH, and tokens that have ascended from Ascend Launchpad to HyperCore perpetual orderbooks.
* ✅ **Non-Custodial Invariants (INV-1 to INV-5):** Trade-only session keys with zero collateral withdrawal capability verified across 160,000+ fuzz runs.
* ✅ **Dynamic Bottom-Wick Tracking:** Continuous trough ratcheting with automated trailing take-profit unwinds.

## Phase 2: Mainnet Genesis — Production Hedging Engine
* ⏳ **Targeted Security Audit:** Focused, cost-efficient audit strictly covering the core non-custodial vault and session key delegation.
* ⏳ **Ecosystem Grant Alignment:** Collaboration with Elysium / Kinetiq ecosystem grant programs for security sponsorship.
* ⏳ **Mainnet Launch on Elysium L2:** Live autonomous liquidation protection for native WHYPE, WETH, WBTC, and top ascended ecosystem tokens.
* ⏳ **Borrower Protection Integrations:** Seamless risk defense for Elysium money market borrowers and leverage traders.

## Phase 3: Future Roadmap — Yield & Staking Flywheel
* ⏳ **$AEGIS Token Deployment:** Hard-capped supply with anti-dilutive economics.
* ⏳ **Decentralized Sentinel Bonding:** Bonded node operator network with 25,000 $AEGIS stake requirements.
* ⏳ **Ascend Closed Hook Pool Buyback & Burn:** Programmatic routing of performance fees into Ascend AMM pools to burn $AEGIS.
* ⏳ **Real-Yield Staking Distribution:** Canonical USDC yield distribution to bonded node operators.

## Phase 4: Future Roadmap — Precompiles & Multi-Asset SDKs
* ⏳ **Native ArbOS Precompile Activation:** Validator activation of custom precompiles `0x0801` and `0x0802` for sub-70ms zero-gas EVM reads.
* ⏳ **Cross-Margin Portfolio Delta Hedging:** Unified account risk netting across multiple collateral positions.
* ⏳ **Lending Protocol Risk SDK:** Direct plug-and-play risk module for new money markets launching on Elysium.

