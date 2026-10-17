# AEGIS Protocol — Phase 2.2: Native Integration and Deployment Compatibility Verification Report

**Document Version**: 1.0.0  
**Date**: October 14, 2026  
**Auditor / Engineering Role**: Senior Solidity Security Engineer, Web3 Infrastructure Architect, Protocol Accounting Specialist  
**Target Network**: Elysium L2 Testnet (`Chain ID 99801`, RPC: `https://testnet-rpc.elysium.kinetiq.xyz`)  
**Target Production Network**: Elysium L2 Mainnet (Unlaunched per Alchemy Elysium API FAQ)  
**Operational Posture**: Local Development & Safe Testnet-First Verification (Zero deployments, zero transaction broadcasts, keeper daemon in `DRY_RUN=true`)  

---

## Executive Summary

Phase 2.2 executes the **Native Integration and Deployment Compatibility Verification** phase established as a prerequisite following the approval of `AEGIS_TESTNET_TO_MAINNET_READINESS_PLAN.md`.

In strict adherence to protocol safety rules and founder directives:
1. **Strict Local Boundaries**: No contract deployments or transaction broadcasts were executed. Existing deployment records in `deployments.json` remain completely untouched.
2. **Keeper Safety**: The autonomous Sentinel keeper daemon remains strictly configured in `DRY_RUN=true`.
3. **No Unsubstantiated Readiness Claims**: Live execution and live AMM buybacks are not claimed while native Elysium precompiles (`0x0801`/`0x0802`) return empty bytecode (`0x`) and the configured Ascend pool is a local mock (`MockAscendHookPool`).
4. **External Dependency Acknowledgment**: Per Alchemy's official [Elysium API FAQ](https://www.alchemy.com/docs/reference/elysium-api-faq), Elysium mainnet has not launched. AEGIS cannot assume a mainnet deployment date or the availability of native L1 interfaces without upstream confirmation.

This report delivers five critical narrow-scope outcomes:
- **Test Evidence Reconciliation**: Resolves the literal phrasing discrepancy between invariant runs, sequence depth, and total state transitions, and rigorously distinguishes the 98 Foundry tests, 17 keeper tests, and 13 frontend tests from the 163,840 fuzzed invariant-handler transitions.
- **Governance Design Review**: Formally evaluates the 3-of-5 multisig and 48-hour timelock candidates as proposals rather than rigid mandates, evaluating emergency response, Invariant `INV-3` manual override independence, and authorized slasher management.
- **Staking & Yield Framework**: Defines the economic, mathematical, asset, and failure-mode specifications for protocol yield distribution prior to writing code for `AegisStakingPool.sol`.
- **Interface & Redeployment Mapping**: Authoritatively reconciles the divergent ABIs for `0x0801` and `0x0802`, maps deployed contracts against immutable bindings, and identifies exactly which components require new contract instances.
- **Position & Obligation Migration Plan**: Formulates a complete migration strategy that cryptographically respects EIP-712 domain separation, protects non-custodial user positions, preserves deferred fee debts, and maintains Sentinel slashing integrity.

---

## 1. Test Evidence Reconciliation

A rigorous audit of the Foundry configuration (`foundry.toml`), test execution output logs, and handler implementations was conducted to reconcile previously reported test metrics and eliminate ambiguity.

### 1.1 Resolution of Invariant Run and Call Counts

The prior planning document noted that the five invariant suites completed "256 runs with 32,768 calls each, while also describing 160,000-plus transitions." If interpreted literally as $256 \text{ runs} \times 32,768 \text{ calls/run}$, that would imply $8,388,608$ calls per suite, which is mathematically incongruent with the 160,000-plus transitions.

Inspection of `foundry.toml` reveals the authoritative configuration:
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200

[fuzz]
runs = 256

