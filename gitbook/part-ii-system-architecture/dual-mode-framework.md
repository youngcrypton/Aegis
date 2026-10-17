# Modular Dual-Mode Framework

{% hint style="warning" %}
**Empirical Truth on Elysium Testnet:** Elysium Orbit L2 currently executes stock Arbitrum Nitro ArbOS. Calling unmapped address `0x0801` returns `0x` (empty bytes) and calling `0x0802` reverts. AEGIS solves this today using the **Modular Dual-Mode Stack**.
{% endhint %}

## 1. The Two Execution Modes

To ensure external users can test AEGIS risk defense immediately without waiting for the L2 validator hardfork, the protocol supports two interchangeable operational modes:

| Execution Dimension | Mode 1: Stock ArbOS Testnet (Live Today) | Mode 2: Native Precompiles (Post-Hardfork) |
| :--- | :--- | :--- |
| **Price Telemetry** | `RelayedOracleAdapter.sol` (`0x9fE4...`) with 120s/300s staleness checks | Precompile `0x0801`: Direct EVM memory read (<70ms latency, 0 gas) |
| **Intent Dispatch** | `AgentDispatchAdapter.sol` (`0x2279...`): Emits EVM events to Sentinels | Predeploy `0x0802`: Synchronous cross-domain call to HyperCore matching engine |
| **Smart Contract Vault** | Identical `AegisVault.sol` contract | Identical `AegisVault.sol` contract |
| **Migration Required** | Deployed on Elysium Testnet (Chain ID 99801) | **Zero Vault Migration, Zero Collateral Movement** |

---

## 2. Zero-Downtime Hot-Swap Architecture

When Elysium validators upgrade ArbOS to expose native precompiles `0x0801` and `0x0802`, protocol governance calls two administrative functions on `AegisVault.sol`:

```solidity
// Zero-Downtime Migration Functions in AegisVault.sol
function setOracleAdapter(address newOracle) external onlyOwner {
    require(newOracle != address(0), "Invalid adapter");
    oracleAdapter = IOracleAdapter(newOracle);
    emit OracleAdapterUpdated(newOracle);
}

function setDispatchAdapter(address newDispatcher) external onlyOwner {
    require(newDispatcher != address(0), "Invalid adapter");
    dispatchAdapter = IDispatchAdapter(newDispatcher);
    emit DispatchAdapterUpdated(newDispatcher);
}
```

* **User Impact:** Zero. User vault balances, session key delegations, debt positions, and risk profiles remain completely unaffected.
* **Testing Impact:** 100% of smart contract tests, keeper loops, and UI flows operate identically across both modes.
