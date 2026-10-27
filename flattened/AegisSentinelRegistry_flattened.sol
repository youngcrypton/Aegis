// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

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

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.sol.eta.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// contracts/interfaces/IAegisSentinelRegistry.sol

/**
 * @title IAegisSentinelRegistry
 * @notice Interface for the AEGIS Sentinel node staking, SLA enforcement, and slashing registry.
 */
interface IAegisSentinelRegistry {
    event SentinelBonded(address indexed operator, uint256 amount, uint256 totalBonded);
    event SentinelUnstaked(address indexed operator, uint256 amount, uint256 remainingBond);
    event SentinelSlashed(
        address indexed operator,
        address indexed victim,
        uint256 slashBps,
        uint256 slashAmount,
        string reason
    );
    event SentinelDeactivated(address indexed operator);
    event SentinelExitInitiated(address indexed operator, uint256 unlockTimestamp);
    event SentinelExitFinalized(address indexed operator, uint256 amount);
    event SentinelPartialUnstakeInitiated(address indexed operator, uint256 amount, uint256 unlockTimestamp);
    event SentinelPartialUnstakeFinalized(address indexed operator, uint256 amount);
    event HedgeRecorded(address indexed operator, uint32 totalSuccessful);

    function bondStake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function initiateUnstake(uint256 amount) external;
    function finalizeUnstake() external;
    function initiateExitSentinel() external;
    function finalizeExitSentinel() external;
    function exitSentinel() external;
    function slashSentinel(
        address operator,
        address victim,
        uint256 slashBps,
        string calldata reason
    ) external;
    function recordSuccessfulHedge(address operator) external;
    function isSentinelActive(address operator) external view returns (bool);
    function getSentinel(address operator) external view returns (SentinelNode memory);
    function unbondingTimestamps(address operator) external view returns (uint256);
    function pendingUnstakeAmounts(address operator) external view returns (uint256);
    function pendingUnstakeTimestamps(address operator) external view returns (uint256);
    function MIN_BOND() external view returns (uint256);
    function MAX_SLASH_BPS() external view returns (uint256);
    function UNBONDING_COOLDOWN() external view returns (uint256);
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
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

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20Metadata.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.7.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /// @dev Attempts to fetch the token decimals. A return value of false indicates that the attempt failed in some way.
    function tryGetDecimals(IERC20 token) internal view returns (bool success, uint8 decimals) {
        bytes4 selector = IERC20Metadata.decimals.selector;
        assembly ("memory-safe") {
            mstore(0x00, selector)
            success := staticcall(gas(), token, 0x00, 4, 0x00, 0x20)
            success := and(and(success, gt(returndatasize(), 0x1f)), lt(mload(0x00), 0x100))
            decimals := mul(success, mload(0x00))
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to approve
     * @param bubble Behavior switch if the approve call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// contracts/AegisSentinelRegistry.sol

/**
 * @title AegisSentinelRegistry
 * @notice Staking and SLA enforcement registry for AEGIS Sentinel keeper nodes.
 * @dev Enforces a strict minimum bond of 25,000 $AEGIS tokens, a 7-day unbonding cooldown,
 *      and Invariant INV-2 (slashing <= 10%).
 */
contract AegisSentinelRegistry is IAegisSentinelRegistry, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Minimum bond required to activate and maintain a Sentinel node (25,000 * 1e18)
    uint256 public constant MIN_BOND = 25_000 * 1e18;

    /// @notice Invariant INV-2: Maximum permissible slashing penalty (1000 bps = 10%)
    uint256 public constant MAX_SLASH_BPS = 1000;

    /// @notice 7-day unbonding delay preventing front-running slashing evasion
    uint256 public constant UNBONDING_COOLDOWN = 7 days;

    /// @notice The $AEGIS governance/staking token
    IERC20 public immutable aegisToken;

    /// @notice Authorized slasher or vault contracts
    mapping(address => bool) public authorizedSlashers;

    /// @notice Minimum delay required between consecutive slash events for a single operator (rate limiter)
    uint256 public slashCooldown;

    /// @notice Timestamp of the last slash event per operator
    mapping(address => uint256) public lastSlashTimestamp;

    /// @notice Registry of Sentinel nodes mapped by operator address
    mapping(address => SentinelNode) public sentinels;

    /// @notice Cooldown unlock timestamp per operator when unbonding is initiated
    mapping(address => uint256) public override unbondingTimestamps;

    /// @notice Pending partial unstake amount per operator undergoing cooldown
    mapping(address => uint256) public override pendingUnstakeAmounts;

    /// @notice Pending partial unstake unlock timestamp per operator
    mapping(address => uint256) public override pendingUnstakeTimestamps;

    event SlashCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    modifier onlySlasherOrOwner() {
        if (msg.sender != owner() && !authorizedSlashers[msg.sender]) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address _aegisToken, address initialOwner) Ownable(initialOwner) {
        if (_aegisToken == address(0)) revert ZeroAddress();
        aegisToken = IERC20(_aegisToken);
    }

    /**
     * @notice Authorize or revoke an address permitted to slash or record hedges.
     * @param slasher Address of slasher/vault.
     * @param authorized True if authorized.
     */
    function setAuthorizedSlasher(address slasher, bool authorized) external onlyOwner {
        if (slasher == address(0)) revert ZeroAddress();
        authorizedSlashers[slasher] = authorized;
    }

    /**
     * @notice Set minimum delay required between consecutive slash events for an operator.
     * @param _slashCooldown Cooldown in seconds.
     */
    function setSlashCooldown(uint256 _slashCooldown) external onlyOwner {
        emit SlashCooldownUpdated(slashCooldown, _slashCooldown);
        slashCooldown = _slashCooldown;
    }

    /**
     * @notice Deposit $AEGIS tokens to bond and activate a Sentinel node.
     * @param amount Token amount to bond.
     */
    function bondStake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InsufficientBondAmount();
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);
        if (pendingUnstakeTimestamps[msg.sender] != 0) revert CooldownActive(pendingUnstakeTimestamps[msg.sender]);

        SentinelNode storage node = sentinels[msg.sender];
        uint256 newBond = node.bondedAmount + amount;

        if (newBond < MIN_BOND) {
            revert InsufficientBondAmount();
        }

        node.operator = msg.sender;
        node.bondedAmount = newBond;
        node.isActive = true;

        aegisToken.safeTransferFrom(msg.sender, address(this), amount);

        emit SentinelBonded(msg.sender, amount, newBond);
    }

