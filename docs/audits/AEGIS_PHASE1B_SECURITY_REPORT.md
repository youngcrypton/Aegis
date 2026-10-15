# AEGIS Protocol — Phase 1B: Smart Contract Security Remediation Report

**Date**: October 14, 2026  
**Auditor / Security Engineer**: Senior Solidity Security Engineer  
**Scope**: Smart Contract Level Remediation (`contracts/AegisVault.sol`, `contracts/AegisSentinelRegistry.sol`, `contracts/AegisTypes.sol`, `contracts/interfaces/IAegisVault.sol`, `contracts/interfaces/IAegisSentinelRegistry.sol`, and corresponding Foundry test suites)  
**Execution Environment**: Local Development & Testing Only (Zero contract deployments, zero transactions broadcast, zero live state modifications, zero private keys exposed, zero unrelated git modifications).

---

## 1. Verified Findings Against Actual Source

Before modifying any lines of code, the contract source code and test harnesses were systematically reviewed and compared against reported vulnerabilities:

| Finding ID | Component | Vulnerability Summary | Source Evidence | Status in Phase 1B |
|---|---|---|---|---|
| **SEC-04** | `AegisVault.sol:198-244` | **Double-Hedge Overwrite** | `executeHedgeIntent()` lacked any check on `activeHedges[vaultOwner].isOpen`. An open short hedge could be overwritten by a subsequent intent, corrupting tracking, losing entry price data, and allowing state desynchronization. | **RESOLVED** |
| **SEC-03** | `AegisVault.sol:254-285` | **Arbitrary Caller `exitPrice` & Fee Manipulation** | `executeUnwindIntent()` accepted `uint256 exitPrice` from calldata without oracle validation or bounds checking. It also ignored `hedge.trailingExitPrice`. A caller could pass `exitPrice = 1e18` to manipulate fee calculations or execute premature unwinds before market rebound. | **RESOLVED** |
| **SEC-06** | `AegisSentinelRegistry.sol:108-122` | **Front-Running Slashing Evasion via Instant Unstake** | `exitSentinel()` immediately zeroed `bondedAmount` and transferred 100% of tokens back to the operator in the same transaction, allowing an adversarial sentinel to front-run incoming slashing transactions. | **RESOLVED** |
| **SEC-02** | `HyperCoreOracleAdapter.sol:20-25` | **Precompile 0x0801 Fail-Closed Behavior** | Low-level staticcall reverts with `PrecompileReadFailed(perpIndex)` if precompile 0x0801 is missing or returns invalid data. Verified that unwind now enforces this fail-closed check on-chain. | **VERIFIED & ENFORCED** |

---

## 2. Exact Files Changed