[invariant]
runs = 256
depth = 128
fail_on_revert = false
```

#### The Precise Invariant Testing Mechanics:
- **Runs ($N_{\text{runs}}$)**: `256` independent sequence simulations per invariant test.
- **Depth ($D_{\text{depth}}$)**: `128` sequential handler calls per run.
- **Calls per Invariant Suite ($C_{\text{suite}}$)**:
  $$C_{\text{suite}} = N_{\text{runs}} \times D_{\text{depth}} = 256 \times 128 = 32,768\text{ handler calls}$$
- **Invariant Test Suites ($5$ suites across 5 test contracts)**:
  1. `test/invariants/InvariantCustody.t.sol` (Contains 2 invariant tests: `invariant_INV1_ZeroSentinelTokenAllowance`, `invariant_INV1_ZeroVaultCollateralCustody`)
  2. `test/invariants/InvariantFeeSplit.t.sol` (Contains 1 invariant test: `invariant_INV4_StrictFeeConservation`)
  3. `test/invariants/InvariantNonce.t.sol` (Contains 1 invariant test: `invariant_INV5_MonotonicNonceEquality`)
  4. `test/invariants/InvariantOverride.t.sol` (Contains 1 invariant test: `invariant_INV3_ManualOverrideGuaranteesZeroKey`)
  5. `test/invariants/InvariantSlashing.t.sol` (Contains 2 invariant tests: `invariant_INV2_SlashingNeverExceedsTenPercent`, `invariant_INV2_SubMinimumBondDeactivatesNode`)

Across the **5 invariant test contracts**, each executes its fuzz campaign against `VaultHandler.sol`:
$$\text{Total Stateful Transitions} = 5 \text{ suites} \times 32,768 \text{ calls} = 163,840 \text{ handler action calls}$$

During execution of `forge test --match-path "test/invariants/*" -vv`:
- **Total Invariant Handler Calls**: **163,840 calls**
- **Reverts**: **0**
- **Discards**: **0**
- **Violations**: **0** (All 7 invariant assertion functions held true after every single transition).

#### Handler Action Call Distribution (per Suite Run):
In each 32,768-call campaign, the 9 actions on `VaultHandler.sol` were exercised evenly:
```
╭──────────────+──────────────────────────────+───────+─────────+──────────╮
│ Contract     │ Selector                     │ Calls │ Reverts │ Discards │
+==============+==============================+=======+=========+==========+
│ VaultHandler │ action_dispatchHedgeIntent   │ 3,607 │ 0       │ 0        │
│ VaultHandler │ action_distributeYield       │ 3,626 │ 0       │ 0        │
│ VaultHandler │ action_executeBuybackAndBurn │ 3,716 │ 0       │ 0        │
│ VaultHandler │ action_manualOverride        │ 3,650 │ 0       │ 0        │
│ VaultHandler │ action_processFee            │ 3,688 │ 0       │ 0        │
│ VaultHandler │ action_registerPosition      │ 3,657 │ 0       │ 0        │
│ VaultHandler │ action_setProConfig          │ 3,667 │ 0       │ 0        │
│ VaultHandler │ action_slashSentinel         │ 3,581 │ 0       │ 0        │
│ VaultHandler │ action_unwindHedgeIntent     │ 3,576 │ 0       │ 0        │
╰──────────────+──────────────────────────────+───────+─────────+──────────╯
Total Calls per Suite: 32,768 | Reverts: 0 | Discards: 0
```

### 1.2 Categorization: Discrete Tests vs. Fuzzed State Transitions

The discrete unit, integration, and truthfulness tests must be strictly separated from the handler state transitions:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TEST SUITE RECONCILIATION                                     │
├──────────────────────────┬──────────────┬───────────────┬────────────────────────────────────────┤
│ Verification Category    │ Framework    │ Test Count    │ Scope & Coverage                       │
├──────────────────────────┼──────────────┼───────────────┼────────────────────────────────────────┤
│ 1. Smart Contract Tests  │ Foundry      │ **98 tests**  │ 12 test suites:                        │
│                          │ (forge test) │ (98 passed)   │ - 27 Unit (AegisVault)                 │
│                          │              │               │ - 22 Unit/Fuzz (FeeCollector)          │
│                          │              │               │ - 26 Unit (SentinelRegistry)           │
│                          │              │               │ - 6 Unit (HyperCoreAdapters)           │
│                          │              │               │ - 5 Unit (TradeIntentExecutor)         │
│                          │              │               │ - 4 Property Fuzz (MarginMathFuzz)     │
│                          │              │               │ - 1 End-to-End Integration             │
│                          │              │               │ - 7 Invariant Assertion Functions      │
├──────────────────────────┼──────────────┼───────────────┼────────────────────────────────────────┤
│ 2. Keeper Daemon Tests   │ Jest         │ **17 tests**  │ 3 test suites:                         │
│                          │ (npm test)   │ (17 passed)   │ - Risk engine math (8 tests)           │
│                          │              │               │ - Unwind EIP-712 signing (4 tests)     │
│                          │              │               │ - Fail-closed oracle reads (5 tests)   │
├──────────────────────────┼──────────────┼───────────────┼────────────────────────────────────────┤
│ 3. Frontend Truthfulness │ Node.js      │ **13 tests**  │ 6 verification suites:                 │
│                          │ (assert)     │ (13 passed)   │ - Deceptive claim absence              │
│                          │              │               │ - RPC failure & latency isolation      │
│                          │              │               │ - feeDebts revert handling (0x05Aa...) │
│                          │              │               │ - Dual fee model separation            │
│                          │              │               │ - External price fallback safety       │
│                          │              │               │ - Live testnet queries (9.04M+ block)  │
├──────────────────────────┼──────────────┼───────────────┼────────────────────────────────────────┤
│ **Total Discrete Tests** │              │ **128 tests** │ **All 128 tests passing (100% pass)**  │
├──────────────────────────┼──────────────┼───────────────┼────────────────────────────────────────┤
│ 4. Invariant Transitions │ Foundry      │ **163,840**   │ Fuzzed state transitions across        │
│                          │ (Handler)    │ **calls**     │ 5 suites x 32,768 calls (0 reverts)    │
└──────────────────────────┴──────────────┴───────────────┴────────────────────────────────────────┘
```

