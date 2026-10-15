// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IHyperCoreOracle} from "../interfaces/IHyperCoreOracle.sol";
import {ZeroAddress, InvalidPrice, PriceStale} from "../AegisTypes.sol";

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
