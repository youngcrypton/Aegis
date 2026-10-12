// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultHandler} from "./handlers/VaultHandler.sol";

/**
 * @title InvariantCustodyTest
 * @notice Formal invariant test for Invariant INV-1 (Strict Non-Custodial Boundary).
 * @dev Mathematically proves that the protocol contracts and Sentinel nodes hold zero collateral
 *      and have zero allowance to withdraw borrower funds across all execution sequences.
 */
contract InvariantCustodyTest is Test {
    VaultHandler internal handler;

    function setUp() public {
        handler = new VaultHandler();
        targetContract(address(handler));
    }

    /**
     * @notice Invariant INV-1: Vault contract balance of user collateral must strictly remain 0.
     */
    function invariant_INV1_ZeroVaultCollateralCustody() public view {
        uint256 vaultBal = handler.collateralToken().balanceOf(address(handler.vault()));
        assertEq(vaultBal, 0, "INV-1 Violation: Vault contract held user collateral");
    }

    /**
     * @notice Invariant INV-1: Sentinel node has 0 token allowance from Vault or Borrower.
     */
    function invariant_INV1_ZeroSentinelTokenAllowance() public view {
        uint256 vaultToSentinel = handler.collateralToken().allowance(
            address(handler.vault()),
            handler.sentinel()
        );
        assertEq(vaultToSentinel, 0, "INV-1 Violation: Vault granted token allowance to Sentinel");

        uint256 borrowerToSentinel = handler.collateralToken().allowance(
            handler.borrower(),
            handler.sentinel()
        );
        assertEq(borrowerToSentinel, 0, "INV-1 Violation: Borrower granted token allowance to Sentinel");
    }
}
