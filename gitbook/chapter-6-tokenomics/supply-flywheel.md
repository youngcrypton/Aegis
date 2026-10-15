# Hard-Capped Supply & Burn Flywheel

{% hint style="info" %}
**Tokenomics Guarantee:** Hard-capped supply of 700,000,000 $AEGIS with zero inflationary minting capability in smart contracts.
{% endhint %}

## 1. The Counter-Cyclical Deflationary Flywheel

Unlike typical DeFi governance tokens that rely on continuous inflationary emissions to subsidize temporary liquidity, AEGIS implements an anti-dilutive, counter-cyclical economic engine:

```
[Market Volatility Spike]
          │
          ▼
[Hedges Triggered on HyperCore]
          │
          ▼
[Liquidation Loss Averted for Borrower]
          │
          ▼
[10% Performance Fee Captured by AegisFeeCollector.sol]
          │
          ├─────────────────────────────────────────────┐
          ▼ (50%)                                       ▼ (50%)
[Ascend Hook Pool Market Buy & Burn]           [Real USDC Staking Yield]
- Purchased via Ascend AMM                     - Distributed to bonded Sentinels
- Permanently burned to 0x0...dEaD             - Real cash flow; zero token dilution
```

During market crashes—precisely when other protocols suffer insolvency—AEGIS captures maximum performance fee revenue.

---

## 2. Strict 50/50 Fee Conservation (Invariant INV-4)

The protocol fee is strictly capped at **10% of averted liquidation losses**. This fee is programmatically allocated with mathematical symmetry:

$$\text{Fee}_{\text{collected}} = \text{Burn}_{50\%} + \text{Yield}_{50\%}$$

* **50% Buyback-and-Burn:** Programmatically routed to Ascend Closed Hook Pools to purchase $AEGIS tokens from the open market and burn them permanently.
* **50% Sentinel Real Yield:** Distributed in canonical USDC debt tokens directly to bonded node operators based on verified uptime and latency performance.
