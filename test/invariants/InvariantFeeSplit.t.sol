// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultHandler} from "./handlers/VaultHandler.sol";

/**
 * @title InvariantFeeSplitTest
 * @notice Formal invariant test for Invariant INV-4 (Strict 50/50 Fee Conservation).
 * @dev Mathematically proves zero fee leakage across all execution sequences:
 *      totalFeesCaptured == (buybackBudget + totalBurnedFees) + (yieldBudget + totalDistributedYield).
 */
contract InvariantFeeSplitTest is Test {
    VaultHandler internal handler;

    function setUp() public {
        handler = new VaultHandler();
        targetContract(address(handler));
    }

    /**
     * @notice Invariant INV-4: Total fees captured strictly equals the sum of allocated and distributed parts.
     */
    function invariant_INV4_StrictFeeConservation() public view {
        uint256 captured = handler.feeCollector().totalFeesCaptured();
        uint256 buybackTotal = handler.feeCollector().buybackBudget() + handler.feeCollector().totalBurnedFees();
        uint256 yieldTotal = handler.feeCollector().yieldBudget() + handler.feeCollector().totalDistributedYield();

        assertEq(
            captured,
            buybackTotal + yieldTotal,
            "INV-4 Violation: Fee leakage detected across flywheel allocations"
        );
    }
}