---

## 2. Governance Evaluation: Proposals vs. Operational Realities

The previously suggested 3-of-5 Gnosis Safe multisig and 48-hour timelock are **evaluation candidates**, not finalized requirements. Imposing a blanket 48-hour timelock without analyzing the protocol's emergency mechanisms introduces catastrophic failure modes.

### 2.1 Ownership Architecture of AEGIS Contracts

All three core AEGIS contracts utilize OpenZeppelin `Ownable`:
- `AegisVault.sol`: Owner can update `feeCollector` address (`setFeeCollector`).
- `AegisFeeCollector.sol`: Owner can update `ascendHookPool`, `yieldDistributionTarget`, and toggle `authorizedVaults`.
- `AegisSentinelRegistry.sol`: Owner can toggle `authorizedSlashers`.

### 2.2 Emergency Response Conflict Analysis

| Mechanism | Intended Speed | Impact of Rigid 48h Timelock | Architectural Verdict |
| :--- | :---: | :--- | :--- |
| **Invariant INV-3 (Instant Manual Override)** | Single atomic transaction ($< 1\text{ block}$) | **Zero Impact**. `manualOverride()` is called directly by the position owner (borrower). It does **not** pass through contract ownership or governance. Non-custodial revocation remains instant and autonomous. | **INV-3 remains strictly decentralized and permissionless.** |
| **Sentinel Slashing (`INV-2`)** | Immediate upon malicious intent detection | Slashing is called by `AegisVault` via `slashSentinel(...)`. If a new vault instance is deployed (e.g. following an upgrade) or an exploit occurs, updating `authorizedSlashers` would be delayed by 48 hours, leaving Sentinels unslashed or unverified. | **Requires fast-track slasher authorization.** |
| **Fee Collector Vault Authorization** | Immediate on contract upgrade | `feeCollector.setAuthorizedVault(newVault, true)` authorizes the vault to collect averted fees and fee debts. A 48h timelock would halt fee settlement for 2 days during an emergency migration. | **Requires fast-track migration pathway.** |
| **Ascend Pool Slippage / Exploit Pause** | Immediate in DEX depeg | If the external Ascend pool is drained or compromised, setting a new pool or halting buybacks must happen in minutes, not 48 hours. | **Requires an Emergency Pause Role.** |

### 2.3 Proposed Governance Model for Review

Rather than a single timelocked multisig, the following **Two-Tier Governance Architecture** is submitted for founder evaluation:

```mermaid
flowchart TD
    subgraph Tier 1: Emergency Security Council (3-of-5 Multisig)
        SC[Security Council Multisig] -->|Instant Action| PAUSE[Pause Fee Buybacks & Fee Collection]
        SC -->|Instant Action| FREEZE[Emergency Circuit Breaker]
        SC -->|Fast Lane| MIGRATE[Authorize Replacement Vault for Slashing / Fees]
    end

    subgraph Tier 2: Community / Governance Timelock (48-Hour Delay)
        TL[Timelock Controller: 48h Delay] -->|Delayed Execution| PARAM[Alter Minimum Bond: 25k AEGIS]
        TL -->|Delayed Execution| COOLDOWN[Alter Unbonding Cooldown: 7 Days]
        TL -->|Delayed Execution| TARGET[Alter Yield Distribution Target Address]
        TL -->|Delayed Execution| OWNERSHIP[Transfer Contract Ownership]
    end

    style SC fill:#FFB800,stroke:#8A5800,color:#000
    style TL fill:#07705F,stroke:#04453A,color:#fff
```

