// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RelayedOracleAdapter} from "../../contracts/adapters/RelayedOracleAdapter.sol";
import {AgentDispatchAdapter} from "../../contracts/adapters/AgentDispatchAdapter.sol";
import {HyperCorePrecompileAdapter} from "../../contracts/adapters/HyperCorePrecompileAdapter.sol";
import {PredeployCoreWriterAdapter} from "../../contracts/adapters/PredeployCoreWriterAdapter.sol";
import {AegisVault} from "../../contracts/AegisVault.sol";
import {IHyperCoreOracle} from "../../contracts/interfaces/IHyperCoreOracle.sol";
import {MockHyperCorePrecompile} from "../mocks/MockHyperCorePrecompile.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {
    ZeroAddress,
    InvalidPrice,
    PriceStale,
    PrecompileReadFailed,
    UnauthorizedCaller
} from "../../contracts/AegisTypes.sol";

contract ModularAdaptersTest is Test {
    RelayedOracleAdapter internal relayedOracle;
    AgentDispatchAdapter internal agentWriter;
    HyperCorePrecompileAdapter internal precompileOracle;
    PredeployCoreWriterAdapter internal predeployWriter;
    AegisVault internal vault;

    MockHyperCorePrecompile internal mockPrecompile;
    MockHyperCoreWriter internal mockPredeploy;
    MockERC20 internal mockCollateral;

    address internal owner = address(0xAA1);
    address internal sentinel = address(0x5E4);
    address internal bob = address(0xBB1);

    address internal constant PRECOMPILE_0x0801 = address(0x0801);
    address internal constant PREDEPLOY_0x0802 = address(0x0802);

    function setUp() public {
        vm.startPrank(owner);

        relayedOracle = new RelayedOracleAdapter(owner, 60); // 60s staleness window
        relayedOracle.setReporter(sentinel, true);

        agentWriter = new AgentDispatchAdapter(owner);
        precompileOracle = new HyperCorePrecompileAdapter();
        predeployWriter = new PredeployCoreWriterAdapter();

        vault = new AegisVault(owner);
        agentWriter.setAuthorizedCaller(address(vault), true);

        vm.stopPrank();

        mockPrecompile = new MockHyperCorePrecompile();
        mockPredeploy = new MockHyperCoreWriter();

        vm.etch(PRECOMPILE_0x0801, address(mockPrecompile).code);
        vm.etch(PREDEPLOY_0x0802, address(mockPredeploy).code);

        mockCollateral = new MockERC20("Collateral", "COL", 18);
    }

    // --- RelayedOracleAdapter Tests ---

    function test_RelayedOracle_UpdateAndRead() public {
        uint32 perpIndex = 0; // HYPE-PERP
        uint256 expectedPrice = 85_50000000; // $85.50

        vm.prank(sentinel);
        relayedOracle.updatePrice(perpIndex, expectedPrice);

        uint256 readPrice = relayedOracle.getPerpPrice(perpIndex);
        assertEq(readPrice, expectedPrice);

        (uint256 p, uint256 t) = relayedOracle.getPerpPriceWithTimestamp(perpIndex);
        assertEq(p, expectedPrice);
        assertEq(t, block.timestamp);
    }

    function test_RelayedOracle_BatchUpdate() public {
        uint32[] memory indices = new uint32[](2);
        indices[0] = 0; // HYPE
        indices[1] = 1; // PURR

        uint256[] memory prices = new uint256[](2);
        prices[0] = 85_00000000;
        prices[1] = 18500000;

        vm.prank(sentinel);
        relayedOracle.updatePrices(indices, prices);

        assertEq(relayedOracle.getPerpPrice(0), 85_00000000);
        assertEq(relayedOracle.getPerpPrice(1), 18500000);
    }

    function test_RelayedOracle_StalenessRevert() public {
        uint32 perpIndex = 0;
        uint256 price = 80_00000000;

        vm.prank(sentinel);
        relayedOracle.updatePrice(perpIndex, price);

        // Advance block timestamp beyond 60s maxStaleness
        vm.warp(block.timestamp + 61);

        vm.expectRevert(abi.encodeWithSelector(PriceStale.selector, perpIndex, block.timestamp - 61, block.timestamp));
        relayedOracle.getPerpPrice(perpIndex);
    }

    function test_RelayedOracle_UnauthorizedReporterRevert() public {
        vm.prank(bob);
        vm.expectRevert(RelayedOracleAdapter.UnauthorizedReporter.selector);
        relayedOracle.updatePrice(0, 100_00000000);
    }

    function test_RelayedOracle_InvalidPriceZeroRevert() public {
        vm.prank(sentinel);
        vm.expectRevert(InvalidPrice.selector);
        relayedOracle.updatePrice(0, 0);
    }

    // --- AgentDispatchAdapter Tests ---

    function test_AgentDispatch_PlaceAndCancelIntent() public {
        vm.startPrank(owner);
        agentWriter.setAuthorizedCaller(bob, true);
        vm.stopPrank();

        vm.prank(bob);
        bool success = agentWriter.placeHedgeIntent(bob, 0, -10 ether, 80_00000000);
        assertTrue(success, "Agent place intent must succeed");

        vm.prank(bob);
        bool cancelSuccess = agentWriter.cancelHedgeIntent(bob, 0);
        assertTrue(cancelSuccess, "Agent cancel intent must succeed");
    }

    function test_AgentDispatch_UnauthorizedCallerRevert() public {
        vm.prank(bob);
        vm.expectRevert(UnauthorizedCaller.selector);
        agentWriter.placeHedgeIntent(bob, 0, -10 ether, 80_00000000);
    }

    // --- HyperCorePrecompileAdapter Tests ---

    function test_PrecompileAdapter_ReadSuccess() public {
        uint32 perpIndex = 0;
        uint256 expectedPrice = 42_00000000;

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(perpIndex, expectedPrice);

        uint256 price = precompileOracle.getPerpPrice(perpIndex);
        assertEq(price, expectedPrice);
    }

    function test_PrecompileAdapter_RevertOnFailure() public {
        uint32 perpIndex = 0;
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setShouldRevert(true);

        vm.expectRevert(abi.encodeWithSelector(PrecompileReadFailed.selector, perpIndex));
        precompileOracle.getPerpPrice(perpIndex);
    }

    // --- AegisVault Modular Integration Tests ---

    function test_Vault_SwitchToRelayedOracle() public {
        uint32 perpIndex = 0;
        uint256 relayedPrice = 95_00000000;

        // 1. Update relayed oracle
        vm.prank(sentinel);
        relayedOracle.updatePrice(perpIndex, relayedPrice);

        // 2. Set vault oracleAdapter
        vm.prank(owner);
        vault.setOracleAdapter(address(relayedOracle));
        assertEq(address(vault.oracleAdapter()), address(relayedOracle));

        // 3. Register position on vault
        vm.startPrank(bob);
        mockCollateral.mint(bob, 1 ether);
        vault.registerPosition(address(mockCollateral), 1 ether, 50_000000, 8000); // $50 debt, 80% threshold

        (uint256 hf, bool triggered, uint256 markPrice) = vault.getVaultHealth(bob, perpIndex);
        assertEq(markPrice, relayedPrice, "Mark price should come from RelayedOracleAdapter");
        assertFalse(triggered);
        vm.stopPrank();
    }

    function test_Vault_SwitchToAgentWriter() public {
        vm.prank(owner);
        vault.setHyperCoreWriter(address(agentWriter));
        assertEq(vault.hyperCoreWriter(), address(agentWriter));
    }

    function test_Vault_OnlyOwnerCanSetAdapters() public {
        vm.prank(bob);
        vm.expectRevert();
        vault.setOracleAdapter(address(relayedOracle));

        vm.prank(bob);
        vm.expectRevert();
        vault.setHyperCoreWriter(address(agentWriter));
    }
}
