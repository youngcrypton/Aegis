// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {DeployTestnetModular} from "../../script/DeployTestnetModular.s.sol";
import {RelayedOracleAdapter} from "../../contracts/adapters/RelayedOracleAdapter.sol";
import {AgentDispatchAdapter} from "../../contracts/adapters/AgentDispatchAdapter.sol";
import {AegisFeeCollector} from "../../contracts/AegisFeeCollector.sol";
import {AegisSentinelRegistry} from "../../contracts/AegisSentinelRegistry.sol";
import {AegisVault} from "../../contracts/AegisVault.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {
    TriggerMode,
    OrderType,
    ProConfig,
    VaultPosition
} from "../../contracts/AegisTypes.sol";

contract TestnetDeploymentVerificationTest is Test {
    DeployTestnetModular internal deployScript;
    RelayedOracleAdapter internal oracle;
    AgentDispatchAdapter internal writer;
    AegisFeeCollector internal feeCollector;
    AegisSentinelRegistry internal registry;
    AegisVault internal vault;

    address internal deployer;
    address internal alice = address(0xA11CE);
    uint256 internal aliceSessionKeyPk = 0x5E55A1;
    address internal aliceSessionKey;

    MockERC20 internal mockCollateral;

    function setUp() public {
        deployScript = new DeployTestnetModular();
        deployer = vm.addr(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
        aliceSessionKey = vm.addr(aliceSessionKeyPk);

        (oracle, writer, feeCollector, registry, vault) = deployScript.run();

        mockCollateral = new MockERC20("Collateral HYPE", "cHYPE", 18);
        mockCollateral.mint(alice, 100 ether);
    }

    function test_DeployTestnet_ModularAdaptersProperlyWired() public view {
        assertEq(address(vault.oracleAdapter()), address(oracle), "Oracle adapter mismatch");
        assertEq(vault.hyperCoreWriter(), address(writer), "HyperCore writer mismatch");
        assertEq(vault.feeCollector(), address(feeCollector), "Fee collector mismatch");
        assertTrue(writer.authorizedCallers(address(vault)), "Vault should be authorized on writer");
        assertTrue(feeCollector.authorizedVaults(address(vault)), "Vault should be authorized on fee collector");
    }

    function test_DeployTestnet_CanonicalUsdcConfigured() public view {
        assertEq(address(feeCollector.usdcToken()), deployScript.CANONICAL_TESTNET_USDC());
    }

    function test_DeployTestnet_FeeDebtsCallableWithoutRevert() public view {
        // Line 108 Blocker verification: feeDebts(address) must return uint256 (0) and NOT revert
        uint256 initialDebt = vault.feeDebts(alice);
        assertEq(initialDebt, 0, "Initial fee debt should be 0");
    }

    function test_DeployTestnet_OracleDoesNotRevertOn0x0801() public {
        // Line 106 Blocker verification: getVaultHealth uses RelayedOracleAdapter, bypassing 0x0801
        vm.startPrank(alice);
        vault.registerPosition(address(mockCollateral), 10 ether, 500_000000, 8000); // 10 HYPE, $500 debt, 80% LTV

        (uint256 hf, bool triggered, uint256 markPrice) = vault.getVaultHealth(alice, 0);
        assertEq(markPrice, 82_50000000, "Price should match seeded HYPE price $82.50");
        assertFalse(triggered, "HF should be healthy ($825 collat vs $500 debt)");
        assertGt(hf, 10000, "Health factor should be > 1.0");
        vm.stopPrank();
    }

    function test_DeployTestnet_AgentDispatchSucceedsWithout0x0802() public {
        // Line 107 Blocker verification: executeHedgeIntent dispatches to AgentDispatchAdapter without 0x0802
        vm.startPrank(alice);
        vault.registerPosition(address(mockCollateral), 10 ether, 500_000000, 8000);

        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 500,
            maxSlippageBps: 100,
            sessionKeyExpiry: uint48(block.timestamp + 1 days),
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));

        vault.delegateSessionKey(aliceSessionKey, uint48(block.timestamp + 1 days));
        vm.stopPrank();

        // Simulate market drop: HYPE drops to $55.00
        vm.prank(deployer);
        oracle.updatePrice(0, 55_00000000);

        (uint256 hf, bool triggered, uint256 markPrice) = vault.getVaultHealth(alice, 0);
        assertTrue(triggered, "Position should be triggered for hedging");
        assertEq(markPrice, 55_00000000);

        // Sign HedgeIntent via aliceSessionKey
        uint256 currentNonce = vault.vaultNonces(alice);
        uint256 deadline = block.timestamp + 1 hours;
        int256 hedgeSize = -10 ether;
        uint256 limitPrice = 54_00000000;

        bytes32 digest = vault.hashHedgeIntent(alice, 0, hedgeSize, limitPrice, currentNonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceSessionKeyPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Execute hedge intent — must succeed via AgentDispatchAdapter without revert
        vm.prank(deployer);
        vault.executeHedgeIntent(alice, 0, hedgeSize, limitPrice, deadline, sig);

        assertEq(vault.vaultNonces(alice), currentNonce + 1, "Nonce must increment (INV-5)");
        (
            bool isOpen,
            uint32 perpMarketIndex,
            uint256 size,
            uint256 entryPrice,
            uint256 lowestWickPrice,
            uint256 trailingExitPrice
        ) = vault.activeHedges(alice);
        assertTrue(isOpen, "Active hedge must be recorded");
        assertEq(perpMarketIndex, 0);
        assertEq(size, 10 ether);
        assertEq(entryPrice, 55_00000000);
    }
}