| File Path | Nature of Modification | Summary of Changes |
|---|---|---|
| `contracts/AegisTypes.sol` | **Protocol Types & Errors** | Added custom error definitions: `HedgeAlreadyActive()`, `TrailingExitNotReached(uint256,uint256)`, `InvalidPrice()`, `MismatchedMarketIndex()`, `CooldownActive(uint256)`, `NoUnbondRequest()`. |
| `contracts/interfaces/IAegisVault.sol` | **Interface Update** | Added `LowestWickUpdated` event and `updateLowestWick(address vaultOwner)` function declaration. |
| `contracts/AegisVault.sol` | **Core Risk Engine Security** | Added `if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyActive();` guard. Added `updateLowestWick(vaultOwner)` ratcheting function. Hardened `executeUnwindIntent` with live oracle price query, trailing exit threshold assertion, max slippage guard, and immune oracle-anchored fee calculation. |
| `contracts/interfaces/IAegisSentinelRegistry.sol` | **Interface Update** | Added `SentinelExitInitiated`, `SentinelExitFinalized` events, `initiateExitSentinel()`, `finalizeExitSentinel()`, `unbondingTimestamps()`, and `UNBONDING_COOLDOWN()`. |
| `contracts/AegisSentinelRegistry.sol` | **Staking & SLA Security** | Implemented `UNBONDING_COOLDOWN = 7 days`, `unbondingTimestamps` mapping, two-step exit flow (`initiateExitSentinel` / `finalizeExitSentinel`), and locked bonds throughout cooldown to ensure slashing remains possible until final withdrawal. |
| `test/unit/AegisVault.t.sol` | **Unit Test Suite** | Updated `test_ExecuteUnwindIntent_Success` to simulate realistic market rebound. Added 8 new unit tests covering double-hedge revert, legitimate hedge opening post-unwind, failed attempt isolation, trailing exit enforcement, zero price revert, mismatched market index revert, excessive slippage revert, and trailing target ratcheting. |
| `test/unit/SentinelRegistry.t.sol` | **Unit Test Suite** | Updated `test_ExitSentinel_Success` for 7-day cooldown delay. Added 6 new unit tests proving immediate withdrawal reverts, slash during cooldown succeeds with correct victim restitution, repeated initiate calls cannot reset cooldown, exact boundary timestamp behavior, lock on re-staking/unstaking during cooldown, and revert if no unbond request. |
| `test/invariants/handlers/VaultHandler.sol` | **Invariant Test Handler** | Added `action_unwindHedgeIntent` to enable the stateful fuzzer to continuously cycle between hedging and unwinding while preserving all protocol invariants (`INV-1` to `INV-5`). |

---

## 3. Security Rationale for Each Change

### 3.1 Double-Hedge Overwrite Protection (Task 2)
- **Problem**: When a vault's health factor breached its trigger threshold, keepers could call `executeHedgeIntent()`. If a keeper submitted multiple orders or another keeper sent a competing intent while a hedge was already open, the previous `ActiveHedge` storage struct was completely overwritten with the new entry price, size, and trailing exit target. This destroyed historical accounting and allowed arbitrary manipulation of the position's trailing stop.
- **Solution**: Added `if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyActive();` at the beginning of `executeHedgeIntent()`.
- **Invariants Maintained**:
  - If a hedge attempt fails (e.g. expired deadline, invalid session key), the transaction reverts atomically, leaving any existing state intact.
  - When `executeUnwindIntent()` completes, `hedge.isOpen` is toggled to `false`, allowing a legitimate new hedge to be opened if market conditions crash again.
  - Reentrancy is blocked via OpenZeppelin `ReentrancyGuard` on all state-changing endpoints.

### 3.2 Unwind Price & Fee Validation (Task 3)
- **Problem**: `executeUnwindIntent()` accepted an untrusted `exitPrice` directly from caller calldata and calculated fees as `(pos.collateralAmount * exitPrice) / 1e20`. If an adversarial caller passed an artificially inflated `exitPrice` (e.g., $1,000,000), `AegisFeeCollector.processAvertedFee()` would attempt to transfer an enormous fee from the borrower's USDC allowance, draining the user's funds. Furthermore, `executeUnwindIntent()` never queried the oracle, allowing positions to be prematurely closed while the market was still falling.
- **Solution**:
  1. **Trusted Oracle Query**: `executeUnwindIntent()` queries `HyperCoreOracleAdapter.getPerpPrice(perpIndex)`. If the precompile is unavailable or returns 0, the call immediately reverts with `PrecompileReadFailed` or `InvalidPrice`, ensuring fail-closed behavior.
  2. **Trailing Stop Enforcement**: Compares `liveMarkPrice >= hedge.trailingExitPrice`. If the market has not rebounded to or above the trailing target, the unwind reverts with `TrailingExitNotReached(liveMarkPrice, hedge.trailingExitPrice)`.
  3. **Wick Ratcheting (`updateLowestWick`)**: If the price dipped lower prior to rebounding, `lowestWickPrice` is ratcheted down and `trailingExitPrice` is recalibrated to `(newLowestWick * (10000 + cfg.trailingTakeProfitBps)) / 10000`.
  4. **Max Slippage Guard**: Validates that caller limit price does not exceed `liveMarkPrice * (1 + maxSlippageBps)`.
  5. **Fee Inflation Elimination**: Collateral valuation for performance fee calculation uses `uint256 valuationPrice = liveMarkPrice < exitPrice ? liveMarkPrice : exitPrice;`. The caller has zero ability to inflate the fee by supplying a manipulated `exitPrice`.