1. **Tier 1 — Emergency Security Council (3-of-5 Multisig, Zero Delay)**:
   - Threshold: 3-of-5 signers across geographically distributed keyholders using hardware modules.
   - Powers: Pause fee buybacks, update authorized vault linkages during hotfixes, freeze compromised pool hooks.
2. **Tier 2 — Protocol Timelock (48-Hour Minimum Delay)**:
   - Threshold: Formal governance queue with public on-chain event emission.
   - Powers: Parameter changes (`MIN_BOND`, `UNBONDING_COOLDOWN`, `feeBps`), transferring ownership, or redirecting `yieldDistributionTarget`.

---

## 3. Staking & Yield Distribution Framework (Prior to Writing Code)

Before implementing `AegisStakingPool.sol`, the protocol must formally specify the reward accounting, asset eligibility, and insolvency failure modes.

### 3.1 Recipient Eligibility & Economic Alignment

| Model Option | Eligible Recipients | Incentive Alignment | Slashing Contagion Risk | Protocol Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Sentinel-Only Pool** | Only active bonded Sentinels with $\ge 25,000$ AEGIS bond | Rewards node operators for uptime and liquidation prevention | High if staking pool is commingled with the slashing bond registry | **Not Recommended**: Restricts token utility to infrastructure operators. |
| **Option B: Public Staking Pool** | Any $AEGIS token holder | Creates broad token sink, aligns community with protocol growth | Zero: Public staking is isolated from node slashing obligations | **RECOMMENDED**: Maximizes decentralized participation. |
| **Option C: Dual-Tranche Pool** | Tranche 1: Sentinels (70%)<br>Tranche 2: Passive Holders (30%) | Balances infrastructure risk with tokenholder rewards | Medium: Requires dual accounting logic | Candidate for future governance vote. |

### 3.2 Yield Calculation & Accounting Methodology

1. **Denomination of Yield**:
   - `AegisFeeCollector.sol` collects protocol fees in **USDC** (from averted liquidation penalties and fee debt repayments).
   - In `AegisFeeCollector.distributeYield()`, the 50% yield share is transferred as **USDC** to `yieldDistributionTarget`.
   - **Crucial Specification**: Yield rewards are paid in **USDC (Stable Yield)**, NOT in newly minted or inflationary $AEGIS tokens!
2. **Mathematical Distribution Engine (Synthetix / MasterChef Cumulative Share)**:
   To support arbitrary deposits, withdrawals, and continuous fee inflows without looping over stakers:
   $$\text{accRewardPerShare}_{t} = \text{accRewardPerShare}_{t-1} + \frac{\Delta \text{USDC} \times 10^{18}}{\text{Total Staked AEGIS}}$$
   $$\text{Pending Staker Yield} = \frac{\text{Staker Staked AEGIS} \times \text{accRewardPerShare}}{10^{18}} - \text{RewardDebt}$$
3. **Precision and Integer Math**:
   - $USDC has 6 decimals; $AEGIS has 18 decimals.
   - The scaling factor must use $10^{18}$ fixed-point arithmetic to prevent truncation of small fee distributions.

### 3.3 Accepted Assets and Separation of Concerns

- **Staked Asset**: Canonical $AEGIS token (ERC-20, 18 decimals).
- **Reward Payout Asset**: Canonical $USDC token (ERC-20, 6 decimals).
- **Separation from Sentinel Registry**:
  - The 25,000 $AEGIS bond deposited in `AegisSentinelRegistry.sol` must **remain strictly isolated** from `AegisStakingPool.sol`.
  - Commingling staking rewards with the slashing bond registry would create reentrancy attack vectors, wherein a slashed Sentinel could attempt to front-run slashing by withdrawing yield or claim restitution assets.

### 3.4 Failure Modes & Edge Cases

