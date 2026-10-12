// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {TradeIntentExecutor} from "../../contracts/core/TradeIntentExecutor.sol";
import {
    IntentExpired,
    UnauthorizedSessionKey,
    PredeployWriteFailed
} from "../../contracts/AegisTypes.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";

// Harness exposing internal _verifyAndDispatch function for testing
contract TradeIntentExecutorHarness is TradeIntentExecutor {
    constructor(address _writer) {
        _setHyperCoreWriter(_writer);
    }

    function verifyAndDispatch(
        address vaultOwner,
        address delegatedKey,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        return _verifyAndDispatch(
            vaultOwner,
            delegatedKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );
    }
}

contract TradeIntentExecutorTest is Test {
    TradeIntentExecutorHarness internal executor;
    MockHyperCoreWriter internal mockWriter;

    uint256 internal sessionPrivateKey = 0xA11CE01;
    address internal sessionPublicKey;

    uint256 internal unauthorizedPrivateKey = 0xBAD02;
    address internal unauthorizedPublicKey;

    address internal vaultOwner = address(0xCAFE);

    function setUp() public {
        sessionPublicKey = vm.addr(sessionPrivateKey);
        unauthorizedPublicKey = vm.addr(unauthorizedPrivateKey);

        mockWriter = new MockHyperCoreWriter();
        executor = new TradeIntentExecutorHarness(address(mockWriter));
    }

    function _signIntent(
        uint256 privateKey,
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = executor.hashHedgeIntent(
            vault,
            perpIndex,
            size,
            limitPrice,
            nonce,
            deadline
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_VerifyAndDispatch_Success() public {
        uint32 perpIndex = 0; // HYPE-PERP
        int256 size = -50 ether; // short 50 units
        uint256 limitPrice = 45_00000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 currentNonce = executor.vaultNonces(vaultOwner);

        bytes memory signature = _signIntent(
            sessionPrivateKey,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            currentNonce,
            deadline
        );

        bool success = executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );

        assertTrue(success, "Dispatch must succeed");
        assertEq(executor.vaultNonces(vaultOwner), currentNonce + 1, "Nonce must increment by 1");
        assertEq(mockWriter.getRecordedIntentsCount(), 1, "Intent must be recorded in mock writer");

        MockHyperCoreWriter.OrderIntent memory recorded = mockWriter.getLastIntent();
        assertEq(recorded.vault, vaultOwner);
        assertEq(recorded.perpIndex, perpIndex);
        assertEq(recorded.size, size);
        assertEq(recorded.limitPrice, limitPrice);
    }

    function test_VerifyAndDispatch_IntentExpiredReverts() public {
        uint32 perpIndex = 0;
        int256 size = -10 ether;
        uint256 limitPrice = 40_00000000;
        uint256 expiredDeadline = block.timestamp - 1;

        bytes memory signature = _signIntent(
            sessionPrivateKey,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            0,
            expiredDeadline
        );

        vm.expectRevert(IntentExpired.selector);
        executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            expiredDeadline,
            signature
        );
    }

    function test_VerifyAndDispatch_UnauthorizedSessionKeyReverts() public {
        uint32 perpIndex = 0;
        int256 size = -10 ether;
        uint256 limitPrice = 40_00000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 currentNonce = executor.vaultNonces(vaultOwner);

        // Sign with unauthorized key
        bytes memory signature = _signIntent(
            unauthorizedPrivateKey,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            currentNonce,
            deadline
        );

        // Must revert with UnauthorizedSessionKey
        vm.expectRevert(UnauthorizedSessionKey.selector);
        executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );
    }

    function test_InvariantINV5_MonotonicNoncePreventsReplay() public {
        uint32 perpIndex = 0;
        int256 size = -25 ether;
        uint256 limitPrice = 42_00000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 initialNonce = executor.vaultNonces(vaultOwner);

        bytes memory signature = _signIntent(
            sessionPrivateKey,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            initialNonce,
            deadline
        );

        // First execution succeeds
        executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );

        assertEq(executor.vaultNonces(vaultOwner), initialNonce + 1);

        // Replay attempt with same signature must revert because nonce changed
        vm.expectRevert(UnauthorizedSessionKey.selector);
        executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );
    }

    function test_VerifyAndDispatch_PredeployWriteFailedReverts() public {
        uint32 perpIndex = 0;
        int256 size = -10 ether;
        uint256 limitPrice = 40_00000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 currentNonce = executor.vaultNonces(vaultOwner);

        mockWriter.setShouldFail(true);

        bytes memory signature = _signIntent(
            sessionPrivateKey,
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            currentNonce,
            deadline
        );

        vm.expectRevert(PredeployWriteFailed.selector);
        executor.verifyAndDispatch(
            vaultOwner,
            sessionPublicKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );
    }
}
