# Node Staking & Slashing Guardrails

{% hint style="info" %}
Sentinel node operators guarantee high-uptime execution by bonding capital that is subject to deterministic programmatic slashing upon SLA failure.
{% endhint %}

## 1. Node Bonding Requirements

To qualify as an active Sentinel node operator authorized to submit order intents on behalf of delegated vaults, operators must deposit an economic stake into `AegisSentinelRegistry.sol`:

* **Minimum Staking Bond:** `25,000 $AEGIS` tokens.
* **Bond Token:** Native $AEGIS token on Elysium L2.
* **Unbonding Delay:** Mandatory `7-day cooldown period` before staked capital can be withdrawn, preventing flash-unstaking during active market turmoil.

---

## 2. Slashing Guardrails & Penalty Matrix

Sentinel actions are bounded by strict economic penalties:

| Violation Event | Slashing Rate | Enforcement Mechanism | Beneficiary |
| :--- | :---: | :--- | :--- |
| **SLA Latency Breach (>500ms)** | Up to 10% (1,000 bps) | Automated timeout verification | 50% Burn / 50% Stakers |
| **Unauthorized Signature Submission** | 10% (1,000 bps) | Cryptographic signature mismatch | Affected User Indemnity |
| **Slippage Breach (>maxSlippageBps)** | 10% (1,000 bps) | On-chain execution price check | Affected User Indemnity |
| **Downtime During Volatility** | 5% (500 bps) | Missed batch telemetry heartbeats | Protocol Insurance Reserve |

### 10% Hard Slashing Cap
To prevent malicious governance attacks or oracle glitches from wiping out node operators entirely, the smart contract strictly caps slashing at **10% per penalization event**.
