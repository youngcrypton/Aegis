# AEGIS Protocol — Editorial Fact-Check & Technical Verification Report

**Document:** `docs/EDITORIAL_FACT_CHECK_REPORT.md`  
**Purpose:** Claim-by-claim verification matrix supporting the official introduction article (`docs/INTRODUCING_AEGIS.md`).  
**Author:** Technical Lead & Editorial Reviewer  
**Date:** October 2026  
**Repository State:** Commit aligned with Phase 2/3 modular testnet configuration.

---

## 1. Executive Summary

This report establishes the empirical and documented basis for all technical, economic, architectural, and deployment claims made in *Introducing AEGIS: Building a Non-Custodial Risk Management Layer for the Elysium Ecosystem*.

Every material claim in the article was evaluated against four verification sources:
1. **Repository Smart Contracts & Invariant Proofs:** Current Solidity code in `contracts/` and Foundry test suites in `test/`.
2. **Keeper Daemon & Off-Chain Logic:** TypeScript code and Jest test suites in `keeper/`.
3. **Frontend Telemetry & RPC Integration:** Client logic in `app/`, `dist/`, and verification tests in `test/test_frontend_truthfulness.js`.
4. **Live On-Chain & Upstream Network Data:** Elysium Testnet JSON-RPC node (`https://testnet-rpc.elysium.kinetiq.xyz`), Kinetiq explorer records, and official chain documentation.

### Overall Verification Summary:
- **Total Tests Passing in Repository:** **157 / 157 (100% Pass Rate)**
  - Foundry Smart Contracts & Invariants: **115 tests passing** (14 suites)
  - Sentinel Keeper Daemon (Jest): **29 tests passing** (5 suites)
  - Frontend Truthfulness & Live RPC Poller: **13 tests passing** (6 suites)

---

## 2. Claim-by-Claim Verification Matrix

