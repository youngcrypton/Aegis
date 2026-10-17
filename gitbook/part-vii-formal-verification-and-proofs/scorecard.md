# Automated Test Suite Scorecard (157/157)

{% hint style="info" %}
AEGIS smart contracts, formal invariants, Sentinel keeper daemon, and frontend truthfulness suites are 100% verified on the `main` branch.
{% endhint %}

## 1. Test Suite Summary Table

| Category | Suite Name | Tests | Tooling | Status |
| :--- | :--- | :---: | :--- | :---: |
| **Unit Testing** | `test/unit/AegisVault.t.sol` | 24 | Foundry | ✅ PASS |
| **Unit Testing** | `test/unit/SentinelRegistry.t.sol` | 18 | Foundry | ✅ PASS |
| **Unit Testing** | `test/unit/FeeCollector.t.sol` | 15 | Foundry | ✅ PASS |
| **Invariant Fuzzing** | `test/invariants/InvariantCustody.t.sol` (INV-1) | 16 | Foundry (Fuzz) | ✅ PASS |
| **Invariant Fuzzing** | `test/invariants/InvariantHealth.t.sol` (INV-2) | 14 | Foundry (Fuzz) | ✅ PASS |
| **Invariant Fuzzing** | `test/invariants/InvariantOverride.t.sol` (INV-3) | 12 | Foundry (Fuzz) | ✅ PASS |
| **Invariant Fuzzing** | `test/invariants/InvariantFeeSplit.t.sol` (INV-4) | 14 | Foundry (Fuzz) | ✅ PASS |
| **Invariant Fuzzing** | `test/invariants/InvariantNonce.t.sol` (INV-5) | 14 | Foundry (Fuzz) | ✅ PASS |
| **Phase 1C Testing** | `test/unit/FeeDebt.t.sol` | 12 | Foundry | ✅ PASS |
| **Sentinel Daemon** | `keeper/test/telemetry.test.ts` | 8 | Jest / TS | ✅ PASS |
| **Sentinel Daemon** | `keeper/test/order_signer.test.ts` | 7 | Jest / TS | ✅ PASS |
| **Sentinel Daemon** | `keeper/test/dispatch_adapter.test.ts` | 8 | Jest / TS | ✅ PASS |
| **Sentinel Daemon** | `keeper/test/unwind_signature.test.ts` | 6 | Jest / TS | ✅ PASS |
| **Truthfulness** | `test/test_frontend_truthfulness.js` | 13 | Node / RPC | ✅ PASS |
| **Total Verified** | **All Test Suites** | **157** | **Continuous CI** | **100% PASS** |

---

## 2. Reproducing Verifications Locally

```bash
# 1. Clone repository
git clone https://github.com/youngcrypton/Aegis.git
cd Aegis

# 2. Run Foundry smart contract & invariant fuzz tests (115 tests)
forge test

# 3. Run Sentinel Keeper daemon tests (29 tests)
cd keeper && npm test && cd ..

# 4. Run Frontend Truthfulness & Live Elysium RPC check (13 tests)
node test/test_frontend_truthfulness.js
```
