# Three-Tier Protocol Stack

{% hint style="info" %}
AEGIS bridges Elysium Orbit L2 EVM smart contract security with HyperCore's L1 sub-second matching engine through a decentralized Sentinel Keeper network.
{% endhint %}

## 1. Architectural Layers

AEGIS separates financial execution into three specialized layers:

```
[Layer 1: Elysium Orbit L2] 
  ├── AegisVault.sol (Collateral, EIP-712 Session Keys, Fee Debts)
  ├── AegisSentinelRegistry.sol (Operator Bonding & Slashing)
  └── AegisFeeCollector.sol (50/50 Ascend Burn & Staking Yield)
       │
       ▼ (Sub-100ms Telemetry Polling via Multicall3)
[Layer 2: Sentinel Keeper Network]
  ├── Continuous Health Factor Evaluation (H <= 1.15)
  ├── Dynamic Optimal Hedge Sizing (S*)
  └── Sub-78ms Cryptographic EIP-712 Intent Signing
       │
       ▼ (Direct Trade-Only API Lane)
[Layer 3: HyperCore L1 Matching Engine]
  ├── Central Limit Order Book (CLOB) Execution
  ├── Sub-Second Short Perpetual Matching
  └── Trailing Take-Profit Unwinds & Debt Paydown
```

---

## 2. Core On-Chain Contracts

### 2.1 `AegisVault.sol` (Phase 1C Deployed: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`)
* Holds deposited user collateral (e.g. Canonical WHYPE `0xCD57...`).
* Tracks borrowed debt (e.g. Canonical USDC `0x7D29...`).
* Stores authorized session keys and timestamps.
* Maintains deferred fee debt balances (`feeDebts[user]`).
* Exposes `manualOverride()` killswitch.

### 2.2 `AegisFeeCollector.sol` (`0x8A791620dd6260079BF849Dc5567aDC3F2FdC318`)
* Captures the 10% performance fee on averted liquidation losses.
* Enforces strict 50/50 fee conservation (Invariant **INV-4**):
  * **50% Buyback-and-Burn:** Routed to Ascend Hook Pools to burn $AEGIS.
  * **50% Staking Yield:** Distributed in canonical USDC to bonded Sentinel stakers.

### 2.3 `AegisSentinelRegistry.sol` (`0x610178dA211FEF7D417bC0e6FeD39F05609AD788`)
* Enforces a minimum 25,000 $AEGIS node operator bond.
* Enforces a 10% maximum slashing cap per infraction.
* Enforces a 7-day unbonding cooldown period.
