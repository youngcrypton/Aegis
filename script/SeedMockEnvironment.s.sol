// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
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
import {MockAscendHookPool} from "../test/mocks/MockAscendHookPool.sol";

/**
 * @title SeedMockEnvironment
 * @notice Seeding script for local testnet / devnet simulations.
 * @dev Mints mock collateral/debt/bonds, stakes Sentinel operator, opens borrower vault,
 *      configures ProConfig, and delegates a trade-only session key.
 */
contract SeedMockEnvironment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        require(deployerPrivateKey != 0, "SeedMockEnvironment: DEPLOYER_PRIVATE_KEY required");
        address deployer = vm.addr(deployerPrivateKey);

        // Standard demo wallets
        address demoUser = vm.envOr(
            "DEMO_USER_ADDRESS",
            address(0x71C85a3F9a489f31B54aA89e62Ce378901B2A89F)
        );
        address sentinelOperator = vm.envOr(
            "SENTINEL_OPERATOR_ADDRESS",
            address(0xB8f01AAeE2250C2A244B92B51f39213aca305012)
        );
        address sessionKey = vm.envOr(
            "SESSION_KEY_ADDRESS",
            address(0x0b84253936Fd66B4b407C32d578B20499c766137)
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy test tokens and protocol contracts
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("AEGIS Token", "AEGIS", 18);
        MockERC20 hype = new MockERC20("Hyperliquid HYPE", "HYPE", 18);
        MockAscendHookPool ascendPool = new MockAscendHookPool();

        AegisFeeCollector feeCollector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(ascendPool),
            deployer,
            deployer
        );

        AegisSentinelRegistry sentinelRegistry = new AegisSentinelRegistry(
            address(aegis),
            deployer
        );

        AegisVault vault = new AegisVault(deployer);

        // 2. Wire Permissions
        vault.setFeeCollector(address(feeCollector));
        feeCollector.setAuthorizedVault(address(vault), true);
        sentinelRegistry.setAuthorizedSlasher(address(vault), true);

        // 3. Fund accounts
        hype.mint(demoUser, 10_000 ether);
        usdc.mint(demoUser, 100_000 * 1e6);
        aegis.mint(sentinelOperator, 50_000 ether);

        // 4. Sentinel Stakes 25,000 $AEGIS Bond
        vm.stopBroadcast();

        // Broadcast as Sentinel to approve and bond
        uint256 sentinelPrivateKey = vm.envOr("SENTINEL_PRIVATE_KEY", deployerPrivateKey);
        vm.startBroadcast(sentinelPrivateKey);
        aegis.approve(address(sentinelRegistry), 25_000 ether);
        sentinelRegistry.bondStake(25_000 ether);
        vm.stopBroadcast();

        // 5. Demo Trader opens Position and sets ProConfig
        uint256 demoUserPrivateKey = vm.envOr("DEMO_USER_PRIVATE_KEY", deployerPrivateKey);
        vm.startBroadcast(demoUserPrivateKey);

        // Register Position (1,000 HYPE collateral, $32,000 USDC debt, 80% LTV)
        vault.registerPosition(address(hype), 1_000 ether, 32_000 * 1e6, 8000);

        // Set ProConfig
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

        console2.log("=== AEGIS Seeded Test Environment ===");
        console2.log("Demo Trader:       ", demoUser);
        console2.log("Collateral:        1,000 HYPE at", address(hype));
        console2.log("Debt:              32,000 USDC at", address(usdc));
        console2.log("Sentinel Operator: ", sentinelOperator);
        console2.log("Sentinel Bond:     25,000 AEGIS at", address(sentinelRegistry));
        console2.log("Session Key:       ", sessionKey);
        console2.log("AegisVault:        ", address(vault));
        console2.log("Environment seeding completed successfully.");
    }
}
