# Phase 1C Deferred Fee Debt Engine

{% hint style="important" %}
**Zero-Revert Unwind Guarantee:** In high-stress liquidation scenarios, the protocol guarantees that emergency position unwinds will **never revert** due to borrower liquidity deficits.
{% endhint %}

## 1. The Liquidity Impasse Problem

During high-volatility market crashes, a borrower's liquid stablecoin wallet balance may be zero. If a protocol requires an immediate upfront fee transfer during an emergency hedge unwind, the transaction reverts with `InsufficientBalance`. 

In existing DeFi systems, this bug leaves the hedge unclosed, the user exposed to subsequent liquidation, and the protocol insolvent.

---

## 2. The Phase 1C Deferred Fee Debt State Machine

AEGIS prevents this impasse via **Phase 1C Deferred Fee Debt Accounting**:

```solidity
// Excerpt from contracts/AegisVault.sol
function _settleFee(address user, uint256 protocolFee) internal {
    if (protocolFee == 0) return;

    // Attempt direct liquid fee collection
    bool collected = feeCollector.collectFee(user, protocolFee);

    if (!collected) {
        // Record deferred fee debt without reverting
        feeDebts[user] += protocolFee;
        emit FeeDebtRecorded(user, protocolFee);
    }
}
```

### Key Operational Guarantees:
1. **Unconditional Execution:** The unwind transaction completes successfully, paying down debt and insulating the borrower from liquidation auctions.
2. **Deterministic Tracking:** The uncollected fee is recorded in on-chain state: `feeDebts[user]`.
3. **Repayment Mechanisms:**
   * **Voluntary:** The user can call `repayFeeDebt(uint256 amount)` at any time when liquid funds are available.
   * **Collateral Withdrawal Gate:** When the borrower eventually withdraws collateral, outstanding `feeDebts[user]` is settled before surplus assets are released.