    /**
     * @notice Initiates a 7-day unbonding cooldown for excess bonded tokens while retaining active node status.
     * @dev Prevents frontrunning slashing evasion: funds remain locked and slashable during the 7-day cooldown.
     * @param amount Token amount to unstake.
     */
    function initiateUnstake(uint256 amount) public nonReentrant {
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);
        if (pendingUnstakeTimestamps[msg.sender] != 0) revert CooldownActive(pendingUnstakeTimestamps[msg.sender]);

        SentinelNode storage node = sentinels[msg.sender];
        if (amount == 0 || node.bondedAmount < amount) {
            revert InsufficientBondAmount();
        }

        uint256 remaining = node.bondedAmount - amount;
        if (remaining < MIN_BOND) {
            revert InsufficientBondAmount();
        }

        node.bondedAmount = remaining;
        pendingUnstakeAmounts[msg.sender] = amount;
        uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
        pendingUnstakeTimestamps[msg.sender] = unlockTimestamp;

        emit SentinelPartialUnstakeInitiated(msg.sender, amount, unlockTimestamp);
    }

    /**
     * @notice Finalizes partial unstake after the 7-day unbonding cooldown elapses.
     */
    function finalizeUnstake() public nonReentrant {
        uint256 unlockTime = pendingUnstakeTimestamps[msg.sender];
        if (unlockTime == 0) revert NoUnbondRequest();
        if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

        uint256 amount = pendingUnstakeAmounts[msg.sender];
        delete pendingUnstakeAmounts[msg.sender];
        delete pendingUnstakeTimestamps[msg.sender];

        if (amount > 0) {
            aegisToken.safeTransfer(msg.sender, amount);
        }

        emit SentinelPartialUnstakeFinalized(msg.sender, amount);
        emit SentinelUnstaked(msg.sender, amount, sentinels[msg.sender].bondedAmount);
    }

    /**
     * @notice Two-phase partial unstake: initiates on first call, finalizes after 7 days cooldown.
     * @dev Prevents front-running slashing transactions by enforcing a 7-day unbonding delay.
     * @param amount Token amount to unstake.
     */
    function unstake(uint256 amount) external nonReentrant {
        uint256 unlockTime = pendingUnstakeTimestamps[msg.sender];
        if (unlockTime == 0) {
            if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);

            SentinelNode storage node = sentinels[msg.sender];
            if (amount == 0 || node.bondedAmount < amount) {
                revert InsufficientBondAmount();
            }

            uint256 remaining = node.bondedAmount - amount;
            if (remaining < MIN_BOND) {
                revert InsufficientBondAmount();
            }

            node.bondedAmount = remaining;
            pendingUnstakeAmounts[msg.sender] = amount;
            uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
            pendingUnstakeTimestamps[msg.sender] = unlockTimestamp;

            emit SentinelPartialUnstakeInitiated(msg.sender, amount, unlockTimestamp);
        } else {
            if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

            uint256 pendingAmt = pendingUnstakeAmounts[msg.sender];
            delete pendingUnstakeAmounts[msg.sender];
            delete pendingUnstakeTimestamps[msg.sender];

            if (pendingAmt > 0) {
                aegisToken.safeTransfer(msg.sender, pendingAmt);
            }

            emit SentinelPartialUnstakeFinalized(msg.sender, pendingAmt);
            emit SentinelUnstaked(msg.sender, pendingAmt, sentinels[msg.sender].bondedAmount);
        }
    }

    /**
     * @notice Initiates the 7-day unbonding cooldown, immediately deactivating the node.
     * @dev Bonded funds remain locked in the contract and remain slashable throughout the cooldown.
     */
    function initiateExitSentinel() public nonReentrant {
        SentinelNode storage node = sentinels[msg.sender];
        if (node.bondedAmount == 0) revert InsufficientBondAmount();
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);
        if (pendingUnstakeTimestamps[msg.sender] != 0) revert CooldownActive(pendingUnstakeTimestamps[msg.sender]);

        node.isActive = false;
        uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
        unbondingTimestamps[msg.sender] = unlockTimestamp;

        emit SentinelDeactivated(msg.sender);
        emit SentinelExitInitiated(msg.sender, unlockTimestamp);
    }

    /**
     * @notice Finalizes exit after the 7-day cooldown elapses, withdrawing remaining bonded tokens.
     */
    function finalizeExitSentinel() public nonReentrant {
        uint256 unlockTime = unbondingTimestamps[msg.sender];
        if (unlockTime == 0) revert NoUnbondRequest();
        if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

        SentinelNode storage node = sentinels[msg.sender];
        uint256 amount = node.bondedAmount;

        delete unbondingTimestamps[msg.sender];
        node.bondedAmount = 0;

        if (amount > 0) {
            aegisToken.safeTransfer(msg.sender, amount);
        }

        emit SentinelExitFinalized(msg.sender, amount);
        emit SentinelUnstaked(msg.sender, amount, 0);
    }

    /**
     * @notice Deactivates the caller's node and unbonds tokens through the 7-day cooldown.
     * @dev Initiates unbonding on first call; finalizes withdrawal after 7 days have elapsed.
     */
    function exitSentinel() external nonReentrant {
        uint256 unlockTime = unbondingTimestamps[msg.sender];
        if (unlockTime == 0) {
            SentinelNode storage node = sentinels[msg.sender];
            if (node.bondedAmount == 0) revert InsufficientBondAmount();

            node.isActive = false;
            uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
            unbondingTimestamps[msg.sender] = unlockTimestamp;

            emit SentinelDeactivated(msg.sender);
            emit SentinelExitInitiated(msg.sender, unlockTimestamp);
        } else {
            if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

            SentinelNode storage node = sentinels[msg.sender];
            uint256 amount = node.bondedAmount;

            delete unbondingTimestamps[msg.sender];
            node.bondedAmount = 0;

            if (amount > 0) {
                aegisToken.safeTransfer(msg.sender, amount);
            }

            emit SentinelExitFinalized(msg.sender, amount);
            emit SentinelUnstaked(msg.sender, amount, 0);
        }
    }

    /**
     * @notice Penalizes a malfunctioning or malicious Sentinel node.
     * @dev Invariant INV-2: slashBps cannot exceed 1000 (10%). Slashing proceeds are paid directly to victim.
     * @param operator The Sentinel operator being slashed.
     * @param victim The vault owner or affected counterparty receiving the restitution payout.
     * @param slashBps Basis points to slash (1000 max = 10%).
     * @param reason Human-readable reason for SLA violation.
     */
    function slashSentinel(
        address operator,
        address victim,
        uint256 slashBps,
        string calldata reason
    ) external onlySlasherOrOwner nonReentrant {
        if (operator == address(0) || victim == address(0)) revert ZeroAddress();
        if (slashBps > MAX_SLASH_BPS) revert SlashExceedsMaxBound();

        if (slashCooldown > 0 && lastSlashTimestamp[operator] != 0 && msg.sender != owner()) {
            if (block.timestamp < lastSlashTimestamp[operator] + slashCooldown) {
                revert CooldownActive(lastSlashTimestamp[operator] + slashCooldown);
            }
        }
        lastSlashTimestamp[operator] = block.timestamp;

        SentinelNode storage node = sentinels[operator];
        uint256 totalSlashable = node.bondedAmount + pendingUnstakeAmounts[operator];
        if (totalSlashable == 0) revert InsufficientBondAmount();

        uint256 slashAmount = (totalSlashable * slashBps) / 10000;
        node.slashCount += 1;

        if (slashAmount <= node.bondedAmount) {
            node.bondedAmount -= slashAmount;
        } else {
            uint256 excess = slashAmount - node.bondedAmount;
            node.bondedAmount = 0;
            if (excess <= pendingUnstakeAmounts[operator]) {
                pendingUnstakeAmounts[operator] -= excess;
            } else {
                pendingUnstakeAmounts[operator] = 0;
            }
        }

        if (node.bondedAmount < MIN_BOND) {
            node.isActive = false;
            emit SentinelDeactivated(operator);
        }

        aegisToken.safeTransfer(victim, slashAmount);

        emit SentinelSlashed(operator, victim, slashBps, slashAmount, reason);
    }

    /**
     * @notice Records a successful hedge execution by an authorized sentinel.
     * @param operator The sentinel operator address.
     */
    function recordSuccessfulHedge(address operator) external onlySlasherOrOwner {
        if (operator == address(0)) revert ZeroAddress();
        SentinelNode storage node = sentinels[operator];
        node.successfulHedges += 1;
        emit HedgeRecorded(operator, node.successfulHedges);
    }

    /**
     * @notice Query whether an operator has an active Sentinel node meeting the bond minimum.
     * @param operator The node operator address.
     */
    function isSentinelActive(address operator) external view returns (bool) {
        return sentinels[operator].isActive && sentinels[operator].bondedAmount >= MIN_BOND && unbondingTimestamps[operator] == 0;
    }

    /**
     * @notice Query full Sentinel node details.
     * @param operator The node operator address.
     */
    function getSentinel(address operator) external view returns (SentinelNode memory) {
        return sentinels[operator];
    }
}
