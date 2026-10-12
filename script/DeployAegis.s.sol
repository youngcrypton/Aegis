// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AegisVault} from "../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../contracts/AegisFeeCollector.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {MockAscendHookPool} from "../test/mocks/MockAscendHookPool.sol";

/**
 * @title DeployAegis
 * @notice Production deployment script for AEGIS Protocol on Elysium L2.
 * @dev Orchestrates deployment and initial linkage of FeeCollector, SentinelRegistry, and AegisVault.
 */
contract DeployAegis is Script {
    function run() external returns (
        AegisFeeCollector feeCollector,
        AegisSentinelRegistry sentinelRegistry,
        AegisVault vault
    ) {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Check environment configuration or deploy devnet mocks
        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        address aegis = vm.envOr("AEGIS_ADDRESS", address(0));
        address ascendPool = vm.envOr("ASCEND_POOL_ADDRESS", address(0));
        address yieldTarget = vm.envOr("YIELD_TARGET_ADDRESS", address(0));

        if (usdc == address(0)) {
            usdc = address(new MockERC20("USD Coin", "USDC", 6));
        }
        if (aegis == address(0)) {
            aegis = address(new MockERC20("AEGIS Token", "AEGIS", 18));
        }
        if (ascendPool == address(0)) {
            ascendPool = address(new MockAscendHookPool());
        }
        if (yieldTarget == address(0)) {
            yieldTarget = deployer;
        }

        // 1. Deploy AegisFeeCollector (50/50 Flywheel engine)
        feeCollector = new AegisFeeCollector(
            usdc,
            aegis,
            ascendPool,
            yieldTarget,
            deployer
        );

        // 2. Deploy AegisSentinelRegistry (25,000 $AEGIS bonding & INV-2 slashing)
        sentinelRegistry = new AegisSentinelRegistry(
            aegis,
            deployer
        );

        // 3. Deploy AegisVault (Core risk engine & TradeIntentExecutor)
        vault = new AegisVault(deployer);

        // 4. Wire Permissions & Cross-Contract Linkage
        vault.setFeeCollector(address(feeCollector));
        feeCollector.setAuthorizedVault(address(vault), true);
        sentinelRegistry.setAuthorizedSlasher(address(vault), true);

        vm.stopBroadcast();

        // 5. Export deployed addresses to deployments.json artifact
        string memory obj = "deployment";
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "usdc", usdc);
        vm.serializeAddress(obj, "aegis", aegis);
        vm.serializeAddress(obj, "ascendPool", ascendPool);
        vm.serializeAddress(obj, "feeCollector", address(feeCollector));
        vm.serializeAddress(obj, "sentinelRegistry", address(sentinelRegistry));
        string memory finalJson = vm.serializeAddress(obj, "aegisVault", address(vault));
        
        try vm.writeJson(finalJson, "./deployments.json") {} catch {
            console2.log("Note: deployments.json write skipped in simulation");
        }

        console2.log("=== AEGIS Protocol Deployment Summary ===");
        console2.log("Deployer:          ", deployer);
        console2.log("USDC:              ", usdc);
        console2.log("AEGIS:             ", aegis);
        console2.log("AscendHookPool:    ", ascendPool);
        console2.log("FeeCollector:      ", address(feeCollector));
        console2.log("SentinelRegistry:  ", address(sentinelRegistry));
        console2.log("AegisVault:        ", address(vault));
    }
}
