# Non-Custodial Session Boundaries

{% hint style="info" %}
Sentinel nodes operate under strict cryptographic boundaries enforced by EIP-712 structured data signing.
{% endhint %}

## 1. Trade-Only Delegation Schema

When a user authorizes automated risk protection, their Web3 wallet signs a structured EIP-712 typed intent:

```javascript
// EIP-712 Typed Data Specification
const domain = {
  name: "AEGIS Protocol",
  version: "1",
  chainId: 99801, // Elysium Orbit L2
  verifyingContract: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
};

const types = {
  TradeIntent: [
    { name: "vault", type: "address" },
    { name: "perpIndex", type: "uint32" },
    { name: "isShort", type: "bool" },
    { name: "size", type: "uint64" },
    { name: "limitPrice", type: "uint64" },
    { name: "nonce", type: "uint64" },
    { name: "expiry", type: "uint64" }
  ]
};
```

---

## 2. Invariant INV-5: Strictly Monotonic Sequential Nonces

To prevent malicious replay attacks, front-running, or out-of-order execution by compromised nodes or MEV searchers, `AegisVault.sol` enforces sequential per-vault nonces:

$$\text{Nonce}_{t+1} = \text{Nonce}_t + 1$$

* Any order intent containing an old, replayed, or out-of-sequence nonce is immediately rejected by the contract.
* Monotonic nonce increments are verified across Foundry fuzz testing suites and Keeper unit test suites.