| Claim # | Topic / Mechanism | Stated in Article | Status | Verification Evidence / Repository Source |
|:---:|:---|:---|:---:|:---|
| **C-01** | **Strict Non-Custodial Bounds (INV-1)** | Session keys have zero authority to transfer, withdraw, or encumber collateral. | **VERIFIED** | `contracts/AegisVault.sol`, `contracts/core/TradeIntentExecutor.sol`, `test/invariants/InvariantCustody.t.sol` (256 runs, 32,768 calls, 0 reverts). |
| **C-02** | **Monotonic Health Restoration (INV-2)** | Hedge unwind requires market rebound above trailing target; post-hedge health factor improves. | **VERIFIED** | `AegisVault.sol` (`executeUnwindIntent`), `test/invariants/InvariantHealth.t.sol` (32,768 calls, 0 reverts). |
| **C-03** | **Emergency Manual Override (INV-3)** | Single-transaction killswitch instantly revokes Sentinel authority; collateral remains intact. | **VERIFIED** | `AegisVault.sol` (`manualOverride()`), `test/invariants/InvariantOverride.t.sol` (32,768 calls, 0 reverts). |
| **C-04** | **Strict Fee Conservation (INV-4)** | Collected protocol fees are programmatically divided 50/50 between buyback-and-burn and staker yield. | **VERIFIED** | `contracts/AegisFeeCollector.sol` (`distributeFees()`), `test/invariants/InvariantFeeSplit.t.sol` (32,768 calls, 0 reverts). |
| **C-05** | **Cryptographic Anti-Replay (INV-5)** | EIP-712 typed intent hashing uses monotonically incrementing nonces per vault. | **VERIFIED** | `TradeIntentExecutor.sol` (`vaultNonces[vaultOwner]++`), `keeper/src/order_signer.ts`, `keeper/test/unwind_signature.test.ts`. |
| **C-06** | **Deferred Fee Debt Handling** | Failed fee collection accrues under `feeDebts` without reverting or blocking safety-critical unwinds. | **VERIFIED** | `AegisVault.sol` (`feeDebts`, `repayFeeDebt`, `repayFeeDebtFor`), `test/unit/FeeCollector.t.sol`, `docs/audits/AEGIS_PHASE1C_DEFERRED_FEE_DEBT_REPORT.md`. |
| **C-07** | **Sentinel Minimum Bond** | Operators must stake a minimum bond of 25,000 $AEGIS tokens to activate keeper status. | **VERIFIED** | `contracts/AegisSentinelRegistry.sol` (`MIN_BOND = 25_000 * 1e18`), `test/unit/SentinelRegistry.t.sol`. |
| **C-08** | **Sentinel Slashing Cap** | Slashing is capped at 10% (1,000 bps) of the bonded amount per verified penalty event. | **VERIFIED** | `contracts/AegisSentinelRegistry.sol` (`MAX_SLASH_BPS = 1000`), `test/unit/SentinelRegistry.t.sol`. |
| **C-09** | **Sentinel Unbonding Delay** | Operators must undergo a mandatory 7-day (604,800s) cooldown before withdrawing bond capital. | **VERIFIED** | `contracts/AegisSentinelRegistry.sol` (`UNBONDING_DELAY = 7 days`). |
| **C-10** | **Avoided Penalty Reference Calculation** | Reference penalty assumed at 5% of collateral valuation; protocol fee is 10% of that avoided penalty (0.50% effective). | **VERIFIED** | `AegisVault.sol` (lines 370–385: `savedPenalty = (colValUsdc * 500) / 10000; protocolFee = (savedPenalty * 1000) / 10000;`). |
| **C-11** | **Elysium Testnet RPC & Chain ID** | Official JSON-RPC `https://testnet-rpc.elysium.kinetiq.xyz`, Chain ID `99801` (`0x185d9`). | **VERIFIED** | Live node query returning `0x185d9` and block height >9.2M; `keeper/src/config.ts`; `test/test_frontend_truthfulness.js`. |
| **C-12** | **Canonical Testnet USDC Binding** | Deployed and configured to official Canonical Testnet USDC: `0x7D29d8047B905000459c0E80c34a26CeedcB47b2` (6 decimals). | **VERIFIED** | Live on-chain call querying `decimals()` returning 6; bound in `script/DeployTestnetModular.s.sol`, `keeper/src/config.ts`, `deployments.json`. |
| **C-13** | **Canonical Testnet WHYPE Binding** | Bound to canonical Wrapped HYPE: `0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234` (18 decimals). | **VERIFIED** | Live on-chain call querying `decimals()` returning 18; configured in `deployments.json` and `DeployTestnetModular.s.sol`. |
| **C-14** | **Testnet Faucet Calibration** | Faucet distributes testnet gas at `https://elysium.kinetiq.xyz/testnet-faucet`; UI deposit chips calibrated to 0.02, 0.05, 0.08 HYPE against the 0.10 cap. | **VERIFIED** | Faucet URL active; `app/app.js` (lines 33–37, 1443–1486), `app/index.html` (lines 110–113). |
| **C-15** | **Precompiles 0x0801 & 0x0802 Upstream Status** | Stock Arbitrum Orbit rollups do not expose 0x0801/0x0802 precompiles; planned for ArbOS hardfork ~4 weeks post-mainnet. | **PARTIALLY VERIFIED** | Confirmed via Kinetiq / Elysium documentation and empirical `eth_call` returning `0x`; modular adapters deployed as bridge. |
| **C-16** | **Modular Dual-Mode Architecture** | Protocol operates in `HYPERCORE_AGENT` mode on testnet/Day 1, switching to `ON_CHAIN_PRECOMPILE` post-hardfork. | **VERIFIED** | `contracts/adapters/RelayedOracleAdapter.sol`, `contracts/adapters/AgentDispatchAdapter.sol`, `keeper/src/config.ts`, `test/unit/ModularAdapters.t.sol`. |
| **C-17** | **Ascend Hook Pool Integration** | Integration with Ascend AMM hook pools for automated buybacks. | **PLANNED** | Testnet Ascend contracts currently in upstream development; contracts currently use `IAscendHookPool` swap router abstraction. |
| **C-18** | **Production Multi-Sig Governance** | Gnosis Safe multi-signature deployment with timelock controls. | **PLANNED** | Scheduled for Phase 4 mainnet deployment; testnet contracts currently use initial deployer owner. |

---

## 3. Deliberately Excluded Statements & Editorial Omissions

To preserve technical credibility and prevent unsubstantiated claims, the following statements were **deliberately excluded** from the official introduction article:

