# AEGIS Protocol — Phase 1B.2: Sentinel Lifecycle Security Remediation Report

**Date**: October 14, 2026  
**Auditor / Engineer**: Senior Solidity Security Engineer  
**Scope**: Sentinel node lifecycle (registration, active service, exit initiation, 7-day cooldown, withdrawal finalization, and re-entry accountability)  
**Status**: Verification & Regression Testing Complete (Local Foundry Environment Only)  

---

## 1. Original Re-Registration Finding & Reproduction Evidence

### 1.1 The Reported Gap (`HIGH-02`)
In `AEGIS_PHASE1B1_INDEPENDENT_REVIEW.md`, finding `HIGH-02` highlighted that:
1. Following a finalized exit (`finalizeExitSentinel()` / `exitSentinel()`), `unbondingTimestamps[operator]` is reset to `0` and `bondedAmount` becomes `0`.
2. The operator is immediately eligible to re-bond by depositing $\ge 25{,}000\ \text{\$AEGIS}$ (`MIN_BOND`) via `bondStake()`.
3. Historical `slashCount` carries over in storage, but does not gate or penalize re-registration.
4. If an SLA breach occurred prior to exit but was not prosecuted by an authorized slasher during the 7-day unbonding cooldown, the contract cannot enforce that penalty once funds are withdrawn.
5. No regression tests existed in the repository specifically validating the re-registration path and state consistency.

### 1.2 Reproduction Evidence (Local Test Proof)
Using a dedicated reproduction test (`test_SentinelLifecycle_SlashingObligation_CannotSlashAfterWithdrawal`):
- When an operator exits and finalizes withdrawal, `node.bondedAmount` is set to `0` and all tokens are transferred out.
- If a slasher subsequently attempts to call `slashSentinel(operator, victim, 1000, ...)`:
  ```solidity
  SentinelNode storage node = sentinels[operator];
  if (node.bondedAmount == 0) revert InsufficientBondAmount();
  ```
  The slash transaction reverts with `InsufficientBondAmount` because the contract does not hold an active bond for that operator.
- However, if the operator re-registers with a fresh `25,000 $AEGIS` bond (`test_SentinelLifecycle_ReRegistration_PreservesHistoricalSlashCount`), the slasher can immediately penalize the newly posted bond.

---

## 2. Intended Lifecycle Policy & Protocol Evidence

Based on `SPECIFICATION.md`, `README.md`, `contracts/AegisSentinelRegistry.sol`, and formal Invariant `INV-2`, the intended lifecycle policies are established as follows:

### 2.1 Four Operational Categories

| Sentinel Category | Intended Protocol Behavior | Evidence in Specifications |
|---|---|---|
| **1. Honest Exited Sentinel** | **Permitted to re-enter freely** upon depositing $\ge 25{,}000\ \text{\$AEGIS}$. | Standard node lifecycle in decentralized networks. Honest decommissioning and re-commissioning of keeper hardware must not permanently lock capital or block re-entry. |
| **2. Previously Slashed Sentinel** | **Permitted to re-enter IF full fresh $\ge 25{,}000\ \text{\$AEGIS}$ bond is posted.** `slashCount` is preserved monotonically. | Invariant `INV-2` specifies that `slashCount` is a cumulative counter (`SPECIFICATION.md:295`). Economic security in AEGIS is collateral-backed ($25\text{k}\ \text{\$AEGIS}$ at risk), not reputation-gated. If bond drops below $25\text{k}$, node is deactivated, but can be restored by depositing additional capital. |
| **3. Sentinel with Unprosecuted Infraction** | **Must be slashed during the 7-day cooldown.** Cannot be slashed post-withdrawal when bond is 0. | The 7-day `UNBONDING_COOLDOWN` was designed precisely to provide a 7-day arbitration window (`AEGIS_PHASE1B_SECURITY_REPORT.md:57-66`). The contract cannot custody negative balances. |
| **4. Evasion by Rapid Exit & Re-entry** | **Blocked.** 7-day cooldown cannot be bypassed, shortened, or reset. | `initiateExitSentinel()` deactivates node immediately. `bondStake` reverts with `CooldownActive` throughout the 7 days. Funds remain locked and slashable. |

### 2.2 Preserving Slashing Accountability
- Slashing accountability is strictly bound to the **bonded capital locked in the contract**.
- During active service: $100\%$ of bond is slashable up to $10\%$ per infraction (`INV-2`).
- During 7-day unbonding: $100\%$ of remaining bond is locked and slashable up to $10\%$ per infraction (`INV-2`).
- Post-withdrawal: Account holds $0$ bond; subsequent slashing requires either re-registration (new bond at risk) or off-chain / cross-contract credit claims.

---

## 3. Files Changed and Technical Rationale

### 3.1 Contract Implementation Scope
In strict adherence to rule 9 ("*Do not implement a permanent ban, arbitrary slashCount threshold or new governance mechanism without evidence that the protocol specifications require it*"):
- **Zero arbitrary thresholds were added** to `contracts/AegisSentinelRegistry.sol`.
- The existing contract logic already enforces:
  1. `UNBONDING_COOLDOWN = 7 days` on all exits.
  2. Immediate deactivation upon exit initiation.
  3. Reversion (`CooldownActive`) on attempts to `bondStake`, `unstake`, or re-initiate during cooldown.
  4. Monotonic preservation of `slashCount` and `successfulHedges` across exit and re-entry cycles.
  5. Prevention of double-withdrawals (`NoUnbondRequest`).

### 3.2 Test Suite Updates (`test/unit/SentinelRegistry.t.sol`)
Added 7 comprehensive regression tests (+254 lines of Solidity) directly validating all state transitions, boundary conditions, and invariant conservation across repeated lifecycles.

