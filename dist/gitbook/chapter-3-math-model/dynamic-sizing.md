# Proportional Hedge Sizing (γ)

{% hint style="info" %}
Rather than over-hedging and incurring unnecessary funding rate drag, AEGIS dynamically scales hedge sizing in proportion to market stress.
{% endhint %}

## 1. Optimal Hedge Sizing Formula

When $H \le H_{\text{trigger}}$, the Sentinel engine calculates the target short perpetual contract size $S^*$:

$$S^* = \gamma(H) \cdot \left( \frac{D_{\text{debt}}}{P_{\text{mark}}} \right)$$

Where:
* $\frac{D_{\text{debt}}}{P_{\text{mark}}}$ = Total collateral value required to neutralize 100% of the loan's debt obligation.
* $\gamma(H)$ = Dynamic coverage ratio bounded between $0.0$ and $1.0$.

---

## 2. Dynamic Coverage Function $\gamma(H)$

The coverage function scales dynamically between the trigger threshold $H_{\text{trigger}} = 1.15$ and the critical threshold $H_{\text{critical}} = 1.05$:

$$\gamma(H) = \min\left(1.0, \; \frac{H_{\text{trigger}} - H}{H_{\text{trigger}} - H_{\text{critical}}} \cdot \gamma_{\text{max}}\right)$$

### Numerical Sizing Table

Assuming a $100,000 USDC debt position with collateral price $P_{\text{mark}} = \$25.00$:

| Health Factor ($H$) | Coverage Ratio ($\gamma$) | Target Short Size ($S^*$) | Notional Short Hedge | Operational State |
| :---: | :---: | :---: | :---: | :--- |
| **1.20** | $0.00$ | 0 HYPE | $0 | Normal Market (Unhedged) |
| **1.15** | $0.20$ | 800 HYPE | $20,000 | Trigger Hit (Initial Buffer) |
| **1.10** | $0.60$ | 2,400 HYPE | $60,000 | Accelerated Hedge |
| **1.05** | $1.00$ | 4,000 HYPE | $100,000 | 100% Full Delta Neutral |
| **1.02** | $1.00$ | 4,000 HYPE | $100,000 | Fully Insulated (Max Protection) |
