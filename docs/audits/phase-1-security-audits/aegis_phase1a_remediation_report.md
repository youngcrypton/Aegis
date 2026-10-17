# AEGIS Protocol — Phase 1A: Safe Keeper Remediation Report

**Date**: October 14, 2026  
**Auditor / Engineer**: Senior Solidity Security Engineer & TypeScript Infrastructure Engineer  
**Scope**: Off-Chain Keeper Safe Remediation (`keeper/src/index.ts`, `keeper/src/telemetry.ts`, `keeper/package.json`, `keeper/jest.config.js`, `keeper/test/`)  
**Operating Rules**: Zero Solidity edits, zero contract deployments, zero transactions broadcast, zero exposed secrets, and 100% preservation of all existing workspace files.

---

## 1. Baseline & Files Inspected

Before making any modifications, the repository state was formally verified:
- **Git Status**: Branch `main`. Preserved all 18 uncommitted modified files and 58 untracked media/documentation files.
- **Keeper Dependency Audit**:
  - `keeper/package.json` had `"test": "jest"` defined in its scripts, but `jest` was missing from `devDependencies` and not installed in `keeper/node_modules`.
  - Zero automated unit tests existed for the keeper service.
- **Verification Logic Inspected**:
  - `contracts/AegisVault.sol:267-275`: `executeUnwindIntent()` passes `int256(hedge.size)` into `_verifyAndDispatch()`.
  - `contracts/core/TradeIntentExecutor.sol:22-24, 107-117`: Uses `HEDGE_INTENT_TYPEHASH` hashing `(vault, perpIndex, size, limitPrice, nonce, deadline)`.
  - `contracts/adapters/HyperCoreOracleAdapter.sol:20`: Encodes low-level precompile queries using selector `0x3a4b9c1d` followed by `abi.encode(perpIndex)`.
  - `test/mocks/MockHyperCorePrecompile.sol:37`: Validates `bytes4(data[:4]) == bytes4(0x3a4b9c1d)` and decodes `(uint32)`.

---

## 2. Exact Files Changed and Why

| File Path | Nature of Change | Rationale / Objective |
|---|---|---|
| `keeper/src/index.ts` | **Code Fix** | Passed `BigInt(hedgeData.size)` into `dispatchUnwindIntent()` and updated signing parameters from `size: 0n` to `size: unwindSize`. Eliminates the `UnauthorizedSessionKey()` revert. |
| `keeper/src/telemetry.ts` | **Security Fix** | Removed the fabricated static `$25.00` price fallback in `getMarkPrice()`. Added proper selector encoding (`0x3a4b9c1d`) and implemented fail-closed error throwing on RPC errors, empty data (`0x`), truncated data, and non-positive prices. |
| `keeper/package.json` | **Config Update** | Added `jest`, `ts-jest`, `@types/jest` to `devDependencies`, and configured `"test": "jest --runInBand"` to eliminate V8 worker IPC serialization crashes on BigInts. |
| `keeper/jest.config.js` | **New File** | Configured TypeScript testing harness via `ts-jest` with CommonJS module mapping, setup files, and test coverage collection. |
| `keeper/test/setup.ts` | **New File** | Added `BigInt.prototype.toJSON` serialization support for Jest environment. |
| `keeper/test/unwind_signature.test.ts` | **New Test Suite** | 4 automated tests proving domain matching, typehash matching, successful signature recovery with `hedge.size`, and mathematical proof that `0n` causes a digest mismatch. |
| `keeper/test/oracle_fail_closed.test.ts` | **New Test Suite** | 7 automated tests asserting precompile calldata selector formatting, fail-closed behavior on RPC error, empty data, truncated data, zero price, and valid decoding. |
| `keeper/test/risk_engine.test.ts` | **New Test Suite** | 6 automated tests verifying health factor math, zero debt handling, HYBRID trigger modes, Invariant INV-3 override behavior, and proportional hedge sizing. |

---

## 3. The Signature Mismatch & Its Correction

### The Defect
In `keeper/src/index.ts:326` (prior to fix):
```typescript
const signature = await this.orderSigner.signHedgeIntent({
  vault: vaultOwner,
  perpIndex,
  size: 0n, // <-- BUG: Signed 0n
  limitPrice: exitPrice,
  nonce,
  deadline
});
```
However, on-chain in `AegisVault.sol:267-275`:
```solidity
_verifyAndDispatch(
    vaultOwner,
    pos.sessionKey,
    perpIndex,
    int256(hedge.size), // <-- Hashed int256(hedge.size) > 0
    exitPrice,
    deadline,
    signature
);
```
Because `TradeIntentExecutor.hashHedgeIntent()` encodes `size` into the EIP-712 struct hash, signing `size: 0n` produced a completely different digest than the contract calculated. When `ECDSA.recover(digest, signature)` ran on-chain, it recovered an arbitrary address that never matched `pos.sessionKey`, causing **every automated unwind to revert with `UnauthorizedSessionKey()`**.

### The Correction
In `keeper/src/index.ts`:
1. Updated `evaluateVault` (Line 225) to forward the on-chain stored hedge size:
   ```typescript
   await this.dispatchUnwindIntent(
     vaultOwner,
     markData.perpIndex,
     markData.markPrice,
     BigInt(hedgeData.size),
     BigInt(currentNonce),
     timestamp
   );
   ```
