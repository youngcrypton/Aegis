# From Testnet Alpha to Mainnet Genesis

{% hint style="info" %}
The four-phase roadmap tracks execution from the active Elysium Testnet Alpha through Mainnet Genesis, precompile activation, and multi-asset risk pools.
{% endhint %}

## Phase 1: Testnet Alpha (Active Today)
* ✅ Deploy core contracts to Elysium Orbit L2 Testnet (Chain ID `99801`).
* ✅ Deploy Modular Dual-Mode Stack (`RelayedOracleAdapter.sol` + `AgentDispatchAdapter.sol`).
* ✅ Implement Phase 1C deferred fee debt engine for non-blocking unwinds.
* ✅ Formally verify Invariants INV-1 through INV-5 across 160,000+ fuzz runs.
* ✅ Implement free public testnet faucet onboarding flow (0.02, 0.05, 0.08 HYPE chips).

## Phase 2: Mainnet Genesis
* ⏳ Third-party independent security audit sign-off.
* ⏳ Ascend Closed Hook Pool mainnet launch integration.
* ⏳ Decentralized Sentinel node operator bonding program (25,000 $AEGIS).
* ⏳ Mainnet collateral onboarding for canonical WETH, WHYPE, and WBTC.

## Phase 3: Native Precompile Hardfork
* ⏳ Elysium validator activation of custom ArbOS precompiles `0x0801` and `0x0802`.
* ⏳ Zero-downtime hot-swap via `vault.setOracleAdapter()` and `vault.setDispatchAdapter()`.
* ⏳ Sub-70ms direct EVM memory reads from HyperCore CLOB matching engine.
* ⏳ Zero vault migration and zero collateral re-deposits required.

## Phase 4: Multi-Asset Expansion
* ⏳ Cross-margin portfolio delta hedging.
* ⏳ Multi-collateral lending venue risk SDK integration.
* ⏳ Institutional automated risk vaults with dynamic volatility bands.
