# AEGIS Phase 1C: Founder Decision and Deferred Fee Debt Implementation Report

**Status:** Complete (Local Development & Verification Only)  
**Execution Date:** October 14, 2026  
**Decision Implemented:** Option B — Verifiable Deferred Fee Debt  
**Security Posture:** Hardened on-chain accounting with idempotent repayment lifecycle and strict non-custodial risk protection  

---

## 1. Executive Summary

Following founder authorization, AEGIS Protocol Phase 1C implements **Option B — Verifiable Deferred Fee Debt**. This architecture ensures that safety-critical risk unwinds executed by Sentinels on HyperCore CLOB can never revert due to borrower balance shortfalls, missing ERC-20 allowances, or downstream fee-collector reverts, while simultaneously eliminating silent fee loss by recording exact protocol fee obligations as on-chain debt in [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol).

In addition, an investigation into fee-collector accounting identified and remediated a surplus-bypass vulnerability in [contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol) where pre-existing contract USDC funds could inappropriately satisfy a borrower's fee obligation without `safeTransferFrom`.

All 10 founder requirements were fulfilled and rigorously validated against 12 test suites (98 Foundry tests, including all 5 formal invariant suites) and all 17 keeper regression tests.

---

## 2. Mathematical Definition & Fee Accounting Units

### 2.1 Fee Derivation & Decimals
- **Collateral Valuation ($V_{col}$):**
  $$\text{colValUsdc} = \frac{\text{collateralAmount (18 dec)} \times \min(P_{oracle}, P_{exit})\text{ (8 dec)}}{10^{20}}$$
  The resulting valuation is denominated strictly in 6-decimal USDC ($10^{18} \times 10^8 / 10^{20} = 10^6$).
- **Averted Liquidation Penalty ($P_{saved}$):**
  $$\text{savedPenalty} = \frac{\text{colValUsdc} \times 500}{10000} \quad (5.00\% \text{ of collateral valuation})$$
- **Exact Protocol Fee Owed ($F_{protocol}$):**
  $$F_{protocol} = \frac{\text{savedPenalty} \times \text{PROTOCOL\_FEE\_BPS}}{10000} \quad (\text{PROTOCOL\_FEE\_BPS} = 1000 = 10.00\%)$$
  $$F_{protocol} = 0.50\% \text{ of collateral valuation in 6-decimal USDC}$$

### 2.2 Accounting Resolution Rule
- The debt recorded in `feeDebts[vaultOwner]` represents **only the protocol fee owed** ($F_{protocol}$), **not** the gross saved penalty ($P_{saved}$).
- If $F_{protocol} = 0$ (e.g., fractional dust where $\text{savedPenalty} < 10$ units), no debt is accrued.

---

## 3. Architecture & Deferred Fee Debt Lifecycle

```
                                  [executeUnwindIntent]
                                            │
                          HyperCore CLOB buy-to-close intent
                                            │
                                  hedge.isOpen = false
                                            │
                             ┌──────────────┴──────────────┐
                             ▼                             ▼
                  try processAvertedFee()         catch (bytes reason)
                             │                             │
                   USDC transfer succeeds                  ▼
                             │                 Record Debt on AegisVault:
                             │            feeDebts[vaultOwner] += protocolFee
                             │                             │
                             │                  emit FeeDebtAccrued(...)
                             │                  emit FeeCollectionFailed(...)
                             │                             │
                             └──────────────┬──────────────┘
                                            ▼
                                  emit HedgeUnwound(...)
                                            │
                                            ▼
                           Unwind Guaranteed Complete (No Revert)

========================================================================================

                                  [repayFeeDebt / repayFeeDebtFor]
                                            │
                            Check: amount > 0, borrower != 0
                                            │
                            currentDebt = feeDebts[borrower]
                            Require: currentDebt > 0 (NoOutstandingDebt)
                                            │
                           repaid = min(amount, currentDebt)
                                            │
                   IAegisFeeCollector.processFeeDebtPayment(payer, borrower, repaid)
                                            │
                        ┌───────────────────┴───────────────────┐
                        ▼                                       ▼
             safeTransferFrom(payer, this, repaid)    50/50 Flywheel Allocation:
                        │                             buybackShare = repaid / 2
                        │                             yieldShare = repaid - buybackShare
                        │                             Invariant INV-4 Preserved
                        ▼
             feeDebts[borrower] = currentDebt - repaid
             emit FeeDebtRepaid(borrower, payer, repaid, remainingDebt)
```