1. **Zero-Staker Inflow**:
   - *Problem*: If `AegisFeeCollector.distributeYield()` is called when `totalStakedAEGIS == 0`, division by zero occurs.
   - *Requirement*: `AegisStakingPool` must retain incoming USDC in an unallocated `undistributedYield` buffer until the first staker deposits.
2. **Transfer Failure / External Revert**:
   - *Problem*: If `AegisStakingPool` reverts on receiving USDC, does it freeze fee collection?
   - *Protection*: In `AegisFeeCollector.sol`, `distributeYield()` is an atomic pull-to-push function separated from `processAvertedFee()`. If `distributeYield()` reverts, fees remain safely in `stakerYieldBudget` without blocking borrower unwinds.
3. **Rounding Dust**:
   - Any fractional micro-USDC ($< 10^{-6}$) remaining due to integer division remains in the pool balance and rolls into the subsequent distribution.

---

## 4. Authoritative Elysium Native Interface Audit (`0x0801` & `0x0802`)

Safe, read-only on-chain telemetry against Elysium testnet (`https://testnet-rpc.elysium.kinetiq.xyz`, Chain ID `99801`, Block `#9,042,124+`) was analyzed alongside the repository documentation and codebase.

```mermaid
flowchart TD
    subgraph Elysium Node Client (EVM State Transition)
        P1[Address 0x0801: Native Precompile]
        P2[Address 0x0802: Native Predeploy Writer]
    end

    subgraph AEGIS Active Codebase
        ADAPTER[HyperCoreOracleAdapter.sol] -->|staticcall 0x3a4b9c1d| P1
        EXECUTOR[TradeIntentExecutor.sol] -->|call 0x50af1851 placeHedgeIntent| P2
    end

    subgraph AEGIS Technical Docs (docs/docs.js)
        DOC1[IHyperCoreReadPrecompile] -.->|getPerpMarket 0xec901e2a| P1
        DOC2[IElysiumCoreWriter] -.->|dispatchOrderIntent 0x5fcdc8ee| P2
    end

    subgraph Live Testnet Reality (Chain 99801)
        P1 -->|eth_call| RET1[Returns 0x: 0 Bytes]
        P2 -->|eth_call| RET2[Returns 0x: 0 Bytes]
    end

    style RET1 fill:#B8254F,stroke:#801633,color:#fff
    style RET2 fill:#B8254F,stroke:#801633,color:#fff
```

### 4.1 Interface Divergence Matrix

| Interface Attribute | Active Solidity Implementation | Documented in `docs/docs.js` | Testnet RPC Observation |
| :--- | :--- | :--- | :--- |
| **Market Data Address** | `0x0000000000000000000000000000000000000801` | `0x0000000000000000000000000000000000000801` | Bytecode: `0x` (Standard for precompiles) |
| **Market Data Selector** | `0x3a4b9c1d` (Hardcoded in adapter) | `0xec901e2a` (`getPerpMarket(uint32)`) | Both selectors return `0x` (0 bytes) |
| **Market Data Return** | Single `uint256 markPrice` ($10^8$) | `(uint64 markPrice, int64 fundingRate, uint128 openInterest)` | None (Triggers `PrecompileReadFailed`) |
| **Writer Address** | `0x0000000000000000000000000000000000000802` | `0x0000000000000000000000000000000000000802` | Bytecode: `0x` (Unprovisioned predeploy) |
| **Writer Selector** | `0x50af1851` (`placeHedgeIntent(...)`) | `0x5fcdc8ee` (`dispatchOrderIntent(...)`) | Both selectors return `0x` |
| **Signature Location** | Verified in `TradeIntentExecutor.sol` | Verified inside Predeploy `0x0802` | Cannot verify on unprovisioned node |

### 4.2 Upstream Dependency Status

Per Alchemy's official [Elysium API FAQ](https://www.alchemy.com/docs/reference/elysium-api-faq):
- **Elysium Mainnet Launch**: Not launched.
- **Node Precompile Provisioning**: Precompiles `0x0801` and `0x0802` are native C++/Go/Rust state transition opcodes. They cannot be deployed via standard EVM transactions; they must be enabled in the node client software by the Elysium/Kinetiq engineering team.
- **Current Status**: **BLOCKED ON UPSTREAM NODE ACTIVATION**.

---

## 5. Ascend Testnet Pool Interface Verification

In `deployments.json`, `ascendPool` is set to `0x59F2f1fCfE2474fD5F0b9BA1E73ca90b143Eb8d0`.

