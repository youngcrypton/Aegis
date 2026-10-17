# The "Hold the Line" Thesis

{% hint style="success" %}
**Core Protocol Axiom:** Never seize or dump collateral during temporary flash crashes. Neutralize directional downside delta synthetically, and preserve the asset until macro recovery.
{% endhint %}

## 1. The Core Philosophy of AEGIS

AEGIS re-engineers collateral risk from first principles. Rather than assuming that an under-margined borrower must have their collateral liquidated, AEGIS treats liquidation risk as an unhedged directional delta problem:

$$\Delta_{\text{net}} = \frac{\partial V_{\text{portfolio}}}{\partial P_{\text{collateral}}} = Q_{\text{collateral}} > 0$$

Because the borrower is long the underlying asset ($\Delta > 0$), downward price movements compress equity. If the protocol can open an offsetting short perpetual futures position:

$$\Delta_{\text{hedge}} = -S^* < 0$$

$$\Delta_{\text{net}} = Q_{\text{collateral}} - S^* \approx 0$$

The total dollar value of the position becomes immune to further downside depreciation. The borrower is synthetically insulated, and the primary collateral remains completely untouched inside their vault.

---

## 2. Zero-Custody Delegation (Invariant INV-1)

A common flaw in automated hedging vaults is the requirement that users deposit funds into a pooled smart contract where an operator can move or transfer capital. 

AEGIS enforces strict non-custodial boundaries:

```solidity
// Invariant INV-1 Formal Proof: Zero Collateral Transfer Power
function dispatchHedge(
    address userVault,
    uint32 perpIndex,
    uint256 size,
    uint256 limitPrice
) external onlyAuthorizedSentinel {
    // Session key signature validated
    // ONLY trade intent emitted to HyperCore bridge
    // ZERO transfer, transferFrom, or approve bytecode reachable
}
```

* **No Pool Sharing:** Each user's collateral is isolated in their own non-custodial `AegisVault.sol` instance.
* **Trade-Only Scoping:** Delegated Sentinel keys only possess permission to open or close matching short perpetuals on HyperCore. They cannot transfer, withdraw, or encumber underlying assets.
* **Instant Unilateral Killswitch:** Borrowers can revoke Sentinel delegation in a single EVM transaction via `manualOverride()` (Invariant **INV-3**).