### 3.1 Reliable Debt Accrual in `AegisVault`
Debt storage is maintained directly in [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) (`mapping(address => uint256) public feeDebts`). This ensures:
1. **Collector Failure Resilience:** If the external fee collector reverts, has unallocated liquidity issues, or rejects the call, the revert is caught cleanly by `AegisVault`'s `try/catch`. The vault's local state transition records the debt and emits `FeeDebtAccrued(vaultOwner, protocolFee, feeDebts[vaultOwner])`.
2. **Borrower Balance/Allowance Independence:** Regardless of whether the borrower has zero allowance or zero USDC balance, the hedge closes safely and debt records accurately.
3. **Idempotence & Anti-Duplication:** Once unwound, `hedge.isOpen` is set to `false`. Subsequent calls targeting the closed hedge revert immediately with `InvalidHealthTrigger()`, preventing duplicate debt accrual.

### 3.2 Repayment Lifecycle
Two external methods were implemented on [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) and declared in [contracts/interfaces/IAegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisVault.sol):
- `repayFeeDebt(uint256 amount) external returns (uint256 repaid)`: Caller repays their own debt.
- `repayFeeDebtFor(address borrower, uint256 amount) external returns (uint256 repaid)`: Any third-party sponsor, guardian, or liquidator can settle debt on behalf of a borrower.

**Repayment Invariants:**
- **Exact Capping:** If `amount > currentDebt`, `repaid` is clamped to `currentDebt`. Payers are never overcharged.
- **Atomic Settlement:** Tokens are pulled directly from `payer` by `AegisFeeCollector.processFeeDebtPayment`. If token transfer fails, the transaction reverts and `feeDebts[borrower]` remains uncorrupted.
- **Zero Debt Protection:** Calling repayment with 0 debt reverts with `NoOutstandingDebt()`. Calling with 0 amount reverts with `ZeroRepaymentAmount()`.
- **Reentrancy Protection:** Both `_repayFeeDebt` in `AegisVault` and `processFeeDebtPayment` in `AegisFeeCollector` are protected by OpenZeppelin `nonReentrant` guards.

---

## 4. Fee-Collector Surplus Handling Remediation

### 4.1 Vulnerability Analysis
In [contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol), line 120 previously contained:
```solidity
// VULNERABLE CODE (REMOVED):
if (usdcToken.balanceOf(address(this)) < (buybackBudget + yieldBudget + fee)) {
    usdcToken.safeTransferFrom(vaultOwner, address(this), fee);
}
```
If the fee collector held unallocated USDC surplus (e.g., from direct token transfers, rounding remainders, or third-party donations), `usdcToken.balanceOf(address(this))` exceeded `buybackBudget + yieldBudget + fee`. As a result:
- `safeTransferFrom` was skipped.
- A borrower who never approved or held USDC was falsely credited as having paid the fee.
- Contract surplus was silently consumed without borrower payment.

### 4.2 Remediation
The conditional bypass was removed. `AegisFeeCollector.processAvertedFee` and `AegisFeeCollector.processFeeDebtPayment` now execute unconditional `safeTransferFrom`:
```solidity
// REMEDIATED CODE:
usdcToken.safeTransferFrom(vaultOwner, address(this), fee);
```
Unrelated surplus in `AegisFeeCollector` can never be used to subsidize a borrower's fee debt or avert collection from the borrower's account.

---

## 5. Non-Blocking Risk Reduction Policy

As required by founder directives (Requirements 7 and 8):
- **`manualOverride()`**: Borrowers can unconditionally kill session keys and claim emergency manual control of their positions regardless of outstanding `feeDebts`.
- **`executeUnwindIntent()`**: Protective unwinds are never blocked by pre-existing fee debt.
- **`delegateSessionKey()` & `revokeSessionKey()`**: Key delegation and revocation operate uninhibited so risk monitoring is never crippled.
- **`updateLowestWick()`**: Ratchet updates for trailing take-profits continue unimpeded.

---

## 6. Files Modified and Scope

