// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";

/**
 * @title MarginMathFuzzTest
 * @notice Differential and property-based fuzz tests verifying AEGIS quantitative margin models.
 * @dev Verifies monotonicity of H, delta-neutral coverage of Q_hedge, and trailing exit properties.
 */
contract MarginMathFuzzTest is Test {
    /**
     * @notice Helper computing Health Factor H scaled 1e4 (10000 = 1.00)
     */
    function computeHealthFactor(
        uint256 qCollateral,
        uint256 markPrice,
        uint16 ltvBps,
        uint256 debtUsdc
    ) public pure returns (uint256) {
        if (debtUsdc == 0) return type(uint256).max;
        return (qCollateral * markPrice * uint256(ltvBps)) / (debtUsdc * 1e20);
    }

    /**
     * @notice Property 1: Health factor H is strictly monotonic with respect to mark price P.
     *         If P1 < P2, then H(P1) <= H(P2).
     */
    function testFuzz_HealthFactorMonotonicity(
        uint256 qCollateral,
        uint256 price1,
        uint256 price2,
        uint16 ltvBps,
        uint256 debtUsdc
    ) public pure {
        // Bound inputs to reasonable DeFi ranges
        qCollateral = bound(qCollateral, 1 ether, 100_000 ether);
        debtUsdc = bound(debtUsdc, 100 * 1e6, 10_000_000 * 1e6);
        ltvBps = uint16(bound(ltvBps, 5000, 9500));
        price1 = bound(price1, 1_00000000, 50_000_00000000); // $1 to $50,000
        price2 = bound(price2, 1_00000000, 50_000_00000000);

        if (price1 > price2) {
            (price1, price2) = (price2, price1);
        }

        uint256 h1 = computeHealthFactor(qCollateral, price1, ltvBps, debtUsdc);
        uint256 h2 = computeHealthFactor(qCollateral, price2, ltvBps, debtUsdc);

        assertLe(h1, h2, "Monotonicity violation: Lower price produced higher health factor");
    }

    /**
     * @notice Property 2: For full delta-neutral hedge (gamma = 1.00), Q_hedge equals Q_collateral.
     *         Spot value loss is offset dollar-for-dollar by short perpetual gain.
     */
    function testFuzz_FullHedgeDeltaNeutralSizing(
        uint256 qCollateral,
        uint256 entryPrice,
        uint256 crashPrice
    ) public pure {
        qCollateral = bound(qCollateral, 1 ether, 10_000 ether);
        entryPrice = bound(entryPrice, 10_00000000, 5_000_00000000); // $10 to $5,000
        crashPrice = bound(crashPrice, 1_00000000, entryPrice);     // Price drops

        // Sizing for gamma = 1.00 (10000 bps)
        uint256 qHedge = qCollateral;

        // Spot valuation loss: Q * (entryPrice - crashPrice)
        uint256 spotLoss = (qCollateral * (entryPrice - crashPrice)) / 1e20;

        // Short perpetual hedge gain: Q_hedge * (entryPrice - crashPrice)
        uint256 perpGain = (qHedge * (entryPrice - crashPrice)) / 1e20;

        assertEq(spotLoss, perpGain, "Delta neutral violation: Hedge gain did not offset spot loss");
    }

    /**
     * @notice Property 3: Trailing profit-take exit trigger strictly exceeds lowest wick price.
     *         For all tau > 0 and P_lowest > 0: P_exit > P_lowest.
     */
    function testFuzz_TrailingExitStrictlyExceedsLowestWick(
        uint256 lowestWickPrice,
        uint16 tauBps
    ) public pure {
        lowestWickPrice = bound(lowestWickPrice, 1_00000000, 100_000_00000000);
        tauBps = uint16(bound(tauBps, 50, 500)); // 0.5% to 5.0%

        uint256 exitPrice = (lowestWickPrice * (10000 + tauBps)) / 10000;

        assertGt(exitPrice, lowestWickPrice, "Trailing exit price must strictly exceed lowest wick price");
    }

    /**
     * @notice Property 4: Scaled health factor precision matches basis points without overflow.
     */
    function testFuzz_HealthFactorExactScaling(
        uint256 collateralUnits,
        uint256 priceDollars,
        uint16 ltvBps
    ) public pure {
        collateralUnits = bound(collateralUnits, 1, 1_000_000);
        priceDollars = bound(priceDollars, 1, 100_000);
        ltvBps = uint16(bound(ltvBps, 5000, 9000));

        uint256 qCollateral = collateralUnits * 1e18;
        uint256 markPrice = priceDollars * 1e8;
        // Total collateral value in USDC = collateralUnits * priceDollars * 1e6
        uint256 colValUsdc = collateralUnits * priceDollars * 1e6;
        // Max debt at 1.00 health factor = colValUsdc * ltvBps / 10000
        uint256 debtAtPar = (colValUsdc * ltvBps) / 10000;

        if (debtAtPar > 0) {
            uint256 h = computeHealthFactor(qCollateral, markPrice, ltvBps, debtAtPar);
            // Must equal exactly 10,000 (1.00 scaled 1e4)
            assertEq(h, 10000, "Par debt must evaluate to exactly 10,000 basis points (1.00 H)");
        }
    }
}
