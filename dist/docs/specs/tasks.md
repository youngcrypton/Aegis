# AEGIS Protocol — Work Breakdown & Tasks

> **Ordered, Actionable Work Items for Single-Session Coding Agent Execution**  
> Document Version: 1.0.0  
> Status: Draft — Phase 3 Work Breakdown  
> Derived From: [`SPECIFICATION.md`](file:///c:/Users/ascend%20X%20elysium/SPECIFICATION.md) and [`IMPLEMENTATION.md`](file:///c:/Users/ascend%20X%20elysium/IMPLEMENTATION.md)  
> Target Tooling: Solidity `0.8.24`, Foundry (`forge`), Node.js / TypeScript, Vanilla ES6 Web3 Terminal

---

## Summary

| Metric | Value |
| :--- | :--- |
| **Total Tasks** | 22 Tasks |
| **Phases** | 6 Phases |
| **Estimated Effort** | 70–95 Hours Total |
| **Foundation Complete** | After Task 3 |
| **Core Contracts & Invariants Complete** | After Task 11 |
| **Sentinel Keeper Daemon Complete** | After Task 15 |
| **Pro-Trader Terminal Aligned & Interactive** | After Task 19 |
| **Full Release & E2E Verified** | After Task 22 |

---

## Phase 1: Foundation & Toolchain Setup

> **Objective**: Scaffold the Foundry smart contract workspace, configure compiler settings, and implement shared domain types and mock precompiles.  
> **State after Phase 1**: Foundry compiles cleanly (`forge build`), all core types exist, mock precompiles are ready for test harnesses.

### Task 1: Foundry Workspace & Config Scaffolding

**Configure the root Foundry environment, dependency remappings, and compiler settings for Elysium L2.**

**Files to create/modify:**
- `foundry.toml` — Foundry configuration with optimizer settings, EVM Cancun target, and RPC endpoints.
- `remappings.txt` — Forge dependency remappings for OpenZeppelin and Forge Std.
- `.gitignore` — Ensure `out/`, `cache/`, `broadcast/`, and `.env` are ignored.

**Implementation Details:**
1. Configure `foundry.toml` with Solidity version `0.8.24`, optimizer enabled (`runs = 200`), `via_ir = true`, and EVM version `cancun`.
2. Add Elysium L2 network configuration (Chain ID `99801`, RPC endpoint placeholder).
3. Set remappings:
   - `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/`
   - `forge-std/=lib/forge-std/src/`
4. Update `.gitignore` with standard Foundry and Node.js artifacts.

**Acceptance Criteria:**
- [ ] `forge --version` confirms Foundry is installed and recognized.
- [ ] `foundry.toml` is syntactically valid and loads without configuration warnings.
- [ ] `.gitignore` contains all build directories (`out/`, `cache/`, `node_modules/`, `broadcast/`).
- [ ] Remappings resolve cleanly without path errors.

**Dependencies:** None  
**Effort:** 1–2 hours  
**Refs:** IMPLEMENTATION.md §1.1, §1.3, §8.1

---

### Task 2: Core Domain Types & Packed Storage Schemas

**Implement shared data types, packed structs, enums, and custom error signatures for AEGIS smart contracts.**

**Files to create:**
- `contracts/AegisTypes.sol` — Enums, structs (`VaultPosition`, `ProConfig`, `ActiveHedge`, `SentinelNode`), and custom errors.

**Implementation Details:**
1. Define enums:
   - `TriggerMode { PRICE, HEALTH_FACTOR, HYBRID }`
   - `OrderType { POST_ONLY_LIMIT, IOC, MARKET }`
   - `VaultState { STANDBY, ARMED, HEDGED, UNWOUND, OVERRIDDEN }`
2. Implement packed structs strictly per IMPLEMENTATION.md §4.1:
   - `ProConfig`: Pack `triggerMode`, `orderType`, `hedgeRatioBps`, `trailingTakeProfitBps`, `maxSlippageBps`, `sessionKeyExpiry`, and `manualOverrideActive` into Slot 1 (15 bytes), with `priceTrigger` (Slot 2) and `healthFactorTrigger` (Slot 3).
   - `VaultPosition`: Pack `owner`, `liquidationThresholdBps`, `lastHedgeBlock` into Slot 1, `collateralToken`, `collateralAmount` into Slot 2, `debtAmountUsdc` into Slot 3, and `sessionKey` into Slot 4.
3. Declare custom error types from SPECIFICATION.md §6.4:
   - `InvalidHealthTrigger()`, `InsufficientBondAmount()`, `SessionKeyExpired()`, `UnauthorizedCaller()`, `SlippageExceeded()`, `OverrideActive()`, `ZeroAddress()`.

**Acceptance Criteria:**
- [ ] `contracts/AegisTypes.sol` compiles cleanly with zero warnings (`forge build`).
- [ ] Struct storage packing consumes exactly expected slot allocations (verified via slot calculator or solc inspect).
- [ ] All custom errors are declared and exported.

**Dependencies:** Task 1  
**Effort:** 2–3 hours  
**Refs:** SPECIFICATION.md §5.1, §6.4; IMPLEMENTATION.md §4.1

---

### Task 3: HyperCore Precompile & Predeploy Adapters and Test Mocks

**Create low-level staticcall wrappers for precompiles `0x0801` / `0x0802` and test mock contracts for local test execution.**

**Files to create:**
- `contracts/adapters/HyperCoreOracleAdapter.sol` — Low-level staticcall library querying precompile `0x0801`.
- `contracts/interfaces/IHyperCoreWriter.sol` — Interface for predeploy `0x0802` (`ElysiumCoreWriter`).
- `test/mocks/MockHyperCorePrecompile.sol` — Mock harness simulating mark prices, bid/ask spreads, and depth on `0x0801`.
- `test/mocks/MockHyperCoreWriter.sol` — Mock harness recording trade intents emitted to `0x0802`.
- `test/mocks/MockERC20.sol` — Mintable test token implementation for `$AEGIS`, `USDC`, and `HYPE`.

**Implementation Details:**
1. Implement `HyperCoreOracleAdapter.sol` using inline assembly `staticcall` to query `address(0x0801)` and return scaled 1e8 mark prices.
2. Implement `MockHyperCorePrecompile.sol` allowing test harnesses to inject synthetic prices (`setMockPrice(uint32 perpIndex, uint256 price)`).
3. Implement `MockHyperCoreWriter.sol` recording received orders (`lastVault`, `lastSize`, `lastLimitPrice`, `intentCount`).
4. Implement standard mintable `MockERC20.sol` supporting 6 decimals for USDC and 18 decimals for HYPE and AEGIS.

**Acceptance Criteria:**
- [ ] `forge build` compiles all adapters and mocks cleanly.
- [ ] `MockHyperCorePrecompile` returns configured prices for arbitrary `perpIndex`.
- [ ] `MockHyperCoreWriter` records intent payloads and exposes verification getters.

**Dependencies:** Task 2  
**Effort:** 3–4 hours  
**Refs:** IMPLEMENTATION.md §2.1, §5.1, §5.2

---

## Phase 2: Core Smart Contract Implementation

> **Objective**: Implement the primary protocol smart contracts: Registry, Fee Collector, Intent Executor, Vault, and Emergency Manual Override.  
> **State after Phase 2**: Complete on-chain business logic deployed and testable on local EVM.

### Task 4: Sentinel Registry & Bond Escrow Contract

**Implement node operator registration, 25,000 $AEGIS bonding, and 10% SLA slashing.**

**Files to create:**
- `contracts/interfaces/IAegisSentinelRegistry.sol` — External interface.
- `contracts/AegisSentinelRegistry.sol` — Main contract implementing node lifecycle.

**Implementation Details:**
1. Implement `bondStake(uint256 amount)`:
   - Requires `amount >= 25,000 * 1e18` for new nodes.
   - Transfers `$AEGIS` using `SafeERC20.safeTransferFrom()`.
   - Sets `nodes[operator].isActive = true`.
   - Emits `SentinelRegistered(operator, amount)`.
2. Implement `unstake(uint256 amount)`:
   - Enforces a 7-day unbonding queue or instant withdrawal if remaining bond $\ge 25,000 \times 10^{18}$.
3. Implement `slashSentinel(address operator, address victim, uint256 slashBps, string calldata reason)`:
   - Enforces Invariant **INV-2 (Slashing Bound)**: `slashBps <= 1000` (max 10%).
   - Calculates `slashAmount = (nodes[operator].bondedAmount * slashBps) / 10000`.
   - Deducts from operator bond and transfers directly to `victim` wallet.
   - Deactivates node if remaining bond drops below 25,000 `$AEGIS`.
   - Emits `SentinelSlashed(operator, victim, slashAmount, reason)`.

**Acceptance Criteria:**
- [ ] Staking under 25,000 tokens reverts with `InsufficientBondAmount()`.
- [ ] Slashing exceeding 10% (1,000 bps) reverts with `SlashExceedsMaxBound()`.
- [ ] Slashed tokens are transferred directly to `victim`, not kept in protocol contract.
- [ ] Deactivation triggers automatically when bonded stake falls below 25,000.

**Dependencies:** Task 3  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §3.4; IMPLEMENTATION.md §2.4

---

### Task 5: Performance Fee Collector & 50/50 Flywheel Engine

**Implement 10% averted liquidation fee collection, 50% Ascend buyback-and-burn, and 50% staking yield distribution.**

**Files to create:**
- `contracts/interfaces/IAegisFeeCollector.sol` — External interface.
- `contracts/AegisFeeCollector.sol` — Fee distribution contract.
- `test/mocks/MockAscendHookPool.sol` — Mock AMM pool executing token swap and dead-burn.

**Implementation Details:**
1. Implement `processAvertedFee(address vaultOwner, uint256 savedPenaltyAmount)`:
   - Calculates fee: `feeAmount = (savedPenaltyAmount * 1000) / 10000` (10%).
   - Transfers USDC fee from user vault balance to FeeCollector.
   - Divides into exactly 50% (`buybackBudget`) and 50% (`yieldBudget`) (Invariant **INV-4**).
2. Implement `executeBuybackAndBurn()`:
   - Approves `buybackBudget` to Ascend Closed Hook Pool router.
   - Executes market swap USDC $\rightarrow$ `$AEGIS`.
   - Transfers purchased `$AEGIS` to `0x000000000000000000000000000000000000dEaD`.
   - Emits `BuybackAndBurnExecuted(usdcSpent, aegisBurned)`.
3. Implement `distributeYield()`:
   - Allocates `yieldBudget` to registered `$AEGIS` governance stakers proportionally.
   - Emits `YieldDistributed(usdcAmount)`.

**Acceptance Criteria:**
- [ ] Fees are assessed strictly at 10% of averted penalty amount.
- [ ] Net fee revenue splits exactly 50/50 between buyback and yield without remainder leakage (INV-4).
- [ ] Buyback transfers purchased tokens to dead burn address.
- [ ] Non-owners cannot extract unallocated fees.

**Dependencies:** Task 4  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §3.5; IMPLEMENTATION.md §1.2 (Decision 6), §7.1

---

### Task 6: Trade-Only Session Key Intent Executor

**Implement cryptographic EIP-712 session key verification and sub-second intent emission to `0x0802`.**

**Files to create:**
- `contracts/core/TradeIntentExecutor.sol` — Abstract contract managing EIP-712 digests and nonces.

**Implementation Details:**
1. Inherit from OpenZeppelin `EIP712("AEGIS Protocol", "1.0.0")`.
2. Define `HEDGE_INTENT_TYPEHASH` per IMPLEMENTATION.md §2.2.
3. Implement `_verifyAndDispatch()`:
   - Verifies `block.timestamp <= deadline`.
   - Increments per-vault nonce `vaultNonces[vaultOwner]++` (Invariant **INV-5**).
   - Recovers signer via `ECDSA.recover(digest, signature)`.
   - Asserts `recovered == delegatedSessionKey` (reverting with `UnauthorizedSessionKey()`).
   - Dispatches call to `address(0x0802)`.
4. Ensure mathematically zero capability to initiate token transfers (Invariant **INV-1**).

**Acceptance Criteria:**
- [ ] Valid EIP-712 signature passes and increments nonce.
- [ ] Expired signature reverts with `IntentExpired()`.
- [ ] Signature from unauthorized address reverts with `UnauthorizedSessionKey()`.
- [ ] Replay attack with same signature reverts due to incremented nonce.

**Dependencies:** Task 3  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §8; IMPLEMENTATION.md §2.2

---

### Task 7: Primary Vault Contract & Lifecycle Engine

**Implement `AegisVault.sol` managing collateral tracking, ProConfig settings, session key delegations, and hedge trigger execution.**

**Files to create:**
- `contracts/interfaces/IAegisVault.sol` — Vault interface.
- `contracts/AegisVault.sol` — Core protocol vault contract.

**Implementation Details:**
1. Inherit from `TradeIntentExecutor`, `ReentrancyGuardUpgradeable`, and `Ownable`.
2. Implement `registerPosition(address collateralToken, uint256 amount, uint256 debtUsdc, uint16 ltvBps)`.
3. Implement `setProConfig(ProConfig calldata config)`:
   - Validates ranges: `hedgeRatioBps` $\in [1000, 10000]$, `healthFactorTrigger` $\in [10200, 13000]$, `maxSlippageBps` $\in [10, 100]$.
   - Stores tightly packed config in `vaultConfigs[msg.sender]`.
4. Implement `delegateSessionKey(address key, uint48 duration)`:
   - Asserts `duration <= 30 days` and `key != address(0)`.
5. Implement `executeHedgeIntent(address vaultOwner, uint32 perpIndex, int256 size, uint256 limitPrice, bytes calldata sig)`:
   - Reads mark price via `HyperCoreOracleAdapter.getPerpPrice(perpIndex)`.
   - Computes Health Factor $H$.
   - Verifies trigger condition $(H \le H_{\text{trigger}}) \lor (P \le P_{\text{trigger}})$.
   - Verifies session key signature and dispatches to `0x0802`.
   - Updates `activeHedges[vaultOwner]`.

**Acceptance Criteria:**
- [ ] Vault registration correctly records collateral and debt balances.
- [ ] `setProConfig` rejects out-of-bounds parameters.
- [ ] `executeHedgeIntent` executes only if health factor or price trigger condition is satisfied.
- [ ] Emits `HedgeExecuted(vaultOwner, size, limitPrice)`.

**Dependencies:** Task 5, Task 6  
**Effort:** 5–6 hours  
**Refs:** SPECIFICATION.md §3.1, §3.2; IMPLEMENTATION.md §2.3, §4.1

---

### Task 8: Emergency Manual Override Killswitch & Event Logging

**Implement single-transaction manual override killswitch and audit logging in `AegisVault.sol`.**

**Files to modify:**
- `contracts/AegisVault.sol` — Add override state and modifiers.

**Implementation Details:**
1. Implement `manualOverride()`:
   - Callable only by `vaultOwner` (`require(msg.sender == vaultPositions[vaultOwner].owner)`).
   - Sets `vaultConfigs[msg.sender].manualOverrideActive = true`.
   - Revokes active session key (`vaultPositions[msg.sender].sessionKey = address(0)`).
   - Emits signed cancellation intent to `0x0802` for all resting orders.
   - Emits `ManualOverrideTriggered(msg.sender, block.timestamp)`.
2. Add modifier `whenNotOverridden(address vaultOwner)`:
   - Reverts any Sentinel call with `OverrideActive()` if flag is true.
3. Implement `resetOverride()` allowing owner to resume autonomous protection.

**Acceptance Criteria:**
- [ ] Calling `manualOverride()` instantly halts Sentinel execution authority in the same block (Invariant **INV-3**).
- [ ] Subsequent calls to `executeHedgeIntent()` revert with `OverrideActive()`.
- [ ] Non-owner accounts cannot trigger override for another user's vault.

**Dependencies:** Task 7  
**Effort:** 2–3 hours  
**Refs:** SPECIFICATION.md §3.1.2; IMPLEMENTATION.md §2.3

---

## Phase 3: Testing Architecture & Invariant Fuzzing

> **Objective**: Write comprehensive unit tests, differential math fuzzing, and formal stateful invariant tests to verify INV-1 through INV-5.  
> **State after Phase 3**: 100% test pass rate with 10,000+ invariant fuzz runs proving mathematical invariants hold.

### Task 9: Smart Contract Unit Test Suite

**Write unit tests for Vault, Registry, and FeeCollector covering happy paths, reverts, and edge cases.**

**Files to create:**
- `test/unit/AegisVault.t.sol` — Unit tests for vault registration, parameter updates, and trigger logic.
- `test/unit/SentinelRegistry.t.sol` — Unit tests for bonding, SLA tracking, and slashing.
- `test/unit/FeeCollector.t.sol` — Unit tests for fee capture, 50/50 splits, and burn dispatch.

**Implementation Details:**
1. Test vault registration with valid and invalid collateral tokens.
2. Test parameter validation for `setProConfig` across boundary values.
3. Test session key delegation and expiry checks.
4. Test Sentinel bond staking and minimum 25k threshold.
5. Test fee collector calculations and dead address transfers.

**Acceptance Criteria:**
- [ ] `forge test --match-path test/unit/*` passes with 100% success rate.
- [ ] All custom error revert cases are asserted via `vm.expectRevert()`.
- [ ] Line coverage for `contracts/` exceeds 90%.

**Dependencies:** Task 8  
**Effort:** 4–5 hours  
**Refs:** IMPLEMENTATION.md §7.1, §7.2

---

### Task 10: Formal Invariant Fuzzing Suite (INV-1 through INV-5)

**Implement stateful Foundry invariant testing to mathematically prove system invariants.**

**Files to create:**
- `test/invariants/InvariantCustody.t.sol` — Tests Invariant **INV-1 (Non-Custodial)**.
- `test/invariants/InvariantSlashing.t.sol` — Tests Invariant **INV-2 (Slashing Bounds)**.
- `test/invariants/InvariantOverride.t.sol` — Tests Invariant **INV-3 (Instant Manual Override)**.
- `test/invariants/InvariantFeeSplit.t.sol` — Tests Invariant **INV-4 (Fee Conservation)**.
- `test/invariants/InvariantNonce.t.sol` — Tests Invariant **INV-5 (Monotonic Nonce Ordering)**.
- `test/invariants/handlers/VaultHandler.sol` — Fuzz actor performing random deposits, parameter sets, and trigger attempts.

**Implementation Details:**
1. Implement `VaultHandler` providing fuzzer with valid action space.
2. In `InvariantCustody.t.sol`: Assert that contract collateral balance always equals sum of user deposits minus explicit user withdrawals; Sentinel withdrawal allowance is always 0.
3. In `InvariantSlashing.t.sol`: Assert that slashed tokens never exceed active bonded stake and are never diverted from victim.
4. In `InvariantFeeSplit.t.sol`: Assert that `totalFeesCaptured == totalBurnedFees + totalYieldDistributed`.
5. In `InvariantNonce.t.sol`: Assert nonces increase strictly monotonically per vault.

**Acceptance Criteria:**
- [ ] `forge test --match-contract Invariant --fuzz-runs 10000` passes with 0 violations.
- [ ] All 5 invariants INV-1 through INV-5 are proven unbroken across random multi-call sequences.

**Dependencies:** Task 9  
**Effort:** 5–6 hours  
**Refs:** SPECIFICATION.md §8; IMPLEMENTATION.md §7.1

---

### Task 11: Differential Margin Math Fuzzing

**Implement property-based fuzz tests validating Health Factor ($H$), Hedge Sizing ($\gamma$), and Trailing Exit ($P_{\text{exit}}$).**

**Files to create:**
- `test/fuzz/MarginMathFuzz.t.sol` — Mathematical property tests.

**Implementation Details:**
1. Fuzz test $H = \frac{Q_C \cdot P \cdot T}{D}$ across random price drawdowns ($P \in [1, 10000]$):
   - Assert $H$ drops monotonically as $P$ decreases.
   - Assert liquidation condition $H \le 1.00$ triggers exactly when collateral value $< D / T$.
2. Fuzz test $Q_{\text{hedge}}$ sizing formula:
   - For $\gamma = 1.00$, assert $Q_{\text{hedge}} = Q_{\text{collateral}}$.
   - For $\gamma < 1.00$, assert post-hedge net delta equals $(1 - \gamma) \cdot Q_{\text{collateral}}$.
3. Fuzz test trailing exit formula $P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$:
   - Assert $P_{\text{exit}} > P_{\text{lowest}}$ for all $\tau > 0$.

**Acceptance Criteria:**
- [ ] `forge test --match-contract MarginMathFuzz` executes 5,000+ runs with 0 mathematical discrepancies.
- [ ] Edge cases (zero debt, extreme collateral scale, tiny wicks) handled cleanly without overflow/underflow.

**Dependencies:** Task 10  
**Effort:** 2–3 hours  
**Refs:** SPECIFICATION.md §2; IMPLEMENTATION.md §1.2

---

## Phase 4: Sentinel Keeper Daemon (`@aegis/sentinel`)

> **Objective**: Implement the off-chain keeper service evaluating 100ms blocks, computing Greeks, and dispatching signed intents.  
> **State after Phase 4**: Runnable Node.js daemon that connects to Elysium RPC and dispatches hedge intents autonomously.

### Task 12: Keeper Scaffolding, Config & WebSocket Block Monitor

**Scaffold the TypeScript daemon project and implement the 100ms block header listener.**

**Files to create:**
- `keeper/package.json` — Node.js project manifest with `ethers`, `ws`, `dotenv`, `typescript`.
- `keeper/tsconfig.json` — Strict TypeScript configuration.
- `keeper/src/config.ts` — Environment variable validation and contract address loader.
- `keeper/src/telemetry.ts` — WebSocket listener for Elysium L2 block headers and ticker events.

**Implementation Details:**
1. Configure `package.json` with scripts: `build`, `start`, `dev`, `test`.
2. Implement `config.ts` parsing RPC URLs, private keys, and contract addresses with Zod or clean validation.
3. Implement `telemetry.ts` connecting to Elysium WebSocket, logging new block numbers, and emitting `newBlock` events within 10ms of receipt.
4. Add automatic reconnect logic for WebSocket drops with exponential backoff.

**Acceptance Criteria:**
- [ ] `npm run build` in `keeper/` compiles with zero TypeScript errors.
- [ ] Daemon connects to WebSocket and prints received block headers.
- [ ] Gracefully reconnects if WebSocket connection drops.

**Dependencies:** Task 8  
**Effort:** 3–4 hours  
**Refs:** IMPLEMENTATION.md §8.1, §8.2

---

### Task 13: Risk Telemetry & Sizing Calculation Engine

**Implement the risk engine querying `0x0801` mark prices and computing Health Factor and hedge size.**

**Files to create:**
- `keeper/src/risk_engine.ts` — Mathematical model evaluation.

**Implementation Details:**
1. Implement `evaluateVault(position: VaultPosition, config: ProConfig, markPrice: bigint)`:
   - Calculate current health factor $H$.
   - Check trigger breach: $(H \le H_{\text{trigger}}) \lor (P_{\text{collateral}} \le P_{\text{trigger}})$.
2. Implement `calculateHedgeSize(position: VaultPosition, config: ProConfig, perpPrice: bigint)`:
   - Compute required short size $Q_{\text{hedge}}$ based on user coverage ratio $\gamma$.
   - Bound size to maximum position delta.
3. Export structured `RiskAssessment` object containing triggers, current health, and recommended action.

**Acceptance Criteria:**
- [ ] Unit tests verify health calculation matches on-chain Solidity math within $10^{-6}$ relative tolerance.
- [ ] Returns `ACTION_HEDGE` exactly when threshold condition is satisfied.
- [ ] Returns `ACTION_HOLD` when health factor is safe.

**Dependencies:** Task 12  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §3.2; IMPLEMENTATION.md §8.1

---

### Task 14: Trailing Wick Tracker & Profit-Lock State Machine

**Implement off-chain tracking of lowest wick prices and profit-take exit triggers.**

**Files to create:**
- `keeper/src/trailing_tracker.ts` — Lowest wick and dynamic exit tracker.

**Implementation Details:**
1. Implement `TrailingWickTracker` class per IMPLEMENTATION.md §2.5:
   - Store `entryPrice`, `lowestPrice`, and `tolerancePct`.
   - On each price update, update `lowestPrice = Math.min(lowestPrice, currentPrice)`.
   - Calculate exit trigger: `exitTrigger = lowestPrice * (1 + tolerancePct)`.
   - Evaluate `shouldUnwind = currentPrice >= exitTrigger`.
2. Persist active hedge trackers in memory with serialization support for daemon crash recovery.

**Acceptance Criteria:**
- [ ] Unit tests verify lowest price never increases during a single drawdown episode.
- [ ] `shouldUnwind` returns `true` when price bounces above `lowestPrice * (1 + tolerancePct)`.
- [ ] Correctly computes realized cash profit per token.

**Dependencies:** Task 13  
**Effort:** 2–3 hours  
**Refs:** SPECIFICATION.md §3.3; IMPLEMENTATION.md §2.5

---

### Task 15: EIP-712 Session Key Intent Signer & Dispatcher

**Implement EIP-712 structured signing and transaction dispatch to `0x0802`.**

**Files to create:**
- `keeper/src/order_signer.ts` — EIP-712 signature generation.
- `keeper/src/index.ts` — Main orchestrator loop wiring telemetry, risk engine, and signer.

**Implementation Details:**
1. Implement `signHedgeIntent(vaultOwner, perpIndex, size, limitPrice, nonce, deadline)`:
   - Build EIP-712 typed data payload matching `HEDGE_INTENT_TYPEHASH`.
   - Sign using operator's delegated session key private key.
2. Implement transaction submission:
   - Call `AegisVault.executeHedgeIntent()` passing signature and parameters.
   - Monitor transaction receipt and confirm order fill on HyperCore.
3. Wire the full loop in `index.ts`:
   - On new block $\rightarrow$ query 0x0801 $\rightarrow$ evaluate vaults $\rightarrow$ sign & submit hedge if triggered $\rightarrow$ initiate trailing tracker.

**Acceptance Criteria:**
- [ ] Generates valid EIP-712 signatures matching `AegisVault.sol` digest format.
- [ ] Successfully calls `executeHedgeIntent()` on testnet / local fork.
- [ ] Logs end-to-end execution latency from block event to submission confirmation.

**Dependencies:** Task 14  
**Effort:** 4–5 hours  
**Refs:** SPECIFICATION.md §3.2; IMPLEMENTATION.md §2.2, §8.1

---

## Phase 5: Pro-Trader Terminal Refactoring (`app/`)

> **Objective**: Refactor the Pro-Trader Terminal in `app/` into 100% compliance with `brand/kit/tokens.css`, dual-theme support, and real Web3 wallet provider hooks.  
> **State after Phase 5**: Modern, brand-compliant terminal running on port 3000, supporting live simulation and wallet connectivity.

### Task 16: CSS Brand Kit Token Integration & Dual-Theme System

**Refactor `app/styles.css` to import `tokens.css`, eliminate all hardcoded hex colors, and implement 16px flat surface panels.**

**Files to modify:**
- `app/styles.css` — Refactor to 100% tokenized CSS.

**Implementation Details:**
1. Import `brand/kit/tokens.css` at line 1.
2. Replace all hard-coded colors with CSS variables:
   - Backgrounds $\rightarrow$ `var(--ground)`
   - Cards & Bento containers $\rightarrow$ `var(--raised)`, `border: 1px solid var(--rule)`, `border-radius: 16px`
   - Primary text & headlines $\rightarrow$ `var(--ink)`, `font-family: var(--display)` (Marcellus)
   - Secondary text $\rightarrow$ `var(--ink-2)`
   - Active accents & safe badges $\rightarrow$ `var(--accent)` (Teal)
   - Caution & hedge open states $\rightarrow$ `var(--hedge)` (Amber)
   - Danger & manual override $\rightarrow$ `var(--danger)` (Rose)
3. Remove all cybernetic glow filters (`.ambient-glow`, `box-shadow` neons, backdrop blurs) per `AGENTS.md` Rule 7.
4. Support theme switching natively via `:root[data-theme="dark"]` and `:root[data-theme="light"]`.

**Acceptance Criteria:**
- [ ] Zero hard-coded hex color values remain in `app/styles.css` (verified via automated search).
- [ ] Dual-theme toggle seamlessly switches colors between Light and Dark mode.
- [ ] All panels have 16px border-radius and 1px `var(--rule)` borders.
- [ ] Zero glow effects or decorative gradients remain on product UI.

**Dependencies:** None  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §7.3; IMPLEMENTATION.md §6.1; AGENTS.md

---

### Task 17: HTML Template Refactor & Typography Modernization

**Refactor `app/index.html` to adopt Marcellus/Inter fonts, clean brand lockup, and ensure responsive layout at 390px.**

**Files to modify:**
- `app/index.html` — Clean structure, typography links, accessibility tags.

**Implementation Details:**
1. Update `<head>` font links to Marcellus and Inter only (remove Outfit and JetBrains Mono).
2. Insert official 3-blade SVG logo mark from `brand/kit/aegis-brand-kit.html`.
3. Add theme switcher toggle button (`#themeBtn`) to header.
4. Ensure all flex and grid children holding text include `min-width: 0` to prevent horizontal overflow.
5. Verify 16px minimum side gutters on phone viewports.

**Acceptance Criteria:**
- [ ] Page renders with Marcellus display headings and Inter body text.
- [ ] Brand lockup uses official 3-blade SVG geometry.
- [ ] No horizontal scroll bar at 390px mobile viewport width.
- [ ] Theme switcher toggles `data-theme` attribute on `document.documentElement`.

**Dependencies:** Task 16  
**Effort:** 2–3 hours  
**Refs:** SPECIFICATION.md §7.2, §7.3; AGENTS.md

---

### Task 18: Client State Store & Mathematical Simulation Engine

**Refactor `app/app.js` to align simulation math with formal protocol models and dynamic SVG health gauges.**

**Files to modify:**
- `app/app.js` — Client state engine and simulation handlers.

**Implementation Details:**
1. Update mathematical formulas in `app.js` to strictly match SPECIFICATION.md §2 and §3:
   - $H = \frac{Q_C \cdot P \cdot T}{D}$
   - $Q_{\text{hedge}} = \gamma \cdot \frac{D - (Q_C \cdot P \cdot T)}{P \cdot (1 - T)}$
   - $P_{\text{exit}} = P_{\text{lowest}} \cdot (1 + \tau)$
2. Implement interactive simulation triggers:
   - `-18% Flash Crash`: drops price from $48.50 to $39.77, triggers ARMED $\rightarrow$ HEDGING, plots short hedge.
   - `-8% Retracement`: drops price to $44.62, activates hedge, then bounces to $46.00 triggering trailing unwind and cash profit capture.
   - `Reset Market`: restores baseline $48.50 mark price.
3. Update dynamic SVG buffer gauge to render Danger, Warning, and Safe zones using `--danger`, `--hedge`, and `--accent`.

**Acceptance Criteria:**
- [ ] Flash crash button triggers autonomous hedge within simulated 100ms ticker interval.
- [ ] Retracement button simulates full trailing take-profit lock and updates realized PnL.
- [ ] Gauge marker dynamically updates position and color based on health factor $H$.

**Dependencies:** Task 17  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §3.6; IMPLEMENTATION.md §6.2

---

### Task 19: Web3 Provider & Session Key Delegation Hooks

**Implement EIP-1193 wallet connection and contract interaction hooks in `app/app.js`.**

**Files to modify:**
- `app/app.js` — Add Web3 connection module.

**Implementation Details:**
1. Implement `connectWallet()` requesting accounts via `window.ethereum.request({ method: 'eth_requestAccounts' })`.
2. Implement network switch check for Elysium L2 (Chain ID `99801` / `0x185d9`).
3. If connected, read live position from `AegisVault.sol` (if deployed) or fallback to demo simulator mode.
4. Add "Generate Trade-Only Session Key" modal/handler creating a local ephemeral keypair and requesting user signature for `delegateSessionKey()`.

**Acceptance Criteria:**
- [ ] Wallet button displays truncated address (`0x71C...a89F`) upon connection.
- [ ] Prompts network switch if connected to chain other than 99801.
- [ ] Supports seamless fallback to mock simulator mode if no wallet is injected.

**Dependencies:** Task 18  
**Effort:** 3–4 hours  
**Refs:** SPECIFICATION.md §3.6; IMPLEMENTATION.md §6.3

---

## Phase 6: Integration, Deployment & Release

> **Objective**: Write deployment scripts, containerize the keeper daemon, and execute an end-to-end system smoke test.  
> **State after Phase 6**: Production-ready deployment artifacts and release documentation.

### Task 20: Foundry Deployment Pipeline for Elysium L2

**Implement deployment scripts in `script/DeployAegis.s.sol` to deploy and link the entire contract system.**

**Files to create:**
- `script/DeployAegis.s.sol` — Production deployment script.
- `script/SeedMockEnvironment.s.sol` — Local testnet seeding script.

**Implementation Details:**
1. Implement deployment order:
   - Deploy `MockERC20` tokens (if local/testnet).
   - Deploy `AegisFeeCollector.sol`.
   - Deploy `AegisSentinelRegistry.sol`.
   - Deploy `AegisVault.sol`.
   - Link contract addresses (`setRegistry`, `setFeeCollector`).
2. Implement verification output logging deployed addresses to JSON artifact.

**Acceptance Criteria:**
- [ ] `forge script script/DeployAegis.s.sol` executes successfully in local anvil/fork simulation.
- [ ] All deployed contracts are linked with correct authorized addresses.

**Dependencies:** Task 8, Task 10  
**Effort:** 3–4 hours  
**Refs:** IMPLEMENTATION.md §9.1

---

### Task 21: Keeper Daemon Containerization & Process Spec

**Create production Dockerfile and PM2 configuration for high-availability Sentinel node operators.**

**Files to create:**
- `keeper/Dockerfile` — Multi-stage lightweight Node.js container.
- `keeper/docker-compose.yml` — Container configuration with healthchecks.

**Implementation Details:**
1. Multi-stage Dockerfile: build TypeScript in builder stage, copy dist into slim Node.js runner.
2. Add non-root user execution for security.
3. Add health check endpoint verifying WebSocket connectivity and RPC block latency.

**Acceptance Criteria:**
- [ ] `docker build -t aegis-sentinel keeper/` builds image under 150MB.
- [ ] Container starts and streams block header logs cleanly.

**Dependencies:** Task 15  
**Effort:** 2–3 hours  
**Refs:** IMPLEMENTATION.md §9.2

---

### Task 22: End-to-End System Smoke Test & Release Verification

**Execute complete end-to-end integration test validating the entire protocol flow from deposit to hedge unwind.**

**Files to create:**
- `test/integration/EndToEndFlow.t.sol` — Complete multi-contract integration scenario.

**Scenario Verified:**
1. User deposits 1,000 HYPE collateral ($48.50) and borrows $32,000 USDC ($H = 1.41$).
2. User configures ProConfig ($H_{\text{trigger}} = 1.10$, $\gamma = 0.50$, $\tau = 1.5\%$) and delegates session key.
3. Sentinel bonds 25,000 `$AEGIS`.
4. Market flash-crashes to $39.50 ($H = 1.05 \le 1.10$).
5. Sentinel executes short hedge of 500 HYPE via `0x0802`.
6. Market bottoms at $39.00 and bounces to $39.60 (breaching $\tau = 1.5\%$).
7. Sentinel unwinds short hedge at profit; fee collector captures 10% fee.
8. Fee collector executes 50% buyback-burn and 50% yield distribution.
9. Verify all balances, invariants INV-1 through INV-5, and final safe health factor $H > 1.25$.

**Acceptance Criteria:**
- [ ] `forge test --match-contract EndToEndFlow` passes with 100% success.
- [ ] Invariants hold throughout entire lifecycle.
- [ ] Zero collateral loss experienced by the user.

**Dependencies:** Tasks 1–21  
**Effort:** 4–5 hours  
**Refs:** SPECIFICATION.md §1.1, §3; IMPLEMENTATION.md §2

---

## Milestones & Release Roadblocks

| Milestone | Target Tasks | Verifiable Outcome | Demo / Test Capability |
| :--- | :---: | :--- | :--- |
| **M1: Foundation** | Tasks 1–3 | Foundry builds, types & mocks compile | `forge build` passes |
| **M2: Contract Logic** | Tasks 4–8 | Core contracts written and deployed locally | Local test deployment |
| **M3: Mathematical Invariants** | Tasks 9–11 | Formal invariants INV-1 to INV-5 proven unbroken | `forge test --fuzz-runs 10000` |
| **M4: Keeper Daemon** | Tasks 12–15 | Off-chain keeper monitors 100ms blocks & signs intents | Daemon console telemetry |
| **M5: Brand-Compliant UI** | Tasks 16–19 | Pro-Trader Terminal 100% aligned with `tokens.css` | Interactive browser demo on :3000 |
| **M6: Full Release** | Tasks 20–22 | End-to-end integration flow verified | `forge test` E2E scenario pass |

---

## Dependency Graph

```
[Task 1: Scaffolding] 
       ↓
[Task 2: Types & Storage] 
       ↓
[Task 3: Precompile Adapters & Mocks]
       ↓
   +---+-------------------------+
   |                             |
   v                             v
[Task 4: Registry]       [Task 6: Intent Executor]
   |                             |
   v                             |
[Task 5: Fee Collector]          |
   |                             |
   +------------+----------------+
                |
                v
       [Task 7: AegisVault]
                |
                v
       [Task 8: Manual Override]
                |
   +------------+------------+----------------------------+
   |                         |                            |
   v                         v                            v
[Task 9: Unit Tests]   [Task 12: Keeper Scaffold]   [Task 16: Terminal CSS]
   |                         |                            |
   v                         v                            v
[Task 10: Invariant Fuzz] [Task 13: Risk Engine]    [Task 17: Terminal HTML]
   |                         |                            |
   v                         v                            v
[Task 11: Math Fuzz]   [Task 14: Trailing Tracker]  [Task 18: Client Math Engine]
                             |                            |
                             v                            v
                       [Task 15: Intent Signer]     [Task 19: Web3 Wallet Connect]
                             |                            |
                             +------------+---------------+
                                          |
                                          v
                              [Task 20: Deploy Pipeline]
                                          ↓
                              [Task 21: Keeper Docker]
                                          ↓
                              [Task 22: E2E Smoke Test]
```
