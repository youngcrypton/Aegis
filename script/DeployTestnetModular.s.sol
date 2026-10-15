// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AegisVault} from "../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../contracts/AegisFeeCollector.sol";
import {RelayedOracleAdapter} from "../contracts/adapters/RelayedOracleAdapter.sol";
import {AgentDispatchAdapter} from "../contracts/adapters/AgentDispatchAdapter.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {MockAscendHookPool} from "../test/mocks/MockAscendHookPool.sol";

/**
 * @title DeployTestnetModular
 * @notice Production-grade deployment script for AEGIS Protocol on Elysium Orbit L2 Testnet (Chain ID 99801).
 * @dev Deploys the modular architecture that decouples precompiles 0x0801 and 0x0802 via
 *      RelayedOracleAdapter and AgentDispatchAdapter, binds to canonical testnet USDC (0x7D29...),
 *      and activates the Phase 1C deferred fee debt tracking.
 */
contract DeployTestnetModular is Script {
    /// @notice Official Elysium Testnet Canonical Tokens & Contracts
    address public constant CANONICAL_TESTNET_USDC = 0x7D29d8047B905000459c0E80c34a26CeedcB47b2;
    address public constant CANONICAL_TESTNET_WHYPE = 0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234;
    address public constant CANONICAL_MULTICALL3 = 0xcA11bde05977b3631167028862bE2a173976CA11;

    function run() external returns (
        RelayedOracleAdapter oracleAdapter,
        AgentDispatchAdapter writerAdapter,
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

        // 1. Resolve Token Addresses (Canonical Testnet or Environment Override)
        address usdc = vm.envOr("USDC_ADDRESS", CANONICAL_TESTNET_USDC);
        address aegis = vm.envOr("AEGIS_ADDRESS", address(0));
        address ascendPool = vm.envOr("ASCEND_POOL_ADDRESS", address(0));
        address yieldTarget = vm.envOr("YIELD_TARGET_ADDRESS", deployer);

        // Deploy mock $AEGIS token for testnet if not supplied
        if (aegis == address(0)) {
            aegis = address(new MockERC20("AEGIS Protocol Token", "AEGIS", 18));
        }

        // Deploy mock Ascend pool adapter if genuine pool is not yet available on testnet
        if (ascendPool == address(0)) {
            ascendPool = address(new MockAscendHookPool());
        }

        // 2. Deploy Modular Adapters (Resolves 0x0801 & 0x0802 Testnet Blockers)
        // RelayedOracleAdapter: 300s (5-minute) staleness allowance for testnet relayer
        oracleAdapter = new RelayedOracleAdapter(deployer, 300);
        oracleAdapter.setReporter(deployer, true);

        // Seed initial market reference prices (scaled 1e8 USD)
        oracleAdapter.updatePrice(0, 82_50000000);     // Perp 0: HYPE @ $82.50
        oracleAdapter.updatePrice(1, 94_500_00000000); // Perp 1: BTC @ $94,500.00
        oracleAdapter.updatePrice(2, 2_720_00000000);  // Perp 2: ETH @ $2,720.00
        oracleAdapter.updatePrice(3, 185_00000000);    // Perp 3: SOL @ $185.00

        // AgentDispatchAdapter: Dispatches trade intents to Sentinel keeper off-chain CLOB lane
        writerAdapter = new AgentDispatchAdapter(deployer);

        // 3. Deploy Core Protocol Contracts
        feeCollector = new AegisFeeCollector(
            usdc,
            aegis,
            ascendPool,
            yieldTarget,
            deployer
        );

        sentinelRegistry = new AegisSentinelRegistry(
            aegis,
            deployer
        );

        vault = new AegisVault(deployer);

        // 4. Wire Modular Adapters & System Permissions
        vault.setFeeCollector(address(feeCollector));
        vault.setOracleAdapter(address(oracleAdapter));
        vault.setHyperCoreWriter(address(writerAdapter));

        writerAdapter.setAuthorizedCaller(address(vault), true);
        feeCollector.setAuthorizedVault(address(vault), true);
        sentinelRegistry.setAuthorizedSlasher(address(vault), true);

        vm.stopBroadcast();

        // 5. Export Deployment Artifact
        string memory obj = "deployment";
        vm.serializeAddress(obj, "admin", deployer);
        vm.serializeAddress(obj, "usdc", usdc);
        vm.serializeAddress(obj, "aegis", aegis);
        vm.serializeAddress(obj, "whype", CANONICAL_TESTNET_WHYPE);
        vm.serializeAddress(obj, "multicall3", CANONICAL_MULTICALL3);
        vm.serializeAddress(obj, "ascendPool", ascendPool);
        vm.serializeAddress(obj, "oracleAdapter", address(oracleAdapter));
        vm.serializeAddress(obj, "writerAdapter", address(writerAdapter));
        vm.serializeAddress(obj, "feeCollector", address(feeCollector));
        vm.serializeAddress(obj, "sentinelRegistry", address(sentinelRegistry));
        vm.serializeAddress(obj, "yieldDistributionTarget", yieldTarget);
        string memory finalJson = vm.serializeAddress(obj, "aegisVault", address(vault));

        try vm.writeJson(finalJson, "./deployments.json") {} catch {
            console2.log("deployments.json write skipped in simulation");
        }

        console2.log("=== AEGIS Modular Stack Testnet Deployment ===");
        console2.log("Deployer / Admin:     ", deployer);
        console2.log("Canonical USDC:       ", usdc);
        console2.log("AEGIS Token:          ", aegis);
        console2.log("RelayedOracleAdapter: ", address(oracleAdapter));
        console2.log("AgentDispatchAdapter: ", address(writerAdapter));
        console2.log("FeeCollector:         ", address(feeCollector));
        console2.log("SentinelRegistry:     ", address(sentinelRegistry));
        console2.log("AegisVault (Phase 1C):", address(vault));
    }
}