### 5.1 Verification Findings
1. **Mock Verification**: On-chain query to `0x59F2f...` on testnet confirms `rateMultiplier()` returns `10000000000000`, identifying it as `MockAscendHookPool.sol` ($1\text{ USDC} = 10\text{ AEGIS}$).
2. **Absence of Genuine Pool**: No genuine Ascend AMM router, Uniswap v4-style pool key (`PoolKey`), or liquidity hook contracts have been provided or deployed on Elysium testnet.
3. **Integration Status**: **UNVERIFIED / BLOCKED**. Swaps and buyback burns cannot be considered genuine market operations until supported Ascend testnet contracts are provisioned.

---

## 6. Contract Instance Mapping: Configurable vs. Required Redeployments

To establish exact deployment requirements for future phases, every contract in `deployments.json` was analyzed against immutability and upgrade constraints:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CONTRACT COMPATIBILITY & REDEPLOYMENT MATRIX                       │
├──────────────────────┬────────────────────────┬─────────────┬────────────────────────────────────┤
│ Contract Component   │ Deployed Address       │ Status      │ Redeployment Requirement           │
├──────────────────────┼────────────────────────┼─────────────┼────────────────────────────────────┤
│ **AegisVault**       │ `0x05Aa...555`         │ OUTDATED    │ **REQUIRES NEW DEPLOYMENT**        │
│                      │                        │             │ Reason 1: Lacks Phase 1C           │
│                      │                        │             │ `feeDebts(address)` and repay logic│
│                      │                        │             │ Reason 2: `hyperCoreWriter` is     │
│                      │                        │             │ hardcoded to 0x0802 with no setter │
├──────────────────────┼────────────────────────┼─────────────┼────────────────────────────────────┤
│ **AegisFeeCollector**│ `0xC6bA...dD2`         │ LOCKED      │ **REQUIRES NEW DEPLOYMENT**        │
│                      │                        │             │ Reason: `usdcToken` and `aegisToken│
│                      │                        │             │ are IMMUTABLE. Cannot point to     │
│                      │                        │             │ canonical tokens without redeploy. │
├──────────────────────┼────────────────────────┼─────────────┼────────────────────────────────────┤
│ **AegisSentinel-**   │ `0x1275...487`         │ LOCKED      │ **REQUIRES NEW DEPLOYMENT**        │
│ **Registry**         │                        │             │ Reason: `aegisToken` is IMMUTABLE. │
│                      │                        │             │ Cannot accept canonical $AEGIS     │
│                      │                        │             │ bonds without redeploy.            │
├──────────────────────┼────────────────────────┼─────────────┼────────────────────────────────────┤
│ **AscendHookPool**   │ `0x59F2...8d0`         │ MOCK        │ Reconfigurable via owner setter:   │
│                      │                        │             │ `setAscendHookPool(newAddress)`    │
├──────────────────────┼────────────────────────┼─────────────┼────────────────────────────────────┤
│ **Yield Target**     │ `0xf0e7...D64` (EOA)   │ PLACEHOLDER │ Reconfigurable via owner setter:   │
│                      │                        │             │ `setYieldDistributionTarget(pool)` │
└──────────────────────┴────────────────────────┴─────────────┴────────────────────────────────────┘
```

---

## 7. Migration Plan: Protecting Positions, Keys, Debts, and Slashing

When updated contract instances are deployed on Elysium testnet (or mainnet), the migration must strictly protect active borrower positions, cryptographic session keys, fee debt records, and Sentinel slashing bonds.

### 7.1 User Positions & Collateral (Invariant `INV-1`)

- **Non-Custodial Architecture**: Under `INV-1`, `AegisVault` holds **zero collateral** ($0.00). User collateral resides exclusively in primary lending vaults or user wallets.
- **Position Migration Strategy**:
  1. Emit complete snapshot of all active `positions[borrower]` from legacy vault events (`PositionRegistered`, `ProConfigSet`).
  2. Because risk parameters (`minBorrowerLtv`, `deltaCoverageRatio`, `trailingProfitBps`) belong to the user, borrowers re-register on the new vault via a single setup transaction, OR an authorized migration batch script initializes position state if authorized by user governance.

### 7.2 Session Keys & EIP-712 Nonces (Invariants `INV-1` & `INV-5`)