### 3.3 Sentinel 7-Day Unbonding Cooldown (Task 4)
- **Problem**: An adversarial sentinel node could monitor the mempool, detect an impending `slashSentinel()` call for downtime or latency SLA breach, and immediately call `exitSentinel()`. In the original implementation, `exitSentinel()` immediately transferred all bonded tokens to `msg.sender`, causing the subsequent slash transaction to revert with `InsufficientBondAmount()`.
- **Solution**:
  1. **Two-Step Unbonding Pattern**: Added `UNBONDING_COOLDOWN = 7 days` and an `unbondingTimestamps` mapping.
  2. Calling `initiateExitSentinel()` (or the first call to `exitSentinel()`) immediately deactivates the node (`node.isActive = false;`) and sets `unbondingTimestamps[msg.sender] = block.timestamp + 7 days;`.
  3. **Funds Remain Slashable**: `node.bondedAmount` is **not** set to zero and the tokens remain inside the registry contract during the 7 days.
  4. If `slashSentinel()` is called during the cooldown, the penalty is deducted directly from `node.bondedAmount` and paid to the victim.
  5. Only after `block.timestamp >= unbondingTimestamps[msg.sender]` can `finalizeExitSentinel()` (or the second call to `exitSentinel()`) be executed to withdraw the post-slash remaining bond.
  6. Re-entry, repeated initiate calls, and attempts to re-bond or unstake during the cooldown revert with `CooldownActive(unlockTimestamp)`.

---

## 4. Verification & Test Results

### 4.1 Foundry Test Suite Execution
- **Command**: `forge test`
- **Exit Status**: `0` (Success)
- **Total Test Suites**: 12
- **Pre-existing Tests**: 53
- **New Tests Added**: 14
- **Total Tests Passing**: **67 passed, 0 failed, 0 skipped**
- **Execution Time**: 22.27s (142.02s CPU time)

### 4.2 Distinguishing New Tests Added

#### AegisVaultTest (`test/unit/AegisVault.t.sol`) — 15 tests total (8 new / enhanced)
1. `test_ExecuteHedgeIntent_RevertIfAlreadyActive()`: **[NEW]** Proves that attempting to open a second hedge while one is active reverts with `HedgeAlreadyActive` and does not corrupt existing hedge parameters or dispatch writer intents.
2. `test_ExecuteHedgeIntent_CanOpenAfterValidUnwind()`: **[NEW]** Proves that after a valid unwind closes an active hedge, a subsequent market crash allows opening a new hedge cleanly.
3. `test_ExecuteHedgeIntent_FailedAttemptDoesNotCorruptHedge()`: **[NEW]** Proves that a failed transaction attempt (e.g. invalid signature) leaves the active hedge state untouched.
4. `test_ExecuteUnwindIntent_RevertIfTrailingNotReached()`: **[NEW]** Proves that attempting an unwind before the market rebounds past `trailingExitPrice` reverts with `TrailingExitNotReached`.
5. `test_ExecuteUnwindIntent_RevertOnZeroPrice()`: **[NEW]** Proves that passing `exitPrice == 0` reverts with `InvalidPrice`.
6. `test_ExecuteUnwindIntent_RevertOnMismatchedMarket()`: **[NEW]** Proves that passing an incorrect `perpIndex` reverts with `MismatchedMarketIndex`.
7. `test_ExecuteUnwindIntent_RevertOnExcessiveSlippage()`: **[NEW]** Proves that passing an `exitPrice` exceeding the configured `maxSlippageBps` reverts with `SlippageExceeded`.
8. `test_UpdateLowestWick_RatchetsTrailingTarget()`: **[NEW]** Proves that `updateLowestWick()` lowers `lowestWickPrice` and `trailingExitPrice` when price dips, and allows unwind at the ratcheted rebound level.
9. `test_ExecuteUnwindIntent_Success()`: **[UPDATED]** Updated mock oracle mark price to reflect realistic rebound at $42.00, satisfying trailing threshold.
10. `test_DelegateAndRevokeSessionKey()`: [Pre-existing] Passed.
11. `test_ExecuteHedgeIntent_BreachTriggerAndHedge()`: [Pre-existing] Passed.
12. `test_ExecuteHedgeIntent_NotTriggeredReverts()`: [Pre-existing] Passed.
13. `test_ManualOverride_InvariantINV3_AtomicKillswitch()`: [Pre-existing] Passed.
14. `test_RegisterPosition_Success()`: [Pre-existing] Passed.
15. `test_SetProConfig_BoundsValidation()`: [Pre-existing] Passed.