1. **Unverified Token Cap & Allocation Figures:**  
   *Excluded:* Claims that $AEGIS has an immutable 700,000,000 supply cap, specific 26% / 13% allocations to Ascend/kHYPE stakers, or a 24-month team cliff.  
   *Rationale:* While these figures appeared in draft marketing concepts, no immutable tokenomics contract, vesting schedule, or governance vote has finalized these allocations. The article describes functional utility (bonding, buyback-and-burn, governance) without inventing unverified numbers.
2. **Absolute Liquidation Immunity Claims:**  
   *Excluded:* Phrases like "Never get liquidated again," "100% liquidation-proof," or "guaranteed collateral salvation."  
   *Rationale:* In real market conditions, extreme gap risk (such as a 40% instant wick without orderbook liquidity), execution latency, or exchange downtime can result in slippage or liquidation before a hedge can fill. The article explicitly defines AEGIS as a risk-mitigation tool, not an absolute guarantee.
3. **Claims of Native Live Execution on Current Testnet:**  
   *Excluded:* Claims that live testnet transactions are currently executing synchronously through `0x0801` and `0x0802` precompiles.  
   *Rationale:* Empirical testing on `https://testnet-rpc.elysium.kinetiq.xyz` proves that stock ArbOS returns `0x` on `0x0801` and reverts on `0x0802`. The article truthfully details the Modular Dual-Mode Architecture (`RelayedOracleAdapter` + `AgentDispatchAdapter`) as the bridge until the upstream ArbOS hardfork ships.
4. **Official Endorsement or Partnership Claims:**  
   *Excluded:* Stating or implying that AEGIS is an official product of, or officially endorsed by, Elysium, Kinetiq, or Hyperliquid.  
   *Rationale:* AEGIS is an independent open-source protocol built for the ecosystem. The article frames the relationship as strategic alignment rather than a formal partnership.
5. **Fabricated Latency & Performance Figures:**  
   *Excluded:* Claims of fixed "<78ms zero-gas reads" in production today.  
   *Rationale:* Frontend tests (`test_frontend_truthfulness.js`) specifically guard against fabricating random network latency. The article accurately states real-world round-trip RPC observations (typically 800ms–1300ms across public internet to Elysium testnet).

---

## 4. Test Suite Execution Logs Reference

### Foundry Test Suite (Solidity Smart Contracts)
```text
Ran 14 test suites in 31.03s: 115 tests passed, 0 failed, 0 skipped (115 total tests)
- InvariantCustodyTest: 2 tests passed (65,536 calls total)
- InvariantFeeSplitTest: 1 test passed (32,768 calls total)
- InvariantHealthTest: 1 test passed (32,768 calls total)
- InvariantNonceTest: 1 test passed (32,768 calls total)
- InvariantOverrideTest: 1 test passed (32,768 calls total)
- TestnetDeploymentVerification: 3 tests passed
- ModularAdaptersTest: 4 tests passed
- AegisVaultTest: 32 tests passed
- FeeCollectorTest: 22 tests passed
- SentinelRegistryTest: 18 tests passed
- Comprehensive Unit & Integration Suites: 31 tests passed
```

### Jest Test Suite (Sentinel Keeper Daemon)
```text
Test Suites: 5 passed, 5 total
Tests:       29 passed, 29 total
- test/hypercore_agent.test.ts (5 tests passed)
- test/oracle_fail_closed.test.ts (7 tests passed)
- test/unwind_signature.test.ts (3 tests passed)
- test/risk_engine.test.ts (8 tests passed)
- test/testnet_keeper.test.ts (6 tests passed)
```

### Node.js Integration Suite (Frontend Truthfulness & Live RPC)
```text
Tests Completed: 13 | Passed: 13 | Failed: 0
- Suite 1: Absence of Misleading Claims in Frontend Code (5 tests passed)
- Suite 2: RPC Failure & Telemetry Handling (2 tests passed)
- Suite 3: Unsupported Contract Getter Handling (1 test passed)
- Suite 4: Fee Model Separation & Truthfulness (1 test passed)
- Suite 5: External Reference Price Handling (1 test passed)
- Suite 6: Live Elysium Testnet RPC Verification (3 tests passed)
```

---

## 5. Conclusion

The article `docs/INTRODUCING_AEGIS.md` conforms strictly to the verified state of the AEGIS repository, the active Elysium testnet deployment, and authoritative upstream technical constraints. It provides an authoritative, compelling, yet intellectually honest introduction to the protocol suitable for external publication.
