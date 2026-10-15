# Security Invariants (INV-1 to INV-5)

{% hint style="success" %}
All five protocol invariants have been mathematically formulated, implemented in Solidity, and fuzzed across 160,000+ Foundry runs with zero violations.
{% endhint %}

## 1. Mathematical Invariant Definitions

### Invariant INV-1: Strict Non-Custodial Bounds
**Formal Definition:**

$$\Delta Q_{\text{vault}} = 0 \quad \forall \; \text{delegated session calls}$$

Delegated session keys have zero ability to transfer, withdraw, or encumber collateral. Spot assets can only be withdrawn by the authenticated vault owner.

---

### Invariant INV-2: Monotonic Health Restoration
**Formal Definition:**

$$H_{\text{post-unwind}} > H_{\text{pre-unwind}}$$

Hedges are only unwound when trailing take-profit profits repay borrowed debt, ensuring the vault's solvency metric strictly improves upon execution.

---

### Invariant INV-3: Single-Transaction Emergency Killswitch
**Formal Definition:**

$$K_{\text{session}} \to \emptyset \quad \text{via } \texttt{manualOverride()}$$

Borrowers retain unilateral authority to revoke Sentinel access instantly in a single transaction, leaving collateral untouched.

---

### Invariant INV-4: Strict Fee Conservation
**Formal Definition:**

$$\sum \text{Fee} = \text{Burn}_{50\%} + \text{Yield}_{50\%}$$

Every unit of protocol revenue is split symmetrically between Ascend buyback-and-burn and Sentinel node yield.

---

### Invariant INV-5: Anti-Replay Monotonic Nonces
**Formal Definition:**

$$\text{Nonce}_{t+1} = \text{Nonce}_t + 1$$

Order intents cannot be duplicated, replayed, or front-run across blocks or execution environments.