#### SentinelRegistryTest (`test/unit/SentinelRegistry.t.sol`) — 19 tests total (6 new / enhanced)
1. `test_ExitSentinel_ImmediateWithdrawalReverts()`: **[NEW]** Proves calling finalize or exit before the 7-day cooldown elapses reverts with `CooldownActive`.
2. `test_ExitSentinel_SlashingPossibleDuringCooldown()`: **[NEW]** Proves slasher can slash an unbonding sentinel during the 7-day delay, victim receives restitution payout, and operator only receives the remaining bond post-cooldown.
3. `test_ExitSentinel_RepeatedInitiateCannotResetTimer()`: **[NEW]** Proves calling `initiateExitSentinel()` again during cooldown reverts and cannot reset the 7-day clock.
4. `test_ExitSentinel_BoundaryTimestamps()`: **[NEW]** Proves boundary check: `unlockTime - 1` second reverts with `CooldownActive`, whereas `unlockTime` succeeds.
5. `test_ExitSentinel_CannotBondOrUnstakeDuringCooldown()`: **[NEW]** Proves `bondStake` and `unstake` are locked while in unbonding cooldown.
6. `test_FinalizeExit_RevertsIfNoUnbondRequest()`: **[NEW]** Proves `finalizeExitSentinel()` reverts with `NoUnbondRequest` if exit was never initiated.
7. `test_ExitSentinel_Success()`: **[UPDATED]** Proves initiation, 7-day time warp (`vm.warp`), and successful finalization.
8. `testFuzz_SlashSentinel_InvariantINV2_CannotExceedTenPercent()`: [Pre-existing] Passed (1,000 fuzz runs).
9. `test_BondStake_IncrementalTopUp()`: [Pre-existing] Passed.
10. `test_BondStake_InsufficientInitialAmountReverts()`: [Pre-existing] Passed.
11. `test_BondStake_Success()`: [Pre-existing] Passed.
12. `test_BondStake_ZeroAmountReverts()`: [Pre-existing] Passed.
13. `test_RecordSuccessfulHedge()`: [Pre-existing] Passed.
14. `test_SlashSentinel_InvariantINV2_ExceedsMaxBoundReverts()`: [Pre-existing] Passed.
15. `test_SlashSentinel_SuccessAndVictimPayout()`: [Pre-existing] Passed.
16. `test_SlashSentinel_UnauthorizedCallerReverts()`: [Pre-existing] Passed.
17. `test_SlashSentinel_ZeroAddressReverts()`: [Pre-existing] Passed.
18. `test_Unstake_PartialSuccess()`: [Pre-existing] Passed.
19. `test_Unstake_RevertIfRemainingBelowMinimum()`: [Pre-existing] Passed.

