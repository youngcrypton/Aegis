// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VaultPosition, ProConfig, ActiveHedge} from "../AegisTypes.sol";

/**
 * @title IAegisVault
 * @notice External interface for the primary AEGIS risk engine and vault lifecycle manager.
 */
interface IAegisVault {
    event PositionRegistered(
        address indexed owner,
        address collateralToken,
        uint256 amount,
        uint256 debtUsdc,
        uint16 ltvBps
    );
    event ProConfigUpdated(address indexed owner, ProConfig config);
    event SessionKeyDelegated(address indexed owner, address indexed sessionKey, uint48 expiry);
    event SessionKeyRevoked(address indexed owner);
    event ManualOverrideActivated(address indexed owner);
    event HedgeExecuted(
        address indexed vaultOwner,
        uint32 indexed perpIndex,
        int256 size,
        uint256 entryPrice
    );
    event HedgeUnwound(
        address indexed vaultOwner,
        uint32 indexed perpIndex,
        uint256 exitPrice
    );

    function registerPosition(
        address collateralToken,
        uint256 amount,
        uint256 debtUsdc,
        uint16 ltvBps
    ) external;

    function setProConfig(ProConfig calldata config) external;

    function delegateSessionKey(address key, uint48 duration) external;

    function revokeSessionKey() external;

    function manualOverride() external;

    function executeHedgeIntent(
        address vaultOwner,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function executeUnwindIntent(
        address vaultOwner,
        uint32 perpIndex,
        uint256 exitPrice,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function getVaultHealth(address vaultOwner, uint32 perpIndex)
        external
        view
        returns (uint256 healthFactor, bool isTriggered, uint256 markPrice);

    function getPosition(address vaultOwner) external view returns (VaultPosition memory);

    function getProConfig(address vaultOwner) external view returns (ProConfig memory);

    function getActiveHedge(address vaultOwner) external view returns (ActiveHedge memory);
}
