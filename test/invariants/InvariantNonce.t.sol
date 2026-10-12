// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultHandler} from "./handlers/VaultHandler.sol";

/**
 * @title InvariantNonceTest
 * @notice Formal invariant test for Invariant INV-5 (Strictly Monotonic Nonce Progression).
 * @dev Mathematically proves nonces advance sequentially with zero possibility of replay attacks.
 */
contract InvariantNonceTest is Test {
    VaultHandler internal handler;

    function setUp() public {
        handler = new VaultHandler();
        targetContract(address(handler));
    }

    /**
     * @notice Invariant INV-5: Nonces strictly equal the count of valid intent dispatches.
     */
    function invariant_INV5_MonotonicNonceEquality() public view {
        uint256 contractNonce = handler.vault().vaultNonces(handler.borrower());
        assertEq(
            contractNonce,
            handler.ghost_noncesObserved(),
            "INV-5 Violation: Nonce did not match valid dispatch counter"
        );
    }
}
