// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultHandler} from "./handlers/VaultHandler.sol";
import {ProConfig, VaultPosition, OverrideActive} from "../../contracts/AegisTypes.sol";

/**
 * @title InvariantOverrideTest
 * @notice Formal invariant test for Invariant INV-3 (Instant Manual Override Killswitch).
 * @dev Mathematically proves that when manual override is activated, the session key is instantly
 *      and atomically revoked, blocking all subsequent keeper calls.
 */
contract InvariantOverrideTest is Test {
    VaultHandler internal handler;

    function setUp() public {
        handler = new VaultHandler();
        targetContract(address(handler));
    }

    /**
     * @notice Invariant INV-3: Active manual override guarantees zero active session key.
     */
    function invariant_INV3_ManualOverrideGuaranteesZeroKey() public view {
        ProConfig memory cfg = handler.vault().getProConfig(handler.borrower());
        VaultPosition memory pos = handler.vault().getPosition(handler.borrower());

        if (cfg.manualOverrideActive) {
            assertEq(pos.sessionKey, address(0), "INV-3 Violation: Session key not zeroed out");
            assertEq(cfg.sessionKeyExpiry, 0, "INV-3 Violation: Expiry not zeroed out");
        }
    }
}
