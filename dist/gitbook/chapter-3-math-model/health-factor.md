# Health Factor & Position Valuation

{% hint style="info" %}
The Health Factor ($H$) provides a deterministic, real-time measure of vault solvency, calculated continuously by Sentinel daemons.
{% endhint %}

## 1. Formal Definition of Health Factor

The instantaneous solvency of a borrower vault is defined as:

$$H = \frac{V_{\text{collateral}} \cdot L_{\text{threshold}}}{D_{\text{debt}}}$$

Expanded into underlying parameters:

$$H = \frac{Q_{\text{collateral}} \cdot P_{\text{mark}} \cdot L_{\text{threshold}}}{D_{\text{debt}}}$$

Where:
* $Q_{\text{collateral}}$ = Amount of spot collateral deposited in `AegisVault.sol` (scaled to $10^{18}$ for WHYPE).
* $P_{\text{mark}}$ = Instantaneous oracle mark price provided by `RelayedOracleAdapter.sol` (scaled to $10^8$).
* $L_{\text{threshold}}$ = Collateral liquidation threshold configured by the lending venue (e.g., $0.85$ or $85\%$).
* $D_{\text{debt}}$ = Total outstanding borrowed debt denominated in canonical USDC (scaled to $10^6$).

---

## 2. Health Factor State Regimes

AEGIS categorizes position health into four deterministic operational states:

```
[Healthy Zone]        H > 1.25            No hedging action. Regular telemetry monitoring.
[Warning Zone]        1.15 < H <= 1.25    Pre-flight order validation. Sentinel warm-up.
[Hedge Active Zone]   1.05 < H <= 1.15    Autonomous short perpetual hedge dispatched to HyperCore.
[Critical Zone]       H <= 1.05           100% full delta neutralization. Maximum protective hedge.
```

When $H \le H_{\text{trigger}} = 1.15$, the Sentinel engine dispatches a trade intent to neutralize downside risk before the traditional liquidation threshold ($H = 1.00$) can ever be breached.