2. Updated `dispatchUnwindIntent` (Line 314-345) to accept `unwindSize: bigint` and sign:
   ```typescript
   const signature = await this.orderSigner.signHedgeIntent({
     vault: vaultOwner,
     perpIndex,
     size: unwindSize, // Invariant: must match on-chain ActiveHedge.size for buy-to-close
     limitPrice: exitPrice,
     nonce,
     deadline
   });
   ```
This is the smallest safe off-chain fix. It preserves full backward compatibility with the deployed `AegisVault.sol` without requiring any contract modifications or redeployments.

---

## 4. Oracle Fail-Closed Implementation

### The Defect
In `keeper/src/telemetry.ts:167-172` (prior to fix):
When the JSON-RPC precompile query threw an error or returned empty bytes, the catch block swallowed the error and returned:
`markPrice: 25_00000000n` ($25.00).  
This artificial price ($25 vs real market ~$83.50) severely depressed health factor calculations, falsely triggering automated liquidation hedges and submitting unwanted short orders.

### The Correction
In `keeper/src/telemetry.ts:137-185`:
1. **Precompile Call Encoding**:
   ```typescript
   const selector = "0x3a4b9c1d";
   const encodedIndex = ethers.AbiCoder.defaultAbiCoder().encode(["uint32"], [perpIndex]);
   const callData = ethers.concat([selector, encodedIndex]);
   ```
   Now matches `HyperCoreOracleAdapter.sol:20` and `MockHyperCorePrecompile.sol:37`.
2. **Fail-Closed Validation**:
   - Throws if `provider.call` rejects (network or node error).
   - Throws if `result` is empty (`null`, `undefined`, or `"0x"`).
   - Throws if `result.length < 66` (malformed or truncated bytecode).
   - Throws if `markPrice <= 0n` (corrupted or non-positive price).
3. **Propagation**:
   When `getMarkPrice()` throws, `evaluateVault()` is bypassed entirely in `keeper/src/index.ts:145-147`. Zero hedges or unwinds are constructed or submitted on stale, missing, or corrupt market data.

---

## 5. Automated Tests Added & Actual Results

### 1. Keeper Test Execution
**Command**: `npm --prefix keeper test`  
**Exit Status**: `0` (Success)  
**Output**:
```text
> @aegis/sentinel@1.0.0 test
> jest --runInBand

PASS test/risk_engine.test.ts
PASS test/oracle_fail_closed.test.ts
PASS test/unwind_signature.test.ts

-----------------|---------|----------|---------|---------|---------------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s         
-----------------|---------|----------|---------|---------|---------------------------
All files        |   57.23 |    47.91 |   55.17 |    58.7 |                           
 config.ts       |   85.71 |       50 |     100 |   85.71 | 53-54                     
 order_signer.ts |    92.3 |        0 |      80 |    92.3 | 49                        
 risk_engine.ts  |   78.26 |       70 |     100 |   78.26 | 93,95,115,129-137,148,186 
 telemetry.ts    |   36.04 |    30.43 |      20 |    37.8 | 29-40,46-47,50-132,166    
-----------------|---------|----------|---------|---------|---------------------------

Test Suites: 3 passed, 3 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        3.707 s
Ran all test suites.
```

### 2. Keeper TypeScript Build Verification
**Command**: `npm --prefix keeper run build`  
**Exit Status**: `0` (Success, compiled cleanly via `tsc`).

### 3. Smart Contract Regression Check
**Command**: `forge test -vvv`  
**Exit Status**: `0` (Success)  
**Output Summary**:
- **12 test suites, 53 tests passed, 0 failed, 0 skipped**.
- Formal invariant test suites `INV-1` through `INV-5` completed 160,000+ stateful calls with zero failures or arithmetic leaks.

---

## 6. Remaining Blockers & Security Concerns

While the off-chain keeper has been safely remediated, the following critical protocol-level blockers documented in Phase 0 remain open and require smart contract / infrastructure resolution:

1. **Testnet Precompile Availability (SEC-02)**: Elysium testnet RPC node has not provisioned `0x0801` and `0x0802`. Real on-chain telemetry and order placement will revert until the Elysium team completes this network node upgrade.
2. **Double-Hedge Overwrite Vulnerability (SEC-04)**: `AegisVault.sol:198-244` still lacks `if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyOpen();`.
3. **Arbitrary Calldata `exitPrice` (SEC-03)**: `AegisVault.sol:254-285` still accepts unvalidated exit prices from callers.
4. **Instant Sentinel Unstaking (SEC-06)**: `AegisSentinelRegistry.sol:110-122` lacks an unbonding cooldown, permitting slash front-running.
5. **Unprotected Mock Token Burn (SEC-05)**: Deployed testnet tokens still contain public `burn()` methods.

---

## 7. Assumptions Requiring Human Approval

1. **Unwind Intent Struct Consensus**: We have standardized on signing `size = int256(hedge.size)` matching the existing `AegisVault.sol:271` implementation. Please confirm whether this behavior should be preserved or if an explicit `UnwindIntent` typehash should be introduced during the smart contract remediation phase.
2. **Testnet Execution vs Local Mock Harness**: Live testnet execution of the keeper daemon remains paused (`DRY_RUN: true`) until Elysium precompiles are deployed. Please confirm readiness before we transition to Phase 1B (Smart Contract & Testnet Remediation).

---
*End of Phase 1A Remediation Report*
