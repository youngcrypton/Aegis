// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    IntentExpired,
    UnauthorizedSessionKey,
    PredeployWriteFailed,
    ZeroAddress
} from "../AegisTypes.sol";
import {IHyperCoreWriter} from "../interfaces/IHyperCoreWriter.sol";

/**
 * @title TradeIntentExecutor
 * @notice Abstract cryptographic intent executor implementing EIP-712 session key validation.
 * @dev Enforces Invariant INV-1 (non-custodial session keys cannot withdraw assets)
 *      and Invariant INV-5 (strictly monotonic nonces preventing replay attacks).
 */
abstract contract TradeIntentExecutor is EIP712 {
    /// @notice EIP-712 structured typed data hash for atomic hedge orders
    bytes32 public constant HEDGE_INTENT_TYPEHASH = keccak256(
        "HedgeIntent(address vault,uint32 perpIndex,int256 size,uint256 limitPrice,uint256 nonce,uint256 deadline)"
    );

    /// @notice Address of Elysium Predeploy 0x0802 (ElysiumCoreWriter)
    address public constant PREDEPLOY_0x0802 = address(0x0802);

    /// @notice Target writer predeploy address (defaults to 0x0802)
    address public hyperCoreWriter;

    /// @notice Sequential nonce tracker per vault owner (Invariant INV-5)
    mapping(address => uint256) public vaultNonces;

    event HedgeIntentDispatched(
        address indexed vault,
        uint32 indexed perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 nonce
    );

    constructor() EIP712("AEGIS Protocol", "1.0.0") {
        hyperCoreWriter = PREDEPLOY_0x0802;
    }

    /**
     * @notice Computes the typed EIP-712 digest for a given trade intent.
     * @param vault Address of the vault owner.
     * @param perpIndex Perpetual market identifier.
     * @param size Position size (negative for short, positive for long).
     * @param limitPrice Execution limit price scaled 1e8.
     * @param nonce Nonce corresponding to the intent.
     * @param deadline Unix timestamp expiration.
     * @return digest 32-byte hash to be signed with EIP-712.
     */
    function hashHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                HEDGE_INTENT_TYPEHASH,
                vault,
                perpIndex,
                size,
                limitPrice,
                nonce,
                deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /**
     * @notice Cryptographically verifies a trade intent signature and dispatches the order to 0x0802.
     * @dev Invariant INV-1: Signer must match delegated trade-only session key.
     *      Invariant INV-5: Nonce increments monotonically.
     * @param vaultOwner Address of the vault position owner.
     * @param delegatedKey Delegated session key authorized to execute hedges.
     * @param perpIndex Perpetual market identifier on HyperCore.
     * @param size Position size in base units.
     * @param limitPrice Limit price scaled 1e8.
     * @param deadline Expiration timestamp.
     * @param signature Cryptographic EIP-712 signature from delegatedKey.
     * @return success True if the intent was verified and dispatched.
     */
    function _verifyAndDispatch(
        address vaultOwner,
        address delegatedKey,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 deadline,
        bytes calldata signature
    ) internal returns (bool success) {
        if (block.timestamp > deadline) revert IntentExpired();
        if (delegatedKey == address(0)) revert UnauthorizedSessionKey();

        // Invariant INV-5: Monotonic sequential nonce consumption
        uint256 currentNonce = vaultNonces[vaultOwner]++;

        bytes32 digest = hashHedgeIntent(
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            currentNonce,
            deadline
        );

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != delegatedKey) revert UnauthorizedSessionKey();

        // Dispatch call to Elysium Predeploy 0x0802
        bool writeSuccess = IHyperCoreWriter(hyperCoreWriter).placeHedgeIntent(
            vaultOwner,
            perpIndex,
            size,
            limitPrice
        );
        if (!writeSuccess) revert PredeployWriteFailed();

        emit HedgeIntentDispatched(vaultOwner, perpIndex, size, limitPrice, currentNonce);
        return true;
    }

    /**
     * @notice Allows internal contracts / testing harnesses to adjust writer address.
     */
    function _setHyperCoreWriter(address _writer) internal {
        if (_writer == address(0)) revert ZeroAddress();
        hyperCoreWriter = _writer;
    }
}
