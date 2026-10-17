# AEGIS Protocol — Phase 1B.1: Independent Security Verification Report

**Date**: October 14, 2026
**Reviewer**: Independent Senior Solidity Security Auditor
**Scope**: Independent verification of Phase 1B remediation against actual source, diffs, tests, and execution results
**Methodology**: Read-only audit. Zero files edited, zero contracts deployed, zero transactions broadcast, zero secrets inspected.

---

## 1. Review Scope and Current Git Status

### 1.1 Repository State

Branch: `main`. All changes are unstaged (working copy modifications).

**Modified contract files verified via `git diff`:**

| File | Lines Changed |
|---|---|
| [`AegisVault.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol) | +65 lines (double-hedge guard, `updateLowestWick`, oracle-validated unwind, fee anchoring) |
| [`AegisSentinelRegistry.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol) | +83 lines (7-day cooldown, two-step exit, `initiateExitSentinel`/`finalizeExitSentinel`) |
| [`AegisTypes.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisTypes.sol) | +7 lines (new custom errors) |
| [`IAegisVault.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisVault.sol) | +8 lines (`LowestWickUpdated` event, `updateLowestWick` declaration) |
| [`IAegisSentinelRegistry.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/interfaces/IAegisSentinelRegistry.sol) | +10 lines (unbonding events, functions, view getters) |
| [`AegisVault.t.sol`](file:///c:/Users/ascend%20X%20elysium/test/unit/AegisVault.t.sol) | +527 lines (8 new tests) |
| [`SentinelRegistry.t.sol`](file:///c:/Users/ascend%20X%20elysium/test/unit/SentinelRegistry.t.sol) | +120 lines (6 new tests) |
| [`VaultHandler.sol`](file:///c:/Users/ascend%20X%20elysium/test/invariants/handlers/VaultHandler.sol) | +33 lines (`action_unwindHedgeIntent`) |

**Not modified (verified):** `AegisFeeCollector.sol`, `TradeIntentExecutor.sol`, `HyperCoreOracleAdapter.sol`, `deployments.json`, all mock files, all invariant test contracts, `EndToEndFlow.t.sol`.

### 1.2 Reports Reviewed

- [`AEGIS_PHASE1A_REMEDIATION_REPORT.md`](file:///c:/Users/ascend%20X%20elysium/AEGIS_PHASE1A_REMEDIATION_REPORT.md) — Keeper remediation (signature fix, oracle fail-closed)
- [`AEGIS_PHASE1B_SECURITY_REPORT.md`](file:///c:/Users/ascend%20X%20elysium/AEGIS_PHASE1B_SECURITY_REPORT.md) — Contract security remediation
- Phase 0 repair plan referenced but does not exist as a standalone file; findings reconstructed from the two reports above.

### 1.3 Verification Commands Executed

| Command | Exit Code | Result |
|---|---|---|
| `forge build` | 0 | Compilation succeeded (cached). 7 lint warnings (block.timestamp comparisons, unsafe typecasts). No errors. |
| `forge test -vvv` | 0 | **67 tests passed, 0 failed, 0 skipped** across 12 test suites. 35.63s wall time. |
| `npm --prefix keeper run build` | 0 | TypeScript compilation clean. |
| `npm --prefix keeper test` | 0 | **17 tests passed, 17 total** across 3 test suites. 4.6s. |

---

## 2. Exact Files and Diffs Inspected

Every contract, interface, test, mock, and handler file in the `contracts/`, `test/`, and `keeper/` directories was read in full. Git diffs were independently generated for:

- `contracts/AegisVault.sol` (diff confirmed against [`AegisVault.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol))
- `contracts/AegisSentinelRegistry.sol` (diff confirmed against [`AegisSentinelRegistry.sol`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol))
- Original committed source retrieved via `git show HEAD:<path>` for baseline comparison.

**No removed tests were detected.** All pre-existing tests were preserved and continue to pass. No assertions were weakened. The one pre-existing test that was modified (`test_ExitSentinel_Success`) was **strengthened** to verify the 7-day cooldown rather than instant withdrawal.

**No unrelated modifications** were found in the contract diffs.

---

## 3. Findings by Severity

### 3.1 CRITICAL — None Found

No critical vulnerabilities were identified in the Phase 1B remediation.

