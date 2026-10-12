// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultHandler} from "./handlers/VaultHandler.sol";
import {SentinelNode} from "../../contracts/AegisTypes.sol";

/**
 * @title InvariantSlashingTest
 * @notice Formal invariant test for Invariant INV-2 (Bounded Slashing & Restitution).
 * @dev Mathematically proves that slashing penalties never exceed 10% (1000 bps),
 *      and nodes falling below 25,000 $AEGIS are unconditionally deactivated.
 */
contract InvariantSlashingTest is Test {
    VaultHandler internal handler;

    function setUp() public {
        handler = new VaultHandler();
        targetContract(address(handler));
    }

    /**
     * @notice Invariant INV-2: Observed slash basis points must never exceed 1000 (10%).
     */
    function invariant_INV2_SlashingNeverExceedsTenPercent() public view {
        assertLe(
            handler.ghost_maxSlashBpsObserved(),
            1000,
            "INV-2 Violation: Slashing exceeded 1,000 bps (10%)"
        );
    }

    /**
     * @notice Invariant INV-2: If bonded amount drops below 25,000 tokens, node must be deactivated.
     */
    function invariant_INV2_SubMinimumBondDeactivatesNode() public view {
        SentinelNode memory node = handler.registry().getSentinel(handler.sentinel());
        if (node.bondedAmount < 25_000 ether) {
            assertFalse(
                node.isActive,
                "INV-2 Violation: Sentinel node remained active with bond < 25,000 tokens"
            );
        }
    }
}
