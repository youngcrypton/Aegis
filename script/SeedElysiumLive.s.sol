// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {AegisVault} from "../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../contracts/AegisFeeCollector.sol";
import {
    TriggerMode,
    OrderType,
    VaultState,
    ProConfig
} from "../contracts/AegisTypes.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/**
 * @title SeedElysiumLive
 * @notice Complete on-chain seeding script for AEGIS protocol on Elysium L2.
 */
contract SeedElysiumLive is Script {
    using stdJson for string;

    function run() external {
        string memory json = vm.readFile("./deployments.json");
        address aegisAddr = json.readAddress(".aegis");
        address vaultAddr = json.readAddress(".aegisVault");
        address sentinelRegistryAddr = json.readAddress(".sentinelRegistry");
        address usdcAddr = json.readAddress(".usdc");

        // HYPE token deployed on Elysium testnet
        address hypeAddr = 0xcA03Dc4665A8C3603cb4Fd5Ce71Af9649dC00d44;

        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d)
        );
        address deployer = vm.addr(deployerPrivateKey);

        // Demo Trader is account with private key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
        uint256 traderPrivateKey = vm.envOr(
            "TRADER_PRIVATE_KEY",
            uint256(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a)
        );
        address trader = vm.addr(traderPrivateKey);

        // Trade-only session key
        address sessionKey = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

        MockERC20 hype = MockERC20(hypeAddr);
        MockERC20 usdc = MockERC20(usdcAddr);
        AegisVault vault = AegisVault(vaultAddr);

        // 1. Deployer mints collateral & test debt to trader
        vm.startBroadcast(deployerPrivateKey);
        hype.mint(trader, 10_000 ether);
        usdc.mint(trader, 100_000 * 1e6);
        vm.stopBroadcast();

        // 2. Trader opens Position, configures ProConfig, and delegates session key
        vm.startBroadcast(traderPrivateKey);

        // Register Position (1,000 HYPE collateral, $32,000 USDC debt, 80% LTV)
        vault.registerPosition(hypeAddr, 1_000 ether, 32_000 * 1e6, 8000);

        // Configure ProConfig
        ProConfig memory config = ProConfig({
            triggerMode: uint8(TriggerMode.HYBRID),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 5000,               // 50% hedge ratio
            trailingTakeProfitBps: 150,        // 1.5% trailing take-profit
            maxSlippageBps: 50,                // 0.5% max slippage
            sessionKeyExpiry: uint32(block.timestamp + 30 days),
            manualOverrideActive: false,
            priceTrigger: 44_20000000,         // $44.20 (1e8)
            healthFactorTrigger: 11000         // H = 1.10 (1e4)
        });
        vault.setProConfig(config);

        // Delegate Trade-Only Session Key
        vault.delegateSessionKey(sessionKey, uint32(block.timestamp + 30 days));

        vm.stopBroadcast();

        // 3. Export updated deployments
        string memory obj = "deployment";
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "usdc", usdcAddr);
        vm.serializeAddress(obj, "aegis", aegisAddr);
        vm.serializeAddress(obj, "hype", hypeAddr);
        vm.serializeAddress(obj, "feeCollector", address(vault.feeCollector()));
        vm.serializeAddress(obj, "sentinelRegistry", sentinelRegistryAddr);
        vm.serializeAddress(obj, "trader", trader);
        vm.serializeAddress(obj, "sessionKey", sessionKey);
        string memory finalJson = vm.serializeAddress(obj, "aegisVault", vaultAddr);
        
        try vm.writeJson(finalJson, "./deployments.json") {} catch {
            console2.log("Note: deployments.json write skipped");
        }

        console2.log("=== AEGIS Elysium Testnet Seeding Complete ===");
        console2.log("HYPE Token:        ", hypeAddr);
        console2.log("Trader Account:    ", trader);
        console2.log("Trader Position:   1,000 HYPE / $32,000 USDC Debt in", vaultAddr);
        console2.log("Session Key:       ", sessionKey);
        console2.log("Sentinel Operator: ", deployer);
    }
}
