// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {HyperCoreOracleAdapter} from "../../contracts/adapters/HyperCoreOracleAdapter.sol";
import {PrecompileReadFailed} from "../../contracts/AegisTypes.sol";
import {MockHyperCorePrecompile} from "../mocks/MockHyperCorePrecompile.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

// Harness contract to test HyperCoreOracleAdapter internal library functions
contract HyperCoreOracleHarness {
    function getPerpPrice(uint32 perpIndex) external view returns (uint256) {
        return HyperCoreOracleAdapter.getPerpPrice(perpIndex);
    }
}

contract HyperCoreAdaptersTest is Test {
    HyperCoreOracleHarness internal oracleHarness;
    MockHyperCorePrecompile internal mockPrecompile;
    MockHyperCoreWriter internal mockWriter;
    MockERC20 internal usdc;
    MockERC20 internal hype;
    MockERC20 internal aegis;

    address internal constant PRECOMPILE_0x0801 = address(0x0801);
    address internal constant ALICE = address(0xA11CE);

    function setUp() public {
        oracleHarness = new HyperCoreOracleHarness();
        mockPrecompile = new MockHyperCorePrecompile();
        mockWriter = new MockHyperCoreWriter();

        // Etch the mock precompile to address 0x0801 so staticcall reaches it
        vm.etch(PRECOMPILE_0x0801, address(mockPrecompile).code);

        // Deploy mock tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        hype = new MockERC20("Hyperliquid", "HYPE", 18);
        aegis = new MockERC20("Aegis Protocol", "AEGIS", 18);
    }

    function test_OracleAdapter_GetPerpPrice() public {
        uint32 perpIndex = 0; // HYPE-PERP
        uint256 expectedPrice = 42_50000000; // $42.50 scaled 1e8

        // Call setMockPrice directly on the etched address 0x0801
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(perpIndex, expectedPrice);

        uint256 fetchedPrice = oracleHarness.getPerpPrice(perpIndex);
        assertEq(fetchedPrice, expectedPrice, "Fetched price must match mock price");
    }

    function test_OracleAdapter_RevertOnFailure() public {
        uint32 perpIndex = 1;
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setShouldRevert(true);

        vm.expectRevert(abi.encodeWithSelector(PrecompileReadFailed.selector, perpIndex));
        oracleHarness.getPerpPrice(perpIndex);
    }

    function test_OracleAdapter_RevertOnShortData() public {
        uint32 perpIndex = 2;
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setReturnShortData(true);

        vm.expectRevert(abi.encodeWithSelector(PrecompileReadFailed.selector, perpIndex));
        oracleHarness.getPerpPrice(perpIndex);
    }

    function test_Writer_PlaceHedgeIntent() public {
        address vault = ALICE;
        uint32 perpIndex = 0;
        int256 size = -100 ether; // short 100 base tokens
        uint256 limitPrice = 40_00000000;

        bool success = mockWriter.placeHedgeIntent(vault, perpIndex, size, limitPrice);
        assertTrue(success, "Place intent must succeed");
        assertEq(mockWriter.getRecordedIntentsCount(), 1, "Intent count should be 1");

        MockHyperCoreWriter.OrderIntent memory intent = mockWriter.getLastIntent();
        assertEq(intent.vault, vault);
        assertEq(intent.perpIndex, perpIndex);
        assertEq(intent.size, size);
        assertEq(intent.limitPrice, limitPrice);
    }

    function test_Writer_CancelHedgeIntent() public {
        address vault = ALICE;
        uint32 perpIndex = 0;

        bool success = mockWriter.cancelHedgeIntent(vault, perpIndex);
        assertTrue(success, "Cancel intent must succeed");
        assertTrue(mockWriter.cancelledIntents(vault, perpIndex), "Should be marked cancelled");
    }

    function test_MockERC20_DecimalsAndMintBurn() public {
        assertEq(usdc.decimals(), 6, "USDC must have 6 decimals");
        assertEq(hype.decimals(), 18, "HYPE must have 18 decimals");
        assertEq(aegis.decimals(), 18, "AEGIS must have 18 decimals");

        usdc.mint(ALICE, 1_000_000 * 1e6); // 1,000,000 USDC
        assertEq(usdc.balanceOf(ALICE), 1_000_000 * 1e6);

        usdc.burn(ALICE, 500_000 * 1e6);
        assertEq(usdc.balanceOf(ALICE), 500_000 * 1e6);
    }
}
