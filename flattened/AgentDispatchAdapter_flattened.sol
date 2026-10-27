// SPDX-License-Identifier: MIT
pragma solidity =0.8.24 ^0.8.20;

// contracts/AegisTypes.sol

/**
 * @title AegisTypes
 * @notice Shared data schemas, packed storage structs, enums, and custom errors for AEGIS Protocol.
 */

enum TriggerMode {
    PRICE,              // 0: Trigger strictly on collateral price breach
    HEALTH_FACTOR,      // 1: Trigger strictly on Health Factor breach
    HYBRID              // 2: Trigger on either (H <= H_trigger OR P <= P_trigger)
}

enum OrderType {
    POST_ONLY_LIMIT,    // 0: Resting liquidity order on HyperCore CLOB
    IOC,                // 1: Immediate-or-cancel market taker
    MARKET              // 2: Immediate market fill
}

enum VaultState {
    STANDBY,            // 0: Healthy, risk monitored
    ARMED,              // 1: Health factor within 5% of trigger
    HEDGED,             // 2: Short perpetual hedge active on HyperCore
    UNWOUND,            // 3: Hedge closed, cash profit locked
    OVERRIDDEN          // 4: Emergency manual override active
}

// Packed ProConfig struct: Exactly 3 EVM storage slots
struct ProConfig {
    // Slot 1 (15 bytes used, 17 bytes free)
    uint8 triggerMode;              // 1 byte
    uint8 orderType;                // 1 byte
    uint16 hedgeRatioBps;           // 2 bytes (1000 = 10% to 10000 = 100%)
    uint16 trailingTakeProfitBps;   // 2 bytes (50 = 0.5% to 500 = 5.0%)
    uint16 maxSlippageBps;          // 2 bytes (10 = 0.1% to 100 = 1.0%)
    uint48 sessionKeyExpiry;        // 6 bytes (Unix timestamp)
    bool manualOverrideActive;      // 1 byte
    // Slot 2 (32 bytes)
    uint256 priceTrigger;           // Collateral price threshold scaled 1e8
    // Slot 3 (32 bytes)
    uint256 healthFactorTrigger;    // Health factor threshold scaled 1e4 (11000 = 1.10)
}

// Packed VaultPosition struct: Exactly 4 EVM storage slots
struct VaultPosition {
    // Slot 1 (28 bytes used, 4 bytes free)
    address owner;                  // 20 bytes
    uint16 liquidationThresholdBps; // 2 bytes (e.g. 8000 = 80%)
    uint48 lastHedgeBlock;          // 6 bytes
    // Slot 2 (32 bytes used)
    address collateralToken;        // 20 bytes
    uint96 collateralAmount;        // 12 bytes (up to 79B units at 1e18)
    // Slot 3 (32 bytes used)
    uint256 debtAmountUsdc;         // Borrowed debt in USDC (scaled 1e6)
    // Slot 4 (20 bytes used)
    address sessionKey;             // Delegated trade-only signer
}

struct ActiveHedge {
    bool isOpen;
    uint32 perpMarketIndex;
    uint256 size;                   // Position size in base tokens
    uint256 entryPrice;             // Fill price on HyperCore (scaled 1e8)
    uint256 lowestWickPrice;        // Monotonically non-increasing low
    uint256 trailingExitPrice;      // Exit trigger = lowestWick * (1 + tau)
}

struct SentinelNode {
    address operator;
    uint256 bondedAmount;           // Staked $AEGIS tokens (scaled 1e18)
    bool isActive;                  // True if bond >= 25,000 $AEGIS
    uint32 successfulHedges;
    uint16 slashCount;
}

// Custom Protocol Error Signatures
error InvalidHealthTrigger();
error InsufficientBondAmount();
error SessionKeyExpired();
error UnauthorizedCaller();
error SlippageExceeded();
error OverrideActive();
error ZeroAddress();
error PrecompileReadFailed(uint32 perpIndex);
error PredeployWriteFailed();
error SlashExceedsMaxBound();
error UnauthorizedSessionKey();
error IntentExpired();
error HedgeAlreadyActive();
error TrailingExitNotReached(uint256 currentPrice, uint256 targetPrice);
error InvalidPrice();
error MismatchedMarketIndex();
error CooldownActive(uint256 unlockTimestamp);
error NoUnbondRequest();
error NoOutstandingDebt();
error ZeroRepaymentAmount();
error PriceStale(uint32 perpIndex, uint256 updatedAt, uint256 currentTimestamp);
error AmountOverflow();

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// contracts/interfaces/IHyperCoreWriter.sol

/**
 * @title IHyperCoreWriter
 * @notice Interface for Elysium Predeploy 0x0802 (ElysiumCoreWriter).
 * @dev Dispatches trade-only orders into HyperCore L1 CLOB matching engine with sub-second finality.
 */
interface IHyperCoreWriter {
    /**
     * @notice Emits an atomic signed trade intent to HyperCore keepers.
     * @param vault The user vault owner on whose behalf the order is placed.
     * @param perpIndex The perpetual market index on HyperCore.
     * @param size Signed size (positive for long, negative for short).
     * @param limitPrice Execution price limit scaled 1e8.
     * @return success True if the intent was captured by keeper pre-matching.
     */
    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external returns (bool success);

    /**
     * @notice Cancels a resting order intent on HyperCore.
     * @param vault The vault owner.
     * @param perpIndex The perpetual market index.
     */
    function cancelHedgeIntent(address vault, uint32 perpIndex) external returns (bool success);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// contracts/adapters/AgentDispatchAdapter.sol

/**
 * @title AgentDispatchAdapter
 * @notice Stock ArbOS trade dispatch adapter for AEGIS Protocol.
 * @dev Emits verifiable on-chain events that the off-chain Sentinel Keeper captures
 *      and submits to HyperCore L1 as an authorized trade-only agent on the user's account.
 *      Enforces INV-1: Agents cannot transfer/withdraw funds.
 */
contract AgentDispatchAdapter is IHyperCoreWriter, Ownable {
    /// @notice Authorized callers (e.g., AegisVault)
    mapping(address => bool) public authorizedCallers;

    event AgentHedgeIntentDispatched(
        address indexed vault,
        uint32 indexed perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 timestamp
    );

    event AgentHedgeIntentCancelled(
        address indexed vault,
        uint32 indexed perpIndex,
        uint256 timestamp
    );

    event CallerAuthorized(address indexed caller, bool authorized);

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external override onlyAuthorized returns (bool success) {
        emit AgentHedgeIntentDispatched(vault, perpIndex, size, limitPrice, block.timestamp);
        return true;
    }

    function cancelHedgeIntent(
        address vault,
        uint32 perpIndex
    ) external override onlyAuthorized returns (bool success) {
        emit AgentHedgeIntentCancelled(vault, perpIndex, block.timestamp);
        return true;
    }
}
