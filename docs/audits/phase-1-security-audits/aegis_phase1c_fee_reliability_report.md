# AEGIS Protocol — Phase 1C: Fee Collection & Accounting Reliability Report

**Date**: October 14, 2026  
**Role**: Senior Solidity Security Engineer & Protocol Accounting Specialist  
**Scope**: Fee capture, token approval, collection failure handling, 50/50 allocation mechanics, and unwind observability  
**Status**: Verification, Failure Reproduction, Nonce/Hedge Safety Proof, and Observability Hardening Complete (Local Foundry Environment Only)  

---

## 1. Verified Root Cause

### 1.1 The Silent Fee Collection Vulnerability (`MED-02`)
In `contracts/AegisVault.sol` (lines 329–338), the averted liquidation penalty fee processing was implemented as:
```solidity
if (feeCollector != address(0)) {
    uint256 valuationPrice = liveMarkPrice < exitPrice ? liveMarkPrice : exitPrice;
    uint256 colValUsdc = (uint256(pos.collateralAmount) * valuationPrice) / 1e20;
    uint256 savedPenalty = (colValUsdc * 500) / 10000;
    if (savedPenalty > 0) {
        try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
        catch {} // <-- SILENT SWALLOW
    }
}
```
When `processAvertedFee(vaultOwner, savedPenalty)` is executed in `contracts/AegisFeeCollector.sol` (lines 120–122):
```solidity
if (usdcToken.balanceOf(address(this)) < (buybackBudget + yieldBudget + fee)) {
    usdcToken.safeTransferFrom(vaultOwner, address(this), fee);
}
```
The fee collector attempts to pull USDC from the borrower (`vaultOwner`) via `safeTransferFrom`. If:
1. The borrower has not approved `AegisFeeCollector` for USDC; or
2. The borrower approved an insufficient allowance; or
3. The borrower has insufficient liquid USDC balance in their wallet; or
4. The `AegisFeeCollector` contract reverts (e.g. unverified vault caller, paused token, or reentrancy)

Then `safeTransferFrom` reverts. Because the entire call was wrapped in an empty `catch {}` block:
- **The failure was silently dropped without any on-chain record.**
- **Zero fee was transferred**, zero budget was credited, and zero metrics were incremented.
- **The unwind completed successfully**, closing the hedge on HyperCore CLOB (`0x0802`).
- Off-chain indexers, keep daemons, and protocol dashboards had no mechanism to know whether a fee was collected, skipped, or failed.

---

## 2. Existing and Intended Fee-Accounting Behavior

### 2.1 Complete Flow Tracing

```
[Collateral Valuation]
   pos.collateralAmount (1e18) * valuationPrice (1e8) / 1e20 = colValUsdc (1e6)
         │
         ▼
[Averted Liquidation Penalty]
   colValUsdc * 500 / 10000 = savedPenalty (5% of collateral value in 1e6 USDC)
         │
         ▼
[Protocol Performance Fee]
   savedPenalty * 1000 / 10000 = fee (10% of saved penalty = 0.5% of total collateral value)
         │
         ▼
[USDC Pull Attempt]
   Does FeeCollector already have surplus balance >= (buybackBudget + yieldBudget + fee)?
      ├─ YES: Use existing balance (no transferFrom needed)
      └─ NO:  usdcToken.safeTransferFrom(vaultOwner, FeeCollector, fee)
         │
         ├─ SUCCEEDS:
         │    buybackBudget += fee / 2
         │    yieldBudget   += fee - (fee / 2)   [Invariant INV-4: exact 50/50 split]
         │    totalFeesCaptured += fee
         │    emit FeeProcessed(...)
         │
         └─ REVERTS:
              Caught by AegisVault catch block
              (Emits FeeCollectionFailed with reason, preserves unwind safety)
```

### 2.2 Mathematical Soundness & Decimals
- **Collateral Decimals**: $18$ decimals ($10^{18}$).
- **Oracle Price Decimals**: $8$ decimals ($10^8$).
- **USDC Decimals**: $6$ decimals ($10^6$).
- **Scaling Product**: $\frac{10^{18} \times 10^8}{10^{20}} = 10^6$ (Exact USDC units).
- **Rounding Behavior**: In `fee / 2` and `fee - buybackShare`, odd wei values are strictly allocated to `yieldBudget`, ensuring $0$ unallocated leakage (mathematically proven by Invariant `INV-4`).