---

## 4. Tests Added and Actual Verification Results

### 4.1 New Regression Tests in `test/unit/SentinelRegistry.t.sol`

1. **`test_SentinelLifecycle_ExitAndReRegistration_Success`**:
   - Validates: Initial bond $\rightarrow$ recorded hedge $\rightarrow$ exit initiation $\rightarrow$ mid-cooldown bond rejection $\rightarrow$ 7-day warp $\rightarrow$ withdrawal finalization $\rightarrow$ fresh re-registration.
   - Result: **PASS** (gas: 199,521). All telemetry (`successfulHedges = 1`, `slashCount = 0`) correctly preserved.

2. **`test_SentinelLifecycle_ReRegistration_PreservesHistoricalSlashCount`**:
   - Validates: Active slash ($10\%$) $\rightarrow$ exit initiation $\rightarrow$ cooldown slash ($10\%$) $\rightarrow$ withdrawal of remaining balance $\rightarrow$ re-registration with $25{,}000\ \text{\$AEGIS}$.
   - Result: **PASS** (gas: 241,422). Proves `slashCount` remains `2` upon re-entry and increments to `3` upon subsequent penalty.

3. **`test_SentinelLifecycle_SlashingObligation_CannotSlashAfterWithdrawal`**:
   - Validates: Slasher attempting to penalize an operator who has finalized exit and holds 0 bond.
   - Result: **PASS** (gas: 137,752). Reverts with `InsufficientBondAmount`.

4. **`test_SentinelLifecycle_RepeatedExitCallsDoNotCorruptState`**:
   - Validates: Multiple calls to `exitSentinel()`, `initiateExitSentinel()`, and `finalizeExitSentinel()` after completion.
   - Result: **PASS** (gas: 141,820). Reverts cleanly with `InsufficientBondAmount` or `NoUnbondRequest`.

5. **`test_SentinelLifecycle_FailedReRegistrationDoesNotCorruptState`**:
   - Validates: Attempting to re-register with $0$ or $< 25{,}000\ \text{\$AEGIS}$.
   - Result: **PASS** (gas: 138,520). State remains zeroed and uncorrupted.

6. **`test_SentinelLifecycle_CannotReRegisterBeforeFinalizingEvenPastCooldown`**:
   - Validates: Warping 8 days past cooldown without calling `finalizeExitSentinel()`.
   - Result: **PASS** (gas: 189,542). Proves `bondStake` reverts with `CooldownActive` until finalization is executed.

7. **`test_SentinelLifecycle_MultipleExitAndReRegistrationCycles`**:
   - Validates: 3 consecutive cycles of bonding, slashing ($5\%$), unbonding (7 days), and withdrawal.
   - Result: **PASS** (gas: 341,142). Proves exact token balance conservation in victim, registry, and operator wallets.

### 4.2 Comprehensive Test Execution Output
- `forge test --match-contract SentinelRegistryTest`: **26 passed, 0 failed, 0 skipped** (7 new tests + 19 pre-existing).
- Full `forge test` suite: **74 passed, 0 failed, 0 skipped** across all 12 test suites (5 invariant suites with 163,840+ stateful calls passed cleanly).
- `npm --prefix keeper test`: **17 passed, 17 total**.

---

## 5. Remaining Limitations & Identity-Based Circumvention

1. **Sybil / Address Rotation**:
   - Any operator can generate a new EVM private key, fund it with $25{,}000\ \text{\$AEGIS}$, and register as a fresh Sentinel.
   - On-chain smart contract registries cannot prevent identity rotation without KYC, decentralized proof-of-humanity, or permissioned allowlists.
   - In AEGIS, this is economically mitigated because **every new identity must lock $25{,}000\ \text{\$AEGIS}$ of real capital**, which is immediately subject to slashing.

2. **Unprosecuted Slashing Obligations**:
   - If an off-chain keeper monitor detects an SLA violation on Day 1, but fails to submit `slashSentinel()` during the 7-day cooldown, the capital is withdrawn on Day 7.
   - If the protocol requires pursuing uncollected penalties across addresses or post-withdrawal, it would require an on-chain **Slashing Debt Ledger** (where unbonded addresses accumulate an enforceable debt balance that must be settled upon any future deposit) or an on-chain **Dispute Escalation Window**.

---

## 6. Deployment and Migration Implications

- **Testnet Redeployment**: `AegisSentinelRegistry.sol` is ready for redeployment when testnet precompiles `0x0801` and `0x0802` are provisioned.
- **Migration from v1**: The deployed v1 registry (`0x1275D096B9DBf2347bD2a131Fb6BDaB0B4882487`) permits instant withdrawal. Before migrating Sentinels to the new registry, protocol administrators must ensure all outstanding v1 violations are slashed prior to announcing the migration.

---

## 7. Decisions Requiring Founder / Governance Approval

1. **Slashing Debt Ledger**:
   - Should Sentinels with uncollected SLA violations accumulate an on-chain debt that is automatically deducted if they re-register, or is the 7-day cooldown considered the definitive statute of limitations for SLA enforcement?
2. **Slash Count Gating**:
   - Should a high historical `slashCount` (e.g. $> 5$ or $> 10$ infractions) require governance review, an increased `MIN_BOND`, or an extended unbonding cooldown for that operator address?
3. **Unbonding Cooldown Parameter**:
   - Confirm that the `7 days` cooldown duration remains the approved standard for public testnet and mainnet.

---
*End of Phase 1B.2 Sentinel Lifecycle Security Remediation Report*