### 3.2 HIGH — Confirmed Findings

#### HIGH-01: Oracle Freshness Cannot Be Verified On-Chain

**Status**: Unresolved (external dependency, not a code defect)

**Evidence**: [`HyperCoreOracleAdapter.sol:19-26`](file:///c:/Users/ascend%20X%20elysium/contracts/adapters/HyperCoreOracleAdapter.sol#L19-L26)

The oracle adapter queries precompile `0x0801` via `staticcall` with selector `0x3a4b9c1d` and decodes a single `uint256`. The Elysium precompile specification has not been independently verified by this reviewer because:

1. **No timestamp or block height** is returned alongside the price. The contract cannot verify whether the price is current or stale.
2. **No sequence number or heartbeat** mechanism is available to detect feed interruptions.
3. The adapter correctly reverts on `!success` or `returnData.length < 32` (fail-closed), which is the correct defensive pattern for an unverifiable external oracle.

**Assessment**: The Phase 1B implementation takes the only defensible position available — fail-closed on oracle unavailability. However, the absence of freshness metadata means the contract fundamentally trusts that the Elysium precompile returns a price corresponding to the current block. If the precompile is provisioned but returns a cached/stale price (e.g., from a halted data feed), the contract has no way to detect this.

**This cannot be resolved without the actual Elysium precompile interface specification.** The Phase 1B report correctly acknowledges this as an external dependency.

#### HIGH-02: Re-Registration After Finalized Exit Bypasses Cooldown History

**Status**: Partially addressed

**Evidence**: [`AegisSentinelRegistry.sol:139-156`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L139-L156) and [`AegisSentinelRegistry.sol:75-93`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L75-L93)

After `finalizeExitSentinel()` completes:
- `unbondingTimestamps[msg.sender]` is deleted (set to 0)
- `node.bondedAmount` is set to 0
- `node.isActive` remains false (never explicitly reset)
- `node.slashCount` is preserved

An operator can then call `bondStake(25_000 ether)` again, which:
1. Passes the `unbondingTimestamps[msg.sender] != 0` check (it's now 0)
2. Sets `node.isActive = true`
3. Resets the operator to a fully active sentinel with fresh bond

**This is not itself a vulnerability** — the sentinel re-bonds legitimate tokens and becomes slashable again. However:

- The `slashCount` accumulates across registrations but is never used to gate re-registration.
- Any outstanding slashing obligations from the pre-exit period that were not submitted during the 7-day cooldown are permanently lost after finalization.
- There is **no test** covering the re-registration path after a completed exit.

**Recommendation**: Consider whether sentinels with high `slashCount` should face additional entry requirements. Add a test for the re-registration flow to verify state consistency.

### 3.3 MEDIUM — Confirmed Findings

#### MED-01: `updateLowestWick()` Is Permissionless and Has No Frequency Limit

**Status**: Acknowledged in design, potential griefing vector

**Evidence**: [`AegisVault.sol:257-268`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L257-L268)

`updateLowestWick()` is `public` with no access control. Any address can call it for any `vaultOwner`. The function:
1. Reads the live oracle price
2. If `liveMarkPrice > 0 && liveMarkPrice < hedge.lowestWickPrice`, ratchets down `lowestWickPrice` and `trailingExitPrice`

**The ratcheting direction is safe** — it can only lower (never raise) the wick, which means it can only delay unwind (requiring a deeper rebound), never accelerate it. An attacker calling this with a genuinely lower oracle price is providing useful information. If the oracle price hasn't dropped, the function is a no-op.

**Gas griefing**: Repeated calls incur only calldata + `SLOAD` cost and emit no event when the no-op branch executes. This is negligible.

**Assessment**: Safe by design. The permissionless nature enables any keeper to update the wick, which is consistent with the protocol's intent. The function is also called inline within `executeUnwindIntent()` at line 299, ensuring the wick is always current at unwind time regardless of whether `updateLowestWick()` was called externally.

**Severity reduced from MEDIUM to LOW.** No action required.

#### MED-02: Fee Collector `processAvertedFee` Pulls Tokens from Vault Owner via `safeTransferFrom`

**Status**: Pre-existing design, not introduced in Phase 1B

**Evidence**: [`AegisFeeCollector.sol:109-133`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisFeeCollector.sol#L109-L133) and [`AegisVault.sol:329-337`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L329-L337)

When `executeUnwindIntent()` succeeds, it calls `processAvertedFee(vaultOwner, savedPenalty)`. Inside `processAvertedFee`, if the collector's balance is insufficient, it calls `usdcToken.safeTransferFrom(vaultOwner, address(this), fee)` (line 121).

This requires the `vaultOwner` to have pre-approved the FeeCollector for USDC transfers. If the borrower has not approved (or revokes approval), the `safeTransferFrom` reverts, but the entire `processAvertedFee` call is wrapped in `try...catch {}` (line 335-336), so **the unwind still completes** — the fee is silently skipped.

**Phase 1B improvement**: The fee valuation is now anchored to `min(liveMarkPrice, exitPrice)` (line 331), eliminating the caller-controlled fee inflation vulnerability. This is a correct and effective fix.

**Remaining concern**: The silent fee skip means fee revenue is unreliable. This is a protocol economics issue, not a security vulnerability.

#### MED-03: Nonce Consumption on Reverted Unwind

**Status**: Pre-existing design behavior, partially addressed by Phase 1B validation

**Evidence**: [`TradeIntentExecutor.sol:105`](file:///c:/Users/ascend%20X%20elysium/contracts/core/TradeIntentExecutor.sol#L105) and [`AegisVault.sol:285-340`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L285-L340)

When `executeUnwindIntent()` is called, the flow is:
1. Validate hedge is open, perpIndex matches, exitPrice != 0 (lines 290-292)
2. Query oracle, validate liveMarkPrice != 0 (lines 295-296)
3. Ratchet wick (lines 299-303)
4. Check trailing exit threshold — **revert if not met** (lines 306-308)
5. Check slippage — **revert if exceeded** (lines 311-312)
6. `_verifyAndDispatch()` — **nonce is consumed here** (line 105 in TradeIntentExecutor)

If the revert happens at step 4 or 5, the entire transaction reverts, **including the nonce increment**. This is correct EVM behavior — the nonce is only consumed when the transaction succeeds.

However, if `_verifyAndDispatch()` succeeds (nonce consumed, order dispatched to 0x0802) but a later step somehow reverts, the nonce would be consumed without state completion. Reviewing the post-dispatch code (lines 325-340): `hedge.isOpen = false` is a simple storage write (cannot revert), and `processAvertedFee` is wrapped in `try...catch`. **No revert path exists after nonce consumption.** This is safe.

### 3.4 LOW — Confirmed Findings

#### LOW-01: `exitSentinel()` Duplicates Logic from `initiateExitSentinel()` and `finalizeExitSentinel()`

**Status**: Design decision, not a vulnerability

**Evidence**: [`AegisSentinelRegistry.sol:162-190`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L162-L190) vs [`AegisSentinelRegistry.sol:123-156`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L123-L156)

The `exitSentinel()` function contains a complete duplicate of both `initiateExitSentinel()` and `finalizeExitSentinel()` inline. The two-branch `if/else` on `unlockTime == 0` replicates the same state transitions, checks, and token transfers.

This is not a security issue but creates maintenance risk — a future change to one path that omits the other could introduce inconsistency. Both `initiateExitSentinel()` and `finalizeExitSentinel()` are `public`, and `exitSentinel()` is `external`. They do not call each other because all three use `nonReentrant`, which would revert on the nested call.

**Recommendation**: Document that `exitSentinel()` is a convenience wrapper and that any future change must update all three functions in lockstep.

#### LOW-02: `uint96` Truncation on `collateralAmount`

**Status**: Pre-existing, not introduced in Phase 1B

**Evidence**: [`AegisVault.sol:81`](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L81) — `collateralAmount: uint96(amount)`

A `uint256 amount` is unsafely cast to `uint96`. Max `uint96` = ~79.2 billion (at 1e18 scaling). For practical collateral quantities this is safe, but no bounds check prevents a user from registering `amount > type(uint96).max`, which would silently truncate. Forge linter correctly flags this.

**Assessment**: Extremely unlikely to be exploitable in practice but violates defense-in-depth.

#### LOW-03: `block.timestamp` Validator Manipulation (Standard Warning)

**Status**: Acknowledged, inherent to EVM design

Forge linter flags `block.timestamp` comparisons in deadline checks, session key expiry, and cooldown enforcement. On Elysium (if it follows standard EVM consensus), validators can manipulate `block.timestamp` by small amounts (typically <15 seconds). This is insufficient to meaningfully bypass a 7-day cooldown but could affect deadline-tight operations.

---

## 4. Vulnerability Resolution Assessment

| Finding ID | Original Vulnerability | Remediation | Verification Status |
|---|---|---|---|
| **SEC-04** | Double-hedge overwrite: no guard on `activeHedges[vaultOwner].isOpen` | Added `if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyActive();` at [line 218](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L218) | ✅ **RESOLVED** — Guard placed before oracle query and before `_verifyAndDispatch`. Three dedicated tests prove: revert on double-open, successful re-hedge after valid unwind, and failed attempt preservation. No bypass path exists because `nonReentrant` blocks all re-entry and the guard fires before any state mutation. |
| **SEC-03** | Arbitrary caller `exitPrice` inflating fees and bypassing trailing stop | Oracle query at [line 295](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L295), trailing stop at [line 306](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L306), slippage at [line 311](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L311), fee anchoring at [line 331](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L331) | ✅ **RESOLVED** — Fee is now `min(liveMarkPrice, exitPrice)`, eliminating inflation. Four dedicated tests prove: trailing revert, zero price revert, slippage revert, mismatched market revert. Original `exitPrice` is still used as the limit price for the 0x0802 order, which is correct (it's the execution bound, not the valuation). |
| **SEC-06** | Instant sentinel unstake enabling slash front-running | 7-day `UNBONDING_COOLDOWN` at [line 35](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L35), `unbondingTimestamps` mapping at [line 47](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L47), two-step exit at [lines 123-156](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L123-L156) | ✅ **RESOLVED** — Operator deactivates immediately but bond stays locked and slashable. Six dedicated tests prove: immediate withdrawal revert, slash-during-cooldown with correct restitution, timer reset prevention, boundary timestamp, bond/unstake lock during cooldown, and no-unbond-request revert. |
| **SEC-02** | Precompile `0x0801` fail-closed behavior | Pre-existing fail-closed in [`HyperCoreOracleAdapter.sol:22-23`](file:///c:/Users/ascend%20X%20elysium/contracts/adapters/HyperCoreOracleAdapter.sol#L22-L23), now enforced by both `getVaultHealth()` and `executeUnwindIntent()` | ✅ **VERIFIED** — Both read paths revert with `PrecompileReadFailed` on unavailability. Freshness unverifiable (HIGH-01). |
| **SEC-01** | Keeper signature mismatch (`size: 0n` vs `int256(hedge.size)`) | Fixed in Phase 1A: `keeper/src/index.ts` now signs `size: unwindSize` matching on-chain digest | ✅ **RESOLVED** (Phase 1A) — 4 Jest tests verify signature matching, domain binding, typehash, and mathematical proof that `0n` produces mismatch. |
| **SEC-05** | Unprotected mock token `burn()` | **NOT ADDRESSED** in Phase 1B (Solidity contract scope) | ⚠️ **UNRESOLVED** — Deployed testnet ERC20 tokens may still contain public `burn()` methods. This is a testnet deployment concern, not a Phase 1B contract-level issue. |

---

## 5. Independent Verification of Unwind Security (Task 2)

### 5.1 Double-Hedge Guard

**Verified.** The check `if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyActive()` at [line 218](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L218) fires before `getVaultHealth()` (line 221), before `_verifyAndDispatch()` (line 225), and before any state mutation (line 239). The guard cannot be bypassed:
- `nonReentrant` prevents re-entry through any external call
- `isOpen` is set to `true` atomically at line 240 (after dispatch succeeds)
- `isOpen` is set to `false` only in `executeUnwindIntent()` at line 325 (after full validation)

### 5.2 Unwind Signature Verification

**Verified.** The unwind calls `_verifyAndDispatch(vaultOwner, pos.sessionKey, perpIndex, int256(hedge.size), exitPrice, deadline, signature)` at [lines 315-323](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L315-L323). The EIP-712 digest includes `vault`, `perpIndex`, `size`, `limitPrice`, `nonce`, and `deadline` via `HEDGE_INTENT_TYPEHASH`. The same typehash is used for both hedge and unwind, with the sign of `size` distinguishing them (negative for short, positive for buy-to-close). This is structurally correct — changing any field produces a different digest.

**Domain separator**: `EIP712("AEGIS Protocol", "1.0.0")` is set in the constructor. The domain is chain-specific via `block.chainid` (OpenZeppelin EIP712 implementation). This prevents cross-chain replay.

**Session key expiry**: Checked at [line 215](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L215) in `executeHedgeIntent` but **NOT checked in `executeUnwindIntent`**. This means an expired session key can still sign valid unwind intents. This is a design decision — once a hedge is open, the protocol needs the ability to close it even if the session key has technically expired. If the vault owner revokes the session key (sets it to `address(0)`), the unwind would revert with `UnauthorizedSessionKey` because `ECDSA.recover` would never return `address(0)`.

> [!IMPORTANT]
> **Finding**: Session key expiry is not checked during unwind. This appears intentional (to avoid locking open positions), but it means an expired-but-not-revoked key can still close hedges. The vault owner retains the ability to revoke at any time, which is the correct safety mechanism.

### 5.3 Caller-Controlled Price Impact

**Verified.** The caller-supplied `exitPrice` is now bounded by:
1. `exitPrice == 0` → revert with `InvalidPrice` ([line 292](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L292))
2. `exitPrice > maxAllowedExitPrice` → revert with `SlippageExceeded` ([line 312](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L312))
3. Fee valuation uses `min(liveMarkPrice, exitPrice)` ([line 331](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L331))

The only remaining influence of caller `exitPrice` is as the `limitPrice` parameter passed to `IHyperCoreWriter.placeHedgeIntent()`. This is correct — it sets the execution bound for the CLOB order on HyperCore, not the settlement price.

### 5.4 Oracle Validity

**Verified.** `liveMarkPrice == 0` reverts at [line 296](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L296). `staticcall` failure or short data reverts at `HyperCoreOracleAdapter` [line 22-23](file:///c:/Users/ascend%20X%20elysium/contracts/adapters/HyperCoreOracleAdapter.sol#L22-L23). No freshness check is possible (HIGH-01).

### 5.5 Trailing Exit and Wick Accounting

**Verified.** The wick ratcheting logic at [lines 299-303](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L299-L303) is monotonically non-increasing (can only go down). The trailing exit is recalculated as `lowestWick * (10000 + trailingTakeProfitBps) / 10000`. The threshold check at [line 306](file:///c:/Users/ascend%20X%20elysium/contracts/AegisVault.sol#L306) uses `<` (strictly less than), meaning `liveMarkPrice == trailingExitPrice` is allowed. This matches the test at [`SentinelRegistry.t.sol:210`](file:///c:/Users/ascend%20X%20elysium/test/unit/SentinelRegistry.t.sol#L210) which uses `vm.warp(unlockTime)` (exact boundary succeeds).

### 5.6 Failed Execution State Consistency

**Verified.** All state mutations (`activeHedges[vaultOwner] = ...`, `pos.lastHedgeBlock = ...`) occur after `_verifyAndDispatch()` succeeds. If any prior check reverts, no state is modified. If `_verifyAndDispatch()` itself reverts (invalid signature, expired deadline, writer failure), the transaction rolls back entirely. There is no intermediate state where `isOpen` could be true with corrupted parameters.

---

## 6. Independent Verification of Sentinel Registry (Task 3)

### 6.1 Seven-Day Cooldown Enforcement

**Verified across all paths:**

| Path | Cooldown Enforced | Evidence |
|---|---|---|
| `initiateExitSentinel()` | Sets `unbondingTimestamps[msg.sender] = block.timestamp + 7 days` | [Line 129-130](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L129-L130) |
| `finalizeExitSentinel()` | Checks `block.timestamp < unlockTime` → revert | [Line 142](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L142) |
| `exitSentinel()` (first call) | Sets cooldown identically to `initiateExitSentinel` | [Line 169-170](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L169-L170) |
| `exitSentinel()` (second call) | Checks `block.timestamp < unlockTime` → revert | [Line 175](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L175) |
| `bondStake()` | Checks `unbondingTimestamps[msg.sender] != 0` → revert | [Line 77](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L77) |
| `unstake()` | Checks `unbondingTimestamps[msg.sender] != 0` → revert | [Line 101](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L101) |

### 6.2 Timer Reset Prevention

**Verified.** `initiateExitSentinel()` checks `if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(...)` at [line 126](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L126). Once the cooldown is set, no code path can overwrite it except `finalizeExitSentinel()` which `delete`s it at [line 147](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L147). The `delete` only executes after the cooldown has elapsed. Test `test_ExitSentinel_RepeatedInitiateCannotResetTimer` confirms this at [line 179-194](file:///c:/Users/ascend%20X%20elysium/test/unit/SentinelRegistry.t.sol#L179-L194).

### 6.3 Slashing During Cooldown

**Verified.** `slashSentinel()` at [lines 200-224](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L200-L224) does not check `unbondingTimestamps` at all. It only checks `node.bondedAmount == 0` and `slashBps > MAX_SLASH_BPS`. Since `bondedAmount` is preserved during cooldown (only zeroed at finalization), slashing proceeds normally. Test `test_ExitSentinel_SlashingPossibleDuringCooldown` proves correct restitution math at [lines 144-177](file:///c:/Users/ascend%20X%20elysium/test/unit/SentinelRegistry.t.sol#L144-L177).

### 6.4 Re-Registration After Exit

**Partially verified.** After `finalizeExitSentinel()`:
- `unbondingTimestamps[msg.sender]` = 0
- `node.bondedAmount` = 0
- `node.isActive` = false (set during initiation, never reset)

Calling `bondStake(25_000 ether)` will:
- Pass `unbondingTimestamps` check (it's 0)
- Set `node.bondedAmount = 25_000 ether`
- Set `node.isActive = true`
- Set `node.operator = msg.sender` (already set)

The sentinel becomes fully operational again. `node.slashCount` carries over, which is informational but not gating.

> [!WARNING]
> **No test exists for the re-registration flow.** While the code logic is correct, the absence of test coverage means this path has not been mechanically verified.

### 6.5 Permanent Fund Lock Risk

**Verified safe.** The only scenario where funds could be permanently locked is if `finalizeExitSentinel()` could never be called. The only gates are:
1. `unlockTime == 0` → would revert with `NoUnbondRequest`, but this only occurs if exit was never initiated
2. `block.timestamp < unlockTime` → will eventually pass as time progresses

After 7 days, `finalizeExitSentinel()` unconditionally transfers `node.bondedAmount` (even if 0 due to slashing) and clears the timestamp. No condition can permanently block withdrawal after the cooldown.

**Edge case**: If a sentinel is slashed to `bondedAmount == 0` during cooldown, `finalizeExitSentinel()` still executes (with a 0-value transfer), properly cleaning up state. The `if (amount > 0)` guard at [line 150](file:///c:/Users/ascend%20X%20elysium/contracts/AegisSentinelRegistry.sol#L150) prevents a wasteful 0-token transfer. This is correct.

---

## 7. Migration and Deployment Risks (Task 4)

### 7.1 Architecture

Deployed contracts are immutable (no proxy pattern). Addresses from [`deployments.json`](file:///c:/Users/ascend%20X%20elysium/deployments.json):

| Contract | Address | Requires Redeployment |
|---|---|---|
| AegisVault | `0x05Aa229Aec102f78CE0E852A812a388F076Aa555` | **Yes** — new security logic |
| SentinelRegistry | `0x1275D096B9DBf2347bD2a131Fb6BDaB0B4882487` | **Yes** — new unbonding logic |
| FeeCollector | `0xC6bA8C3233eCF65B761049ef63466945c362EdD2` | No — unchanged, but must re-authorize new vault |
| AEGIS Token | `0xbCF26943C0197d2eE0E5D05c716Be60cc2761508` | No |
| USDC Token | `0x712516e61C8B383dF4A63CFe83d7701Bce54B03e` | No |

### 7.2 Critical Migration Risk: Old Registry Instant Withdrawal

> [!CAUTION]
> **The original (deployed) `AegisSentinelRegistry` has instant withdrawal via `exitSentinel()` (no cooldown).** If the migration plan is:
>
> 1. Deploy new registry
> 2. Ask sentinels to exit old registry and re-bond to new registry
>
> Then during step 2, sentinels can exit the old registry **instantly** (original code: `node.bondedAmount = 0; aegisToken.safeTransfer(msg.sender, amount)`), avoiding any slashing obligations from the old registry period.
>
> Any outstanding SLA violations that have not yet been slashed cannot be enforced after the sentinel withdraws from the old registry.

**Mitigation options** (not implemented, recommendations only):
1. **Freeze-then-migrate**: Owner could deploy a new version with admin controls to freeze exits on the old registry until all pending violations are resolved. This would require modifying the old contract (impossible — it's immutable).
2. **Parallel operation**: Run both registries in parallel during a transition period, resolving all pending violations on the old registry before instructing sentinels to migrate.
3. **Snapshot and transfer**: The owner could slash all outstanding violations on the old registry before announcing migration.

### 7.3 Position Migration

Vault positions are non-custodial (INV-1 verified at [EndToEndFlow.t.sol:182](file:///c:/Users/ascend%20X%20elysium/test/integration/EndToEndFlow.t.sol#L182)). Users simply call `registerPosition()` and `delegateSessionKey()` on the new vault. No token transfer is needed.

**However**: If a user has an open hedge (`activeHedges[vaultOwner].isOpen == true`) on the old vault at migration time, that hedge cannot be unwound on the new vault (different contract, different state). The old vault's unwind flow would need to remain operational until all active hedges are closed.

**Session keys** are vault-specific (EIP-712 domain includes the contract address). Keys delegated to the old vault will not work on the new vault. Users must re-delegate.

### 7.4 Nonce Continuity

Nonces are per-vault-contract. The new vault starts nonces at 0 for all users. This is safe because the EIP-712 domain separator includes the new contract address, preventing any cross-vault replay.

---

## 8. Testing Quality Assessment (Task 5)

### 8.1 Test Classification

| Category | Count | What They Prove |
|---|---|---|
| **Unit Tests (AegisVault)** | 15 | Core vault operations, double-hedge guard, unwind validation, trailing stop, slippage, manual override |
| **Unit Tests (SentinelRegistry)** | 19 (including 1 fuzz with 1000 runs) | Bonding, unbonding, cooldown enforcement, slashing, authorization |
| **Unit Tests (HyperCoreAdapters)** | 6 | Mock precompile behavior, ERC20 operations, writer intent recording |
| **Integration Test** | 1 | Full lifecycle: register → crash → hedge → rebound → unwind → fee → recovery |
| **Invariant Tests** | 5 suites × 256 runs × 128 calls = 163,840+ stateful calls | INV-1 (non-custody), INV-2 (slash bounds), INV-3 (override), INV-4 (fee conservation), INV-5 (nonce monotonicity) |
| **Keeper Tests (Jest)** | 17 | Signature matching, oracle fail-closed, risk engine math |

### 8.2 Test Environment vs. Live Compatibility

> [!IMPORTANT]
> **All Foundry tests use mocked precompiles and writers.** The `MockHyperCorePrecompile` is etched at `0x0801` via `vm.etch()`. The `MockHyperCoreWriter` is either etched at `0x0802` or injected via the `AegisVaultHarness._setHyperCoreWriter()` backdoor.
>
> These tests prove **logic correctness** — that the contract's internal state transitions are correct given valid oracle responses. They do **NOT** prove:
> - That the Elysium precompile `0x0801` returns data in the expected format
> - That the Elysium predeploy `0x0802` correctly executes orders
> - That the `0x3a4b9c1d` selector is the actual precompile interface
> - That price scaling (1e8) matches the live precompile output
>
> These are **mock-verified, not live-verified**. No test in the suite connects to a live Elysium node.

### 8.3 Coverage Assessment

The Phase 1B report claims specific coverage numbers from a `forge coverage` run. This reviewer did not independently re-run coverage to avoid modifying compiler artifacts. The reported numbers (95.37% line coverage on `AegisVault.sol`, 97.83% on `AegisSentinelRegistry.sol`) are consistent with the test count and observed test coverage patterns.

**Gaps identified by inspection** (not from a coverage report):
1. No test for re-registration after completed exit (HIGH-02)
2. No test for `updateLowestWick()` when the oracle returns 0 (the function silently returns because `liveMarkPrice > 0` check at line 262 fails)
3. No test for `exitSentinel()` when `bondedAmount` has been fully slashed to 0 during cooldown (edge case: finalization transfers 0 tokens)
4. No test for `executeHedgeIntent` when `size > 0` (positive, i.e., opening a long hedge instead of short). The contract accepts any sign for `size`, but the protocol intent is short hedges only.

### 8.4 Invariant Test Quality

The invariant test handler includes both `action_dispatchHedgeIntent` and `action_unwindHedgeIntent`, enabling the fuzzer to exercise the full hedge-unwind lifecycle. The handler correctly:
- Simulates crash prices (sets mock to $25.00 before hedging)
- Simulates rebound prices (sets mock to $42.00 before unwinding)
- Signs valid EIP-712 signatures with the correct session key
- Tracks nonce consumption via `ghost_noncesObserved`

**Limitation**: The handler sets fixed prices ($25.00 crash, $42.00 rebound) rather than fuzzing price values. This means the invariant tests do not exercise edge cases like exact-boundary trailing exit prices or oracle-price-equals-wick scenarios.

---

## 9. External Dependencies That Remain Unverified

| Dependency | Status | Risk |
|---|---|---|
| Elysium Precompile `0x0801` interface | **Unverified** — no specification available | Contract may revert on live testnet if selector, encoding, or return format differs |
| Elysium Predeploy `0x0802` interface | **Unverified** — uses `IHyperCoreWriter` mock | Order execution depends on unverified predeploy behavior |
| Precompile price scaling (assumed 1e8) | **Unverified** — assumed from mock configuration | Incorrect scaling would silently produce wrong health factors, trailing targets, and fee calculations |
| Precompile availability on testnet | **Confirmed unavailable** — Phase 1A report states `0x0801` and `0x0802` return `0x` | All on-chain operations will revert until Elysium team provisions precompiles |
| Ascend Hook Pool liquidity | **Unverified** — uses `MockAscendHookPool` | Fee buyback-and-burn depends on live pool having adequate `$AEGIS/USDC` liquidity |
| Testnet token contracts (public `burn()`) | **Unresolved** (SEC-05) | Deployed ERC20 tokens may allow arbitrary burning |

---

## 10. Prioritized Recommendations for Next Phase

### Priority 1: Immediate (Pre-Deployment)
1. **Obtain and verify the Elysium precompile specification** — Confirm `0x0801` selector (`0x3a4b9c1d`), encoding format (`abi.encode(uint32)`), return format (`abi.encode(uint256)`), and price scaling (1e8). Without this, on-chain deployment is blocked.
2. **Test on a live Elysium testnet node with provisioned precompiles** — Replace mocks with actual precompile calls and verify end-to-end flow.

### Priority 2: High (Before Public Launch)
3. **Add re-registration test** — Verify state consistency when a sentinel completes exit and re-bonds.
4. **Document session key expiry behavior during unwind** — Explicitly decide whether expired keys should be allowed to close positions and document the rationale.
5. **Plan migration with outstanding slashing obligations** — Resolve all pending violations on the old registry before instructing sentinels to migrate.

### Priority 3: Medium (Hardening)
6. **Add `uint96` bounds check** on `registerPosition()` to prevent silent truncation.
7. **Fuzz trailing exit boundary values** in invariant handler — randomize oracle prices instead of using fixed $25/$42 values.
8. **Consider adding a `size < 0` check** in `executeHedgeIntent` if the protocol only supports short hedges.

### Priority 4: Low (Maintenance)
9. **Refactor `exitSentinel()`** to call `initiateExitSentinel()` and `finalizeExitSentinel()` internally (requires removing `nonReentrant` from the inner functions or using a shared internal implementation).
10. **Remove or restrict testnet mock token `burn()` methods** before any public-facing testnet launch.

---

## 11. Conclusion

The Phase 1B remediation is **well-engineered and correctly addresses the three targeted vulnerabilities** (SEC-03, SEC-04, SEC-06). The implementation follows defensive patterns, preserves pre-existing invariants, and adds substantial test coverage.

The primary remaining risks are:
1. **External dependency on unverified Elysium precompiles** (blocking live deployment)
2. **Migration risk from old registry's instant withdrawal** (must be planned carefully)
3. **Missing re-registration test coverage** (non-blocking but should be added)

No code changes, deployments, or commits were made during this review.

---
*End of Phase 1B.1 Independent Security Verification Report*