---

## 3. Failure Scenarios Reproduced Locally

The following failure modes were systematically reproduced in unit tests:

| Test Name | Scenario Tested | Contract Behavior | Status |
|---|---|---|---|
| `test_ProcessAvertedFee_MissingUsdcApprovalReverts` | Borrower holds USDC but gave $0$ allowance to FeeCollector. | `safeTransferFrom` reverts with `ERC20InsufficientAllowance`. | **CONFIRMED** |
| `test_ProcessAvertedFee_InsufficientAllowanceReverts` | Borrower gave 50 USDC allowance, but fee was 100 USDC. | `safeTransferFrom` reverts with `ERC20InsufficientAllowance`. | **CONFIRMED** |
| `test_ProcessAvertedFee_InsufficientBorrowerBalanceReverts` | Borrower approved max, but has 0 USDC balance. | `safeTransferFrom` reverts with `ERC20InsufficientBalance`. | **CONFIRMED** |
| `test_ProcessAvertedFee_ZeroFeeDueToSmallPenaltyReverts` | Saved penalty $< 10$ wei ($< 0.00001$ USDC) rounds fee to $0$. | Reverts with `ZeroAmount`. | **CONFIRMED** |
| `test_ProcessAvertedFee_ZeroAddressVaultOwnerReverts` | `vaultOwner == address(0)` | Reverts with `ZeroAddress`. | **CONFIRMED** |
| `test_ProcessAvertedFee_PreFundedCollectorDoesNotPullFromUser` | FeeCollector has pre-existing surplus USDC. | Bypasses `safeTransferFrom`, credits budgets from internal balance. | **CONFIRMED** |
| `test_ProcessAvertedFee_ExactOddPennySplit` | 1 wei fee split. | Buyback = $0$, Yield = $1$. Strict conservation verified. | **CONFIRMED** |
| `test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenMissingApproval` | Unwind executed when borrower has no USDC allowance. | Unwind succeeds; emits `FeeCollectionFailed(borrower, savedPenalty, reason)`. | **CONFIRMED** |
| `test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenInsufficientBalance` | Unwind executed when borrower has no USDC balance. | Unwind succeeds; emits `FeeCollectionFailed(borrower, savedPenalty, reason)`. | **CONFIRMED** |
| `test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenFeeCollectorReverts` | Unwind executed when `feeCollector` has revoked `vault` permission. | Unwind succeeds; emits `FeeCollectionFailed(borrower, savedPenalty, reason)`. | **CONFIRMED** |
| `test_ExecuteUnwindIntent_FeeCollection_SuccessWhenApproved` | Full approval and liquid balance present. | Unwind succeeds; 100% fee collected and split 50/50. | **CONFIRMED** |

---

## 4. Files Changed and Technical Rationale

### 4.1 `contracts/interfaces/IAegisVault.sol`
- **Change**: Added `event FeeCollectionFailed(address indexed vaultOwner, uint256 savedPenaltyAmount, bytes reason);`.
- **Rationale**: Provides an unambiguous, on-chain signal whenever fee collection fails, distinguishing successful collections from dropped fees without requiring off-chain speculation.

### 4.2 `contracts/AegisVault.sol`
- **Change**: Modified the catch block in `executeUnwindIntent()` (line 336):
  ```solidity
  try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
  catch (bytes memory reason) {
      emit FeeCollectionFailed(vaultOwner, savedPenalty, reason);
  }
  ```
- **Rationale**:
  1. **Preserves Critical Unwind Safety**: Forcing an atomic revert if fee collection fails would prevent borrowers from unwinding protective short hedges on HyperCore when they lack USDC allowance. In a volatile market, that would result in liquidation or severe capital loss.
  2. **Eliminates Silent Swallowing**: Emits the exact revert bytes (e.g. `ERC20InsufficientAllowance`, `ERC20InsufficientBalance`, or `UnauthorizedCaller`), making all uncollected fees auditable and trackable.

### 4.3 `test/unit/FeeCollector.t.sol`
- Added 7 dedicated unit tests verifying allowance checks, balance checks, zero amounts, pre-funding bypass, and odd-wei splits.

### 4.4 `test/unit/AegisVault.t.sol`
- Added 4 integration tests verifying unwind behavior under approved, unapproved, zero-balance, and unauthorized collector scenarios.

---

## 5. Verification Commands and Actual Results