#### Formal Invariant Test Suites (All 5 Invariants Passed Across 160,000+ Calls)
- `InvariantCustodyTest`: **[PASS]** `invariant_INV1_ZeroSentinelTokenAllowance` & `invariant_INV1_ZeroVaultCollateralCustody` (32,768 calls, 0 reverts, 0 discards).
- `InvariantSlashingTest`: **[PASS]** `invariant_INV2_SlashingNeverExceedsTenPercent` & `invariant_INV2_SubMinimumBondDeactivatesNode` (32,768 calls, 0 reverts, 0 discards).
- `InvariantOverrideTest`: **[PASS]** `invariant_INV3_ManualOverrideGuaranteesZeroKey` (32,768 calls, 0 reverts, 0 discards).
- `InvariantFeeSplitTest`: **[PASS]** `invariant_INV4_StrictFeeConservation` (32,768 calls, 0 reverts, 0 discards).
- `InvariantNonceTest`: **[PASS]** `invariant_INV5_MonotonicNonceEquality` (32,768 calls, 0 reverts, 0 discards).

### 4.3 Actual Generated Code Coverage Report
Generated via `forge coverage --ir-minimum --match-path "test/*"`:

```text
╭-----------------------------------------------+------------------+------------------+-----------------+-----------------╮
| File                                          | % Lines          | % Statements     | % Branches      | % Funcs         |
+=========================================================================================================================+
| contracts/AegisFeeCollector.sol               | 82.14% (46/56)   | 77.94% (53/68)   | 38.46% (5/13)   | 70.00% (7/10)   |
| contracts/AegisSentinelRegistry.sol           | 97.83% (90/92)   | 92.79% (103/111) | 66.67% (16/24)  | 100.00% (12/12) |
| contracts/AegisVault.sol                      | 95.37% (103/108) | 88.98% (113/127) | 57.14% (16/28)  | 100.00% (13/13) |
| contracts/adapters/HyperCoreOracleAdapter.sol | 100.00% (6/6)    | 100.00% (10/10)  | 100.00% (1/1)   | 100.00% (1/1)   |
| contracts/core/TradeIntentExecutor.sol        | 100.00% (19/19)  | 96.15% (25/26)   | 80.00% (4/5)    | 100.00% (4/4)   |
| test/invariants/handlers/VaultHandler.sol     | 100.00% (92/92)  | 100.00% (96/96)  | 100.00% (9/9)   | 100.00% (11/11) |
| test/mocks/MockERC20.sol                      | 100.00% (8/8)    | 100.00% (4/4)    | 100.00% (0/0)   | 100.00% (4/4)   |
| test/mocks/MockHyperCorePrecompile.sol        | 82.35% (14/17)   | 85.71% (12/14)   | 100.00% (3/3)   | 80.00% (4/5)    |
| test/mocks/MockHyperCoreWriter.sol            | 78.95% (15/19)   | 75.00% (9/12)    | 25.00% (1/4)    | 100.00% (5/5)   |
| Total                                         | 66.67% (406/609) | 61.97% (435/702) | 55.00% (55/100) | 86.84% (66/76)  |
╰-----------------------------------------------+------------------+------------------+-----------------+-----------------╯
```

---

## 5. Remaining Risks and External Dependencies

1. **Elysium Testnet Precompile Availability (SEC-02)**:
   - On Elysium testnet, addresses `0x0801` (Oracle) and `0x0802` (Order Writer) currently return empty data (`0x`), indicating the testnet node has not yet provisioned these precompiles.
   - Because `AegisVault.sol` now strictly queries `0x0801` in both `getVaultHealth()` and `executeUnwindIntent()`, on-chain executions on live testnet will revert with `PrecompileReadFailed(perpIndex)` until the Elysium core development team enables these precompiles.
   - This fail-closed architecture protects user funds from trading on stale or non-existent markets.
2. **Keeper Signature Standard**:
   - The contract verifies buy-to-close unwind intents with `int256(hedge.size)` and `exitPrice` matching the Phase 1A keeper remediation.
   - Any third-party keeper submitting unwinds must ensure its signing digest passes `size: int256(hedge.size)`.
