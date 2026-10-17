// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {AegisVault} from "../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../contracts/AegisFeeCollector.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/**
 * @title TransferOwnership
 * @notice Production script to migrate ownership of all AEGIS protocol contracts
 *         and configure yield targets to the user's designated wallet.
 */
contract TransferOwnership is Script {
    using stdJson for string;

    function run() external {
        string memory json = vm.readFile("./deployments.json");
        address vaultAddr = json.readAddress(".aegisVault");
        address sentinelRegistryAddr = json.readAddress(".sentinelRegistry");
        address feeCollectorAddr = json.readAddress(".feeCollector");
        address aegisAddr = json.readAddress(".aegis");
        address usdcAddr = json.readAddress(".usdc");
        address hypeAddr = json.readAddress(".hype");

        uint256 currentOwnerPrivateKey = vm.envOr("CURRENT_OWNER_PRIVATE_KEY", uint256(0));
        require(currentOwnerPrivateKey != 0, "TransferOwnership: CURRENT_OWNER_PRIVATE_KEY required");
        address currentOwner = vm.addr(currentOwnerPrivateKey);

        address newOwner = vm.envOr(
            "NEW_ADMIN_WALLET",
            address(0xf0e721C996e76a0Cd5805975464CbE3E98839D64)
        );

        AegisVault vault = AegisVault(vaultAddr);
        AegisSentinelRegistry sentinelRegistry = AegisSentinelRegistry(sentinelRegistryAddr);
        AegisFeeCollector feeCollector = AegisFeeCollector(feeCollectorAddr);
        MockERC20 aegis = MockERC20(aegisAddr);
        MockERC20 usdc = MockERC20(usdcAddr);
        MockERC20 hype = MockERC20(hypeAddr);

        console2.log("=== AEGIS Protocol Ownership Migration ===");
        console2.log("Current Owner:       ", currentOwner);
        console2.log("New Owner Destination:", newOwner);

        vm.startBroadcast(currentOwnerPrivateKey);

        // 1. Update Yield Distribution Target to the new owner
        feeCollector.setYieldDistributionTarget(newOwner);

        // 2. Transfer Ownership of all 3 core contracts
        vault.transferOwnership(newOwner);
        sentinelRegistry.transferOwnership(newOwner);
        feeCollector.transferOwnership(newOwner);

        // 3. Fund new owner with testnet gas (0.015 KNTQ)
        payable(newOwner).transfer(0.015 ether);

        // 4. Mint testnet assets to new owner for testing
        aegis.mint(newOwner, 50_000 ether);
        hype.mint(newOwner, 10_000 ether);
        usdc.mint(newOwner, 100_000 * 1e6);

        vm.stopBroadcast();

        // 5. Update deployments.json
        string memory obj = "deployment";
        vm.serializeAddress(obj, "admin", newOwner);
        vm.serializeAddress(obj, "usdc", usdcAddr);
        vm.serializeAddress(obj, "aegis", aegisAddr);
        vm.serializeAddress(obj, "hype", hypeAddr);
        vm.serializeAddress(obj, "feeCollector", feeCollectorAddr);
        vm.serializeAddress(obj, "sentinelRegistry", sentinelRegistryAddr);
        vm.serializeAddress(obj, "yieldDistributionTarget", newOwner);
        string memory finalJson = vm.serializeAddress(obj, "aegisVault", vaultAddr);

        try vm.writeJson(finalJson, "./deployments.json") {} catch {
            console2.log("Note: deployments.json write skipped");
        }

        console2.log("=== Ownership Transfer Broadcast Complete ===");
        console2.log("AegisVault Owner:        ", newOwner);
        console2.log("SentinelRegistry Owner:  ", newOwner);
        console2.log("FeeCollector Owner:      ", newOwner);
        console2.log("Yield Target:            ", newOwner);
        console2.log("Testnet Gas & Assets Funded to New Owner.");
    }
}
