# AEGIS Phase 1C.1: Independent Deferred Fee Debt Audit Report

**Auditor Role:** Senior Solidity Security Auditor (Independent Review)  
**Target:** Completed AEGIS Deferred Fee Debt Implementation (`Option B`)  
**Audit Scope:** Read-Only Verification  
**Repository State:** Local Development Baseline (`c:\Users\ascend X elysium`)  
**Audit Date:** October 14, 2026  

---

## 1. Executive Summary

This independent security review evaluated the Deferred Fee Debt implementation delivered in AEGIS Phase 1C against the project specifications, architectural requirements, and invariant guarantees documented in [SPECIFICATION.md](file:///c:/Users/ascend%20X%20elysium/SPECIFICATION.md), [DESIGN.md](file:///c:/Users/ascend%20X%20elysium/DESIGN.md), [AEGIS_PHASE1C_FEE_RELIABILITY_REPORT.md](file:///c:/Users/ascend%20X%20elysium/AEGIS_PHASE1C_FEE_RELIABILITY_REPORT.md), and [AEGIS_PHASE1C_DEFERRED_FEE_DEBT_REPORT.md](file:///c:/Users/ascend%20X%20elysium/AEGIS_PHASE1C_DEFERRED_FEE_DEBT_REPORT.md).

### Summary of Audit Verdict
- **Deferred Debt Recording:** Verified. Failed fee collections cleanly transition to on-chain debt in [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) without blocking unwind completion.
- **Accrual Accuracy:** Verified. Debt is calculated as the net 10% protocol fee owed ($0.50\%$ of collateral valuation), NOT the gross 5% saved penalty.
- **Token Transfer & Authorization:** Verified. Repayments debit exclusively `msg.sender`'s USDC balance. The `repayFeeDebtFor` function cannot be exploited to debit funds from an arbitrary borrower.
- **Surplus Bypass Fix:** Verified. The check allowing pre-funded fee-collector balances to bypass `safeTransferFrom` was removed.
- **Flywheel Allocation & Invariant INV-4:** Verified. Repayments are split exactly 50/50 between buyback and yield budgets without double fee discounting.
- **Risk Invariants:** Verified. Unwinding, emergency manual override, session-key management, and lowest-wick ratchet remain strictly non-blocking.
- **Test Integrity:** All 12 test suites (98 Foundry tests, including all 5 formal invariant suites) and all 17 keeper regression tests passed with zero failures.

---

## 2. Repository Baseline & Files Inspected

### 2.1 Git Status & Scope Isolation
A strict git status check verified that no deployment records or live states were touched. The audit inspected the following files in detail:
- [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol)
- [contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol)
- [contracts/interfaces/IAegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisVault.sol)
- [contracts/interfaces/IAegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisFeeCollector.sol)
- [contracts/AegisTypes.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisTypes.sol)
- [test/unit/AegisVault.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/AegisVault.t.sol)
- [test/unit/FeeCollector.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/FeeCollector.t.sol)
- [test/invariants/InvariantFeeSplit.t.sol](file:///c:/Users/ascend%20X%20elysium/test/invariants/InvariantFeeSplit.t.sol)
- [test/invariants/handlers/VaultHandler.sol](file:///c:/Users/ascend%20X%20elysium/test/invariants/handlers/VaultHandler.sol)

### 2.2 Phase 1C Modifications Identified
1. **[contracts/AegisTypes.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisTypes.sol):** Added `error NoOutstandingDebt()` and `error ZeroRepaymentAmount()`.
2. **[contracts/interfaces/IAegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisFeeCollector.sol):** Added `processFeeDebtPayment` and event `FeeDebtPaymentProcessed`.
3. **[contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol):**
   - Removed vulnerable surplus bypass check (`usdcToken.balanceOf < ...`).
   - Implemented `processFeeDebtPayment(address payer, address vaultOwner, uint256 feeAmount)`.
4. **[contracts/interfaces/IAegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisVault.sol):** Declared events `FeeDebtAccrued`, `FeeDebtRepaid` and methods `repayFeeDebt`, `repayFeeDebtFor`, `getFeeDebt`.
5. **[contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol):**
   - Added constant `PROTOCOL_FEE_BPS = 1000` (10%).
   - Added mapping `feeDebts[address]`.
   - Updated catch block in `executeUnwindIntent` to accrue debt.
   - Implemented `repayFeeDebt`, `repayFeeDebtFor`, `_repayFeeDebt`, and `getFeeDebt`.
6. **[test/unit/FeeCollector.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/FeeCollector.t.sol) & [test/unit/AegisVault.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/AegisVault.t.sol):** Added regression coverage for surplus reverts, partial/full repayments, third-party repayments, and failure modes.

---

## 3. Debt Calculation and Accounting Verification

### 3.1 Trace of Unwind and Debt Accrual
In [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol):
```solidity
uint256 valuationPrice = liveMarkPrice < exitPrice ? liveMarkPrice : exitPrice;
uint256 colValUsdc = (uint256(pos.collateralAmount) * valuationPrice) / 1e20;
uint256 savedPenalty = (colValUsdc * 500) / 10000;
if (savedPenalty > 0) {
    try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
    catch (bytes memory reason) {
        emit FeeCollectionFailed(vaultOwner, savedPenalty, reason);
        uint256 protocolFee = (savedPenalty * PROTOCOL_FEE_BPS) / 10000;
        if (protocolFee > 0) {
            feeDebts[vaultOwner] += protocolFee;
            emit FeeDebtAccrued(vaultOwner, protocolFee, feeDebts[vaultOwner]);
        }
    }
}
```

### 3.2 Audit Verification of Units & Math
1. **Collateral & Price Units:**
   - `pos.collateralAmount` has 18 decimals ($10^{18}$).
   - `valuationPrice` (from HyperCore oracle adapter or exit limit) has 8 decimals ($10^8$).
   - Multiplied: $10^{18} \times 10^8 = 10^{26}$.
   - Divided by $10^{20}$: $10^{26} / 10^{20} = 10^6$ (exact USDC decimal representation).
2. **Saved Penalty:**
   - 500 basis points ($5\%$) of `colValUsdc`: $\text{savedPenalty} = (colValUsdc \times 500) / 10000$.
3. **Protocol Fee Calculation Consistency:**
   - In `AegisFeeCollector.processAvertedFee`:
     $$\text{fee} = \frac{\text{savedPenalty} \times \text{PROTOCOL\_FEE\_BPS}}{10000} \quad (\text{PROTOCOL\_FEE\_BPS} = 1000 = 10\%)$$
   - In `AegisVault.executeUnwindIntent` (catch block):
     $$\text{protocolFee} = \frac{\text{savedPenalty} \times \text{PROTOCOL\_FEE\_BPS}}{10000} \quad (\text{PROTOCOL\_FEE\_BPS} = 1000 = 10\%)$$
   - **Finding:** The deferred debt accrued matches the exact amount that would have been transferred in a successful immediate collection. **Gross saved penalty is never recorded as debt.**
4. **Rounding & Zero-Dust Handling:**
   - If `savedPenalty < 10` wei, `protocolFee` truncates to 0. The check `if (protocolFee > 0)` prevents zero-value debt accrual or redundant events.
5. **External Revert Resilience:**
   - Because `feeDebts` storage resides in `AegisVault.sol`, any revert in `AegisFeeCollector.processAvertedFee` (due to missing approval, 0 balance, unhandled reentrancy, or paused collector) transfers control to the local `catch` block. The local debt record is created successfully.
6. **Anti-Duplication:**
   - `executeUnwindIntent` sets `hedge.isOpen = false` before fee processing. Any subsequent attempt to unwind the same hedge reverts immediately with `InvalidHealthTrigger()`, preventing duplicate debt accrual.

---

## 4. Repayment Authorization and Token-Flow Analysis

### 4.1 Execution Flow of Repayment
In [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol):
```solidity
function repayFeeDebt(uint256 amount) external override returns (uint256 repaid) {
    return _repayFeeDebt(msg.sender, msg.sender, amount);
}

function repayFeeDebtFor(address borrower, uint256 amount) external override returns (uint256 repaid) {
    return _repayFeeDebt(msg.sender, borrower, amount);
}

function _repayFeeDebt(
    address payer,
    address borrower,
    uint256 amount
) internal nonReentrant returns (uint256 repaid) {
    if (amount == 0) revert ZeroRepaymentAmount();
    if (borrower == address(0)) revert ZeroAddress();

    uint256 currentDebt = feeDebts[borrower];
    if (currentDebt == 0) revert NoOutstandingDebt();

    if (feeCollector == address(0)) revert ZeroAddress();

    repaid = amount > currentDebt ? currentDebt : amount;

    // Collect payment via fee collector
    IAegisFeeCollector(feeCollector).processFeeDebtPayment(payer, borrower, repaid);

    // Update accounting after external call succeeds
    uint256 remainingDebt = currentDebt - repaid;
    feeDebts[borrower] = remainingDebt;

    emit FeeDebtRepaid(borrower, payer, repaid, remainingDebt);
}
```

### 4.2 Security Analysis of Token Flow
1. **Who is debited?**
   - In both `repayFeeDebt` and `repayFeeDebtFor`, the internal parameter `payer` is hardcoded to `msg.sender`.
   - In `AegisFeeCollector.processFeeDebtPayment`, the transfer is:
     `usdcToken.safeTransferFrom(payer, address(this), feeAmount);`
   - **Auditor Verification:** It is impossible for an attacker to call `repayFeeDebtFor(victim, amount)` and cause `victim`'s USDC to be transferred. The transfer is debited strictly from `msg.sender`.
2. **Allowance Consumption:**
   - Consumes exclusively `payer`'s (`msg.sender`'s) allowance to `AegisFeeCollector`.
3. **Recipient of Funds:**
   - `address(this)` of `AegisFeeCollector`.
4. **Failure Modes:**
   - If `safeTransferFrom` reverts (e.g., payer has insufficient balance or allowance), the entire call reverts.
   - `feeDebts[borrower]` is updated **only after** `processFeeDebtPayment` returns successfully.
   - Debt cannot be erased or partially reduced on a failed external call.
5. **Third-Party Repayment Policy:**
   - Third-party repayment is fully supported and safe. Any sponsor, liquidation bot, or friend can clear a borrower's debt without creating accounting inconsistencies.

---

## 5. Double-Charging and Fee-Allocation Analysis

### 5.1 Verification of Allocation Logic
In [contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol):
```solidity
function processFeeDebtPayment(
    address payer,
    address vaultOwner,
    uint256 feeAmount
) external override onlyVaultOrOwner nonReentrant {
    if (feeAmount == 0) revert ZeroAmount();
    if (payer == address(0) || vaultOwner == address(0)) revert ZeroAddress();

    // Transfer USDC fee to collector directly from payer
    usdcToken.safeTransferFrom(payer, address(this), feeAmount);

    // Invariant INV-4: Exact 50/50 split with zero rounding loss
    uint256 buybackShare = feeAmount / 2;
    uint256 yieldShare = feeAmount - buybackShare;

    buybackBudget += buybackShare;
    yieldBudget += yieldShare;
    totalFeesCaptured += feeAmount;

    emit FeeDebtPaymentProcessed(payer, vaultOwner, feeAmount, buybackShare, yieldShare);
}
```

### 5.2 Verification Points
1. **No Double Discounting:**
   - `AegisVault` passes `repaid`, which was derived from `protocolFee` ($F_{protocol}$).
   - `processFeeDebtPayment` does **not** re-apply `PROTOCOL_FEE_BPS`. It treats `feeAmount` directly as the net protocol fee to be split.
2. **Invariant INV-4 Conservation:**
   - `buybackShare = feeAmount / 2;`
   - `yieldShare = feeAmount - buybackShare;`
   - $\text{buybackShare} + \text{yieldShare} = \text{feeAmount}$ holds identically for all even and odd integers.
   - Zero rounding leakage exists.
3. **Collector Surplus Bypass Elimination:**
   - The conditional check `if (usdcToken.balanceOf(address(this)) < (buybackBudget + yieldBudget + fee))` was eliminated.
   - Both `processAvertedFee` and `processFeeDebtPayment` unconditionally execute `safeTransferFrom`.
   - Contract surplus can never satisfy a borrower's debt.

---

## 6. Unwind Safety and Failure-Path Analysis

### 6.1 Non-Blocking Risk-Reducing Operations
The audit verified every critical risk management function in [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) to ensure borrowers with active fee debt are not restricted:
- **`manualOverride()`**: Contains zero references to `feeDebts`. A debtor can execute manual override at any time to revoke session keys and gain emergency manual control.
- **`executeUnwindIntent()`**: Contains zero restrictions based on `feeDebts`. A debtor with prior debt can have subsequent hedges unwound without issue (new debt will add cumulatively).
- **`delegateSessionKey()` & `revokeSessionKey()`**: Contain zero references to `feeDebts`. Session keys can be refreshed or revoked freely.
- **`updateLowestWick()`**: Continues tracking lows for debtors.

### 6.2 New Position Policy
`registerPosition` currently contains no checks on `feeDebts`. In accordance with founder requirement #7, policy restrictions on opening new positions remain deferred for governance specification and do not block risk reduction.

---

## 7. Actual Test Command Results

As mandated, all commands were executed locally without altering source code:

### 7.1 Compilation (`forge build`)
- **Command:** `forge build`
- **Result:** Success (Exit code: `0`)
- **Compiler Output:** Compiled with Solc 0.8.24 via IR.

### 7.2 Foundry Tests (`forge test -vvv`)
- **Command:** `forge test -vvv`
- **Result:** **98 tests passed, 0 failed across 12 test suites** (Exit code: `0`)

#### Key Test Results:
1. **`test_ExecuteUnwindIntent_FeeDebt_AccruesExactDebtWhenInsufficientAllowance()`**: Passed. Proves unwind closes and exact 21 USDC debt accrues when allowance is less than fee.
2. **`test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenMissingApproval()`**: Passed. Proves unwind closes when approval is 0 and records exact debt.
3. **`test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenInsufficientBalance()`**: Passed. Proves debt records when balance is 0.
4. **`test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenFeeCollectorReverts()`**: Passed. Proves external collector revert cannot prevent debt accrual.
5. **`test_FeeDebt_RepayPartialAndFull_SucceedsWithExactAccounting()`**: Passed. Proves partial repayment (10 USDC), capped full repayment (50 USDC request with 11 USDC balance owed), and revert on zero debt.
6. **`test_FeeDebt_RepayFeeDebtFor_ThirdPartyPayer()`**: Passed. Proves third-party repayment debits sponsor, clears borrower debt, and updates collector budgets.
7. **`test_FeeDebt_RepaymentFailure_DoesNotCorruptDebt()`**: Passed. Proves failed repayment leaves debt unchanged.
8. **`test_FeeDebt_RepeatedUnwind_CannotCreateDuplicateDebt()`**: Passed. Proves repeated call reverts with `InvalidHealthTrigger` without duplicate debt.
9. **`test_ProcessAvertedFee_PreFundedCollectorDoesNotBypassAllowance_Reverts()`**: Passed. Proves pre-funded collector cannot bypass `safeTransferFrom`.
10. **`invariant_INV4_StrictFeeConservation()`**: Passed (256 runs, 32,768 calls, 0 reverts).
11. **`invariant_INV1_ZeroSentinelTokenAllowance()` & `invariant_INV1_ZeroVaultCollateralCustody()`**: Passed (256 runs, 32,768 calls each).
12. **`invariant_INV3_ManualOverrideGuaranteesZeroKey()`**: Passed (256 runs, 32,768 calls).

### 7.3 Keeper Tests (`npm --prefix keeper test`)
- **Command:** `npm --prefix keeper test`
- **Result:** **17 passed, 17 total across 3 suites** (Exit code: `0`)
  - `risk_engine.test.ts`: Passed
  - `unwind_signature.test.ts`: Passed
  - `oracle_fail_closed.test.ts`: Passed

---

## 8. Findings, Severity and Evidence

### [LOW-01] Decimal Scaling Assumption in Collateral Valuation
- **File:** [contracts/AegisVault.sol:340](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L340)
- **Code:**
  ```solidity
  uint256 colValUsdc = (uint256(pos.collateralAmount) * valuationPrice) / 1e20;
  ```
- **Reasoning:** The valuation formula divides by $10^{20}$, implicitly assuming `pos.collateralAmount` is scaled to 18 decimals ($10^{18} \times 10^8 / 10^{20} = 10^6$). If a future asset with 8 decimals (e.g. WBTC) or 6 decimals (e.g. native USDT) is used as collateral without normalizing to 18 decimals, `colValUsdc` will truncate to 0, resulting in zero fee collection and zero fee debt.
- **Impact:** Low for current testnet (where collateral is 18 decimals).
- **Recommendation:** Document this 18-decimal prerequisite in contract NatSpec or introduce token decimal normalization when multi-collateral vault support is enabled.

### [LOW-02] Uncapped Fee Debt Accumulation Across Multiple Positions
- **File:** [contracts/AegisVault.sol:84](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L84)
- **Reasoning:** In accordance with Requirement 7, `registerPosition` does not check `feeDebts[msg.sender]`. A debtor can theoretically open new positions and experience repeated unwinds without ever repaying fee debts.
- **Impact:** Low for testnet; potential griefing/economic loss on mainnet if borrowers repeatedly default on protocol fees.
- **Recommendation:** Prior to mainnet, introduce a governance-configurable parameter `maxOutstandingDebtUsdc` in `registerPosition`.

### [INFORMATIONAL-01] Repayment Gating when FeeCollector is Unset
- **File:** [contracts/AegisVault.sol:393](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L393)
- **Reasoning:** `_repayFeeDebt` reverts with `ZeroAddress()` if `feeCollector == address(0)`. If governance temporarily unsets `feeCollector`, repayments cannot occur until restored.
- **Impact:** Informational; this is safe behavior because it prevents debt reduction without token transfer.

---

## 9. Conclusion and Deployment Readiness

The Phase 1C Deferred Fee Debt implementation demonstrates high technical rigor, exact mathematical accounting, and strict adherence to founder requirements and protocol invariants.

### Audit Checklist Status
- [x] Protective unwinds complete unconditionally on fee collection failure.
- [x] Debt accurately reflects the 10% protocol fee owed, not gross saved penalty.
- [x] External fee-collector reverts cannot prevent debt recording.
- [x] Fee accrual and repayment are strictly idempotent.
- [x] Outstanding debt decreases only upon successful token transfer and accounting updates.
- [x] Repayments debit exclusively the caller (`msg.sender`).
- [x] Risk-reducing operations are never blocked for debtors.
- [x] Pre-existing fee-collector balances cannot bypass `safeTransferFrom`.
- [x] Protocol fee split (50/50) and Invariant INV-4 are preserved.

**Operational Boundary Notice:** No contracts were deployed, no transactions were broadcast, and all untracked and modified repository files have been preserved. This phase is complete; awaiting founder instructions before any deployment activity.