3. **Ascend AMM Pool Liquidity**:
   - `AegisFeeCollector` performs swaps via `ascendHookPool.swap()`. Live performance fees depend on adequate $AEGIS/USDC pool liquidity on Ascend.

---

## 6. Deployment and Upgrade Implications

### 6.1 Architectural Upgrade Analysis
The deployed contracts in `deployments.json` are **immutable** standard Solidity contracts without proxy delegators (no ERC-1967 or UUPS proxies):
- `AegisVault`: `0x05Aa229Aec102f78CE0E852A812a388F076Aa555`
- `SentinelRegistry`: `0x1275D096B9DBf2347bD2a131Fb6BDaB0B4882487`
- `FeeCollector`: `0xC6bA8C3233eCF65B761049ef63466945c362EdD2`

### 6.2 Contracts Requiring New Instances Upon Redeployment
1. **`AegisVault.sol`**:
   - Must be redeployed as a new contract instance to incorporate the double-hedge guard, `updateLowestWick()`, and oracle-validated unwind logic.
   - Constructor: `AegisVault(address initialOwner)`. No constructor argument changes.
2. **`AegisSentinelRegistry.sol`**:
   - Must be redeployed as a new contract instance to instantiate the 7-day unbonding cooldown storage mapping and two-step exit functions.
   - Constructor: `AegisSentinelRegistry(address _aegisToken, address initialOwner)`. No constructor argument changes.
3. **`AegisFeeCollector.sol`**:
   - The existing contract instance at `0xC6bA8C3233eCF65B761049ef63466945c362EdD2` can be retained without redeployment because its code is unchanged. However, its access control mapping must authorize the new vault instance.

### 6.3 Required Authorization and Linking Steps for Future Deployment
When governance or the deployer executes a future deployment script:
1. Deploy `newSentinelRegistry = new AegisSentinelRegistry(aegisToken, admin)`.
2. Deploy `newVault = new AegisVault(admin)`.
3. Link Vault to FeeCollector: `newVault.setFeeCollector(address(feeCollector))`.
4. Authorize New Vault on FeeCollector: `feeCollector.setAuthorizedVault(address(newVault), true)`.
5. Authorize New Vault on SentinelRegistry: `newSentinelRegistry.setAuthorizedSlasher(address(newVault), true)`.
6. Revoke permissions from deprecated `oldVault` on `feeCollector`.

### 6.4 Migration Mechanism for Existing Users and Positions
Because `AegisVault` does not custody user tokens (Invariant `INV-1`), user collateral remains in their own wallet or lending protocol at all times.
- **Borrower Migration**: Users simply invoke `registerPosition()`, `setProConfig()`, and `delegateSessionKey()` on the new vault address. No asset withdrawal or token transfer is necessary.
- **Sentinel Migration**: Sentinels currently bonded in the old registry can call `exitSentinel()` on the old registry (which unstakes immediately without delay in the v1 contract), approve the new registry, and call `bondStake(25_000 ether)` on the new registry.

### 6.5 Live Deployments Kept Untouched
In strict accordance with the Phase 1B operating rules:
- **Zero transactions have been broadcast.**
- **No live contracts have been redeployed.**
- `deployments.json` remains completely unmodified.

---

## 7. Decisions Requiring Human Approval

1. **Unbonding Cooldown Duration**:
   - Implemented a 7-day unbonding delay (`7 days`), which is industry standard for PoS and decentralized keeper networks (e.g., Cosmos, Chainlink, EigenLayer). Please confirm if AEGIS governance prefers an alternative duration (e.g. 3 days or 14 days) prior to future mainnet deployment.
2. **Scheduling Contract Redeployment**:
   - Confirm whether the new `AegisVault` and `AegisSentinelRegistry` should be deployed to Elysium testnet immediately or held until the Elysium core team confirms the provisioning of precompiles `0x0801` and `0x0802`.

---
*End of Phase 1B Security Report*