### 5.1 Foundry Build (`forge build`)
- **Command**: `forge build`
- **Exit Code**: `0` (Success)
- **Status**: Clean compilation with Solc 0.8.24 (`via_ir = true`).

### 5.2 Test Execution (`forge test -vvv`)
- **Command**: `forge test`
- **Exit Code**: `0` (Success)
- **Total Test Suites**: 12
- **Total Tests Passing**: **85 passed, 0 failed, 0 skipped** (85 total tests)
  - Pre-existing before Phase 1B.2: 67
  - Phase 1B.2 (Sentinel Lifecycle): +7 (74 total)
  - Phase 1C (Fee Reliability): +11 (85 total)
- **Formal Invariants (163,840+ calls, 0 failures)**:
  - `InvariantCustodyTest`: **PASS** (Zero token allowance, zero collateral custody)
  - `InvariantSlashingTest`: **PASS** (INV-2 bounded slashing)
  - `InvariantOverrideTest`: **PASS** (INV-3 atomic override)
  - `InvariantFeeSplitTest`: **PASS** (INV-4 exact 50/50 conservation)
  - `InvariantNonceTest`: **PASS** (INV-5 monotonic nonce progression)

### 5.3 Keeper Tests
- **Command**: `npm --prefix keeper test`
- **Exit Code**: `0` (Success)
- **Total Tests**: **17 passed, 17 total**.

---

## 6. Outstanding Accounting & Integration Risks

1. **Borrower Approval Friction**:
   - Because `AegisVault` does not custody user USDC collateral or loan proceeds (Invariant `INV-1`), `processAvertedFee()` relies on a pre-approval from the borrower directly to `AegisFeeCollector`.
   - If a user interacts via an external wallet and revokes approval or transfers USDC away, the protocol cannot force fee collection.
2. **Pre-funding Surplus Edge Case**:
   - If a donor or previous excess leaves USDC in `AegisFeeCollector`, `processAvertedFee()` consumes the contract's loose balance before pulling from `vaultOwner` (line 120). While harmless for protocol revenue, it subsidizes borrowers who did not approve USDC.

---

## 7. Policy Decisions Requiring Founder Approval

Per instruction 6 (*"Do not choose between atomic fee collection and deferred fee accounting if the existing specifications do not establish the intended policy. Present the options and their consequences, then stop for founder approval"*), the following two architectural options are presented:

### Option A: Atomic Fee Collection (Strict Revenue First)
- **Mechanics**: Remove `try/catch`. If `processAvertedFee()` fails for any reason, the entire `executeUnwindIntent()` transaction reverts.
- **Security & Safety Consequence**: **HIGH RISK**. If a borrower revokes USDC approval, their position CANNOT be unwound when the market rebounds. The short hedge will remain open on HyperCore while collateral price rises, creating significant liquidation risk for the user.
- **Accounting Implication**: 100% of realized fee revenue is collected immediately or the action is denied.
- **Failure Mode**: Trapped hedges during high volatility.

### Option B: Verifiable Deferred Fee Debt (User Protection First - Recommended)
- **Mechanics**: Unwind succeeds and closes the HyperCore hedge unconditionally. If fee collection fails, `AegisVault` or `AegisFeeCollector` records an on-chain `feeDebt[vaultOwner] += fee`.
- **Debt Lifecycle**:
  1. Accrued upon unwind failure (emits `FeeDebtAccrued`).
  2. Blocks borrower from registering new positions or re-delegating session keys until repaid via `repayFeeDebt()`.
  3. No forced liquidation or speculative recovery; economic incentive to clear debt to regain protocol risk coverage.
- **Security & Safety Consequence**: **SAFE**. Never blocks protective unwinding.
- **Accounting Implication**: Accrual accounting with clear bad-debt tracking.

---

## 8. Deployment and Migration Implications

- **AegisVault Contract**: Requires redeployment to include the `FeeCollectionFailed` event and catch-block capture.
- **AegisFeeCollector Contract**: Does not strictly require redeployment if current 50/50 allocation logic is retained, but must have `setAuthorizedVault(newVault, true)` executed by the contract owner.
- **Frontend / Terminal Integration**: The Web3 UI should prompt borrowers to approve `AegisFeeCollector` for USDC at the time of position registration, minimizing unapproved unwind events.

---
*End of Phase 1C Fee Reliability Report*
