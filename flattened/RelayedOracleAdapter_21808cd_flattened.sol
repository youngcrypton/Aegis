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

// contracts/interfaces/IHyperCoreOracle.sol

/**
 * @title IHyperCoreOracle
 * @notice Standard interface for HyperCore market price feed adapters in AEGIS Protocol.
 * @dev Decouples the vault risk engine from underlying precompiles or relayed price networks.
 */
interface IHyperCoreOracle {
    /**
     * @notice Returns the perpetual mark price scaled to 1e8 USD.
     * @param perpIndex The market index on HyperCore (e.g., 0 for HYPE-PERP).
     * @return markPrice Mark price scaled to 1e8 USD.
     */
    function getPerpPrice(uint32 perpIndex) external view returns (uint256 markPrice);

    /**
     * @notice Returns the perpetual mark price and observation timestamp.
     * @param perpIndex The market index on HyperCore.
     * @return markPrice Mark price scaled to 1e8 USD.
     * @return timestamp Observation timestamp in seconds.
     */
    function getPerpPriceWithTimestamp(uint32 perpIndex) external view returns (uint256 markPrice, uint256 timestamp);
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

// contracts/adapters/RelayedOracleAdapter.sol

/**
 * @title RelayedOracleAdapter
 * @notice Telemetry-relayed oracle adapter designed for Stock ArbOS (Testnet & Day 1 Mainnet).
 * @dev Allows authorized Sentinels or relayer nodes to attest to live HyperCore mark prices on-chain
 *      with strict staleness guarantees, bridging the gap until the ArbOS precompile hardfork ships.
 */
contract RelayedOracleAdapter is IHyperCoreOracle, Ownable {
    struct PriceRecord {
        uint256 price;      // Scaled 1e8 USD
        uint256 timestamp;  // Block timestamp of update
    }

    /// @notice Maximum allowed age of price data before reverting (default: 120 seconds)
    uint256 public maxStaleness;

    /// @notice Authorized price reporters (Sentinels / Keepers / Oracles)
    mapping(address => bool) public authorizedReporters;

    /// @notice Latest price records by perpetual market index
    mapping(uint32 => PriceRecord) public prices;

    event PriceUpdated(uint32 indexed perpIndex, uint256 price, uint256 timestamp, address indexed reporter);
    event ReporterUpdated(address indexed reporter, bool authorized);
    event MaxStalenessUpdated(uint256 oldStaleness, uint256 newStaleness);

    error UnauthorizedReporter();

    modifier onlyReporter() {
        if (!authorizedReporters[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedReporter();
        }
        _;
    }

    constructor(address initialOwner, uint256 _maxStaleness) Ownable(initialOwner) {
        maxStaleness = _maxStaleness > 0 ? _maxStaleness : 120; // 2 minutes default
    }

    function setReporter(address reporter, bool authorized) external onlyOwner {
        if (reporter == address(0)) revert ZeroAddress();
        authorizedReporters[reporter] = authorized;
        emit ReporterUpdated(reporter, authorized);
    }

    function setMaxStaleness(uint256 _maxStaleness) external onlyOwner {
        emit MaxStalenessUpdated(maxStaleness, _maxStaleness);
        maxStaleness = _maxStaleness;
    }

    function updatePrice(uint32 perpIndex, uint256 price) external onlyReporter {
        if (price == 0) revert InvalidPrice();
        prices[perpIndex] = PriceRecord({price: price, timestamp: block.timestamp});
        emit PriceUpdated(perpIndex, price, block.timestamp, msg.sender);
    }

    function updatePrices(uint32[] calldata perpIndices, uint256[] calldata newPrices) external onlyReporter {
        require(perpIndices.length == newPrices.length, "LengthMismatch");
        for (uint256 i = 0; i < perpIndices.length; i++) {
            if (newPrices[i] == 0) revert InvalidPrice();
            prices[perpIndices[i]] = PriceRecord({price: newPrices[i], timestamp: block.timestamp});
            emit PriceUpdated(perpIndices[i], newPrices[i], block.timestamp, msg.sender);
        }
    }

    function getPerpPrice(uint32 perpIndex) external view override returns (uint256 markPrice) {
        PriceRecord memory record = prices[perpIndex];
        if (record.price == 0) revert InvalidPrice();
        if (block.timestamp - record.timestamp > maxStaleness) {
            revert PriceStale(perpIndex, record.timestamp, block.timestamp);
        }
        return record.price;
    }

    function getPerpPriceWithTimestamp(uint32 perpIndex) external view override returns (uint256 markPrice, uint256 timestamp) {
        PriceRecord memory record = prices[perpIndex];
        if (record.price == 0) revert InvalidPrice();
        if (block.timestamp - record.timestamp > maxStaleness) {
            revert PriceStale(perpIndex, record.timestamp, block.timestamp);
        }
        return (record.price, record.timestamp);
    }
}