- **Cryptographic Domain Separation**:
  The EIP-712 domain hash is defined as:
  $$\text{DomainSeparator} = \text{keccak256}(\text{EIP712Domain}(\text{"AEGIS Protocol"}, \text{"1.0.0"}, \text{chainId}, \mathbf{verifyingContract}))$$
- **CRITICAL SECURITY REQUIREMENT**:
  Because `verifyingContract` is bound to the vault address, **any session key signature signed for the legacy vault (`0x05Aa...`) is cryptographically invalid on a newly deployed vault**.
  - **Action**: Existing session keys **cannot and must not be blindly ported**.
  - **Procedure**: Borrowers must sign a fresh session key delegation targeting the new vault address.
  - **Nonce Reset**: In `TradeIntentExecutor.sol`, `vaultNonces[borrower]` starts at `0` on the new contract instance. Because the domain separator is distinct, there is **zero risk of replay collisions** (INV-5) between legacy and new vaults.

### 7.3 Deferred Fee Debt Obligations (Invariant `INV-4`)

- **Current State**: On the deployed vault (`0x05Aa...`), `feeDebts` does not exist (calls revert `0x`), so zero on-chain debt exists on testnet.
- **Migration Strategy for Future Upgrades**:
  1. If fee debts are accrued on an active vault prior to migration:
  2. A snapshot of all non-zero `feeDebts[borrower]` must be extracted.
  3. The new vault must include an authenticated one-time initialization migration function (`migrateFeeDebts(address[] borrowers, uint256[] amounts)`), restricted to the contract owner prior to launch.
  4. Repayment continues via `repayFeeDebt()` on the new vault, routing funds to `AegisFeeCollector`.

### 7.4 Sentinel Slashing Responsibilities & Staked Bonds (Invariant `INV-2`)

If `AegisSentinelRegistry` is preserved and only `AegisVault` is redeployed:
1. Owner calls `sentinelRegistry.setAuthorizedSlasher(newVaultAddress, true)`.
2. Owner calls `sentinelRegistry.setAuthorizedSlasher(oldVaultAddress, false)`.
3. **Outcome**: All active Sentinel node bonds ($25,000$ AEGIS), reputations, registration timestamps, and unbonding cooldown timers remain **100% intact with zero disruption**.

If `AegisSentinelRegistry` must be redeployed (e.g. to switch to the canonical $AEGIS token):
1. A 7-day unbonding grace period must be announced to node operators.
2. Sentinels initiate `unstake()` on the legacy registry, wait the 7-day `UNBONDING_COOLDOWN`, and withdraw mock tokens.
3. Sentinels stake canonical $AEGIS tokens on the new registry instance.

---

## 8. Summary of Phase 2.2 Findings & Recommendations

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 2.2 ACTIONABLE SUMMARY                              │
├──────────────────────────────┬─────────────────────────────┬───────────────────────────┤
│ Verification Objective       │ Current State               │ Recommended Next Action   │
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 1. Test Reconciliation       │ 128 discrete tests pass;    │ Baseline confirmed. No    │
│                              │ 163,840 transitions verified│ further test math edits.  │
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 2. Governance Design         │ Single deployer EOA         │ Adopt Two-Tier Governance │
│                              │                             │ proposal for review.      │
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 3. Staking Specification     │ Staking pool not built      │ Formal spec defined. Hold │
│                              │                             │ coding until dependencies.│
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 4. Native Precompiles        │ 0x0801 & 0x0802 return 0x   │ Blocked on upstream node. │
│                              │                             │ Keep keeper in DRY_RUN.   │
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 5. Ascend AMM Pool           │ MockAscendHookPool (Mock)   │ Blocked on genuine Ascend │
│                              │                             │ testnet pool addresses.   │
├──────────────────────────────┼─────────────────────────────┼───────────────────────────┤
│ 6. Contract Deployments      │ 0x05Aa... is pre-Phase 1C   │ Preserve deployments.json;│
│                              │                             │ redeploy only when ready. │
└──────────────────────────────┴─────────────────────────────┴───────────────────────────┘
```

### Operational Mandate:
- **Preserve Deployed Contracts**: All contracts in `deployments.json` remain untouched.
- **Preserve Keeper Posture**: Keeper daemon remains strictly in `DRY_RUN=true`.
- **Awaiting Upstream Milestones**: Progress to Phase 3 deployment remains paused pending authoritative confirmation of native Elysium precompile provisioning and genuine Ascend AMM interfaces.
