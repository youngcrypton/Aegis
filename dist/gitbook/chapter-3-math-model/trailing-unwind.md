# Trailing Take-Profit Unwinds (τ)

{% hint style="success" %}
**Invariant INV-2 Guarantee:** Hedges are only unwound when cash profits strictly improve the borrower's Health Factor ($H_{\text{post}} > H_{\text{pre}}$).
{% endhint %}

## 1. The Trailing Take-Profit Logic

When the short perpetual hedge is active on HyperCore, downward price action generates cash profits denominated in USDC. The Sentinel engine continually records the lowest mark price observed during the drawdown:

$$P_{\text{min}} = \min_{t \in [t_{\text{hedge}}, t_{\text{now}}]} P(t)$$

As the market begins to recover from the trough, the Sentinel engine monitors for a confirmed reversal exceeding the **trailing take-profit offset ($\tau$)**:

$$P_{\text{rebound}} \ge P_{\text{min}} \cdot (1 + \tau)$$

Where $\tau$ is typically configured between $1.0\%$ and $2.5\%$ (default $1.5\%$).

---

## 2. Cash Profit Settlement & Debt Paydown

Upon crossing the threshold:
1. **Closing Order Dispatched:** The Sentinel sends an order intent via `AgentDispatchAdapter.sol` to close the short perpetual on HyperCore.
2. **Gross Profit Realization:** The accumulated price difference yields gross cash profit:
   $$\Pi_{\text{gross}} = S^* \cdot (P_{\text{entry}} - P_{\text{exit}})$$
3. **Debt Repayment:** After deduction of protocol performance fees, net proceeds $\Pi_{\text{net}}$ are routed into the vault to pay down outstanding borrowed USDC debt:
   $$D_{\text{post}} = D_{\text{pre}} - \Pi_{\text{net}}$$
4. **Monotonic Health Restoration:** Because $D_{\text{post}} < D_{\text{pre}}$ while spot collateral $Q_{\text{collateral}}$ remains identical, the vault's Health Factor is strictly restored:
   $$H_{\text{post}} = \frac{Q_{\text{collateral}} \cdot P_{\text{exit}} \cdot L_{\text{threshold}}}{D_{\text{post}}} > H_{\text{pre}}$$