| File Path | Description of Changes |
| :--- | :--- |
| [contracts/AegisTypes.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisTypes.sol) | Declared custom errors `NoOutstandingDebt()` and `ZeroRepaymentAmount()`. |
| [contracts/interfaces/IAegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisFeeCollector.sol) | Declared `processFeeDebtPayment` and event `FeeDebtPaymentProcessed`. |
| [contracts/AegisFeeCollector.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol) | Removed surplus bypass check; implemented `processFeeDebtPayment` with 50/50 split and `nonReentrant`. |
| [contracts/interfaces/IAegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisVault.sol) | Declared events `FeeDebtAccrued`, `FeeDebtRepaid` and functions `repayFeeDebt`, `repayFeeDebtFor`, `getFeeDebt`. |
| [contracts/AegisVault.sol](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) | Added `PROTOCOL_FEE_BPS` and `feeDebts` mapping; updated catch block in `executeUnwindIntent`; implemented repayment lifecycle. |
| [test/unit/FeeCollector.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/FeeCollector.t.sol) | Updated surplus test to verify revert on zero allowance; added unit tests for `processFeeDebtPayment`. |
| [test/unit/AegisVault.t.sol](file:///c:/Users/ascend%20X%20elysium/test/unit/AegisVault.t.sol) | Added regression suite verifying debt accrual, partial/full repayment, third-party repayment, error handling, and non-blocking risk operations. |

---

## 7. Verification and Test Results

### 7.1 Smart Contract Compilation (`forge build`)
- **Command:** `forge build`
- **Result:** Success (Exit Code: 0)
- **Compiler Version:** Solc 0.8.24 via IR

### 7.2 Foundry Test Execution (`forge test`)
- **Command:** `forge test`
- **Result:** **98 passed, 0 failed, 0 skipped (12 test suites)**
- **Formal Invariants Verified:**
  - `InvariantFeeSplitTest` (`invariant_INV4_StrictFeeConservation`): 256 runs, 32,768 calls, 0 reverts — 0 fee leakage across flywheel allocations.
  - `InvariantCustodyTest` (`invariant_INV1_ZeroSentinelTokenAllowance`, `invariant_INV1_ZeroVaultCollateralCustody`): 256 runs, 32,768 calls, 0 reverts.
  - `InvariantOverrideTest` (`invariant_INV3_ManualOverrideGuaranteesZeroKey`): 256 runs, 32,768 calls, 0 reverts.
  - `InvariantNonceTest` (`invariant_INV5_StrictMonotonicNonces`): Passed.
  - `InvariantSlashingTest` (`invariant_INV2_SlashNeverExceedsBondedBalance`): Passed.

### 7.3 Unit Test Suite Breakdown
| Test Suite | Total Tests | Passed | Failed |
| :--- | :---: | :---: | :---: |
| `test/unit/AegisVault.t.sol:AegisVaultTest` | 27 | 27 | 0 |
| `test/unit/FeeCollector.t.sol:FeeCollectorTest` | 19 | 19 | 0 |
| `test/unit/SentinelRegistry.t.sol:SentinelRegistryTest` | 24 | 24 | 0 |
| `test/unit/HyperCorePrecompile.t.sol` | 3 | 3 | 0 |
| `test/unit/AscendHookPool.t.sol` | 5 | 5 | 0 |
| `test/unit/TradeIntentExecutor.t.sol` | 13 | 13 | 0 |
| Invariant Suites (5 suites) | 7 | 7 | 0 |
| **Total** | **98** | **98** | **0** |

### 7.4 Keeper Test Execution (`npm test` in `keeper/`)
- **Command:** `npm --prefix keeper test`
- **Result:** **17 passed, 17 total (3 test suites)** (Exit Code: 0)
  - `risk_engine.test.ts`: Passed
  - `oracle_fail_closed.test.ts`: Passed
  - `unwind_signature.test.ts`: Passed

---

## 8. Residual Risks & Deployment Considerations

1. **Borrower Debt Accumulation & Bad Debt Policy:**
   - Currently, borrowers can accumulate fee debt across multiple protective unwinds without being blocked from opening new positions (per Requirement 7).
   - *Recommendation:* Prior to mainnet deployment, governance should establish a formal policy for position opening restrictions (e.g., maximum allowable fee debt threshold before `registerPosition` reverts).
2. **Off-Chain Indexing & UX Notification:**
   - The UI and Sentinel telemetry should index `FeeDebtAccrued` and `FeeDebtRepaid` events to alert borrowers of outstanding debt and provide a 1-click repayment interface.
3. **Upgradeability & State Migration:**
   - Because `feeDebts` and `PROTOCOL_FEE_BPS` were added to `AegisVault.sol`, any existing deployment on testnet requires deploying the updated `AegisVault` implementation contract and re-pointing authorizations between `AegisVault` and `AegisFeeCollector`.
4. **Strict Operational Boundaries Preserved:**
   - No contracts were deployed to live networks.
   - No transactions were broadcast.
   - All existing files, launch media, and documentation were preserved without modification.
