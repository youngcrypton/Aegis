export interface ActiveHedgeState {
  vaultAddress: string;
  isOpen: boolean;
  perpMarketIndex: number;
  size: bigint; // Position size in base tokens (1e18)
  entryPrice: bigint; // Entry fill price (scaled 1e8)
  lowestWickPrice: bigint; // Lowest mark price seen since hedge opened (1e8)
  trailingExitPrice: bigint; // Exit trigger price = lowestWick * (1 + tau) (1e8)
  trailingTakeProfitBps: number; // e.g. 150 = 1.5%
  openedTimestamp: number;
}

export interface TrailingUpdateResult {
  isExitTriggered: boolean;
  lowestWickPrice: bigint;
  trailingExitPrice: bigint;
  estimatedProfitUsdc: bigint; // in 1e6 USDC units
}

export class TrailingTracker {
  private activeHedges: Map<string, ActiveHedgeState> = new Map();

  /**
   * Registers a newly opened short hedge position for dynamic bottom-wick trailing.
   */
  public registerHedge(
    vaultAddress: string,
    perpMarketIndex: number,
    size: bigint,
    entryPrice: bigint,
    trailingTakeProfitBps: number
  ): ActiveHedgeState {
    const tau = BigInt(trailingTakeProfitBps);
    // Initial exit price: entryPrice * (1 + tau)
    const initialExit = entryPrice + (entryPrice * tau) / 10000n;

    const hedge: ActiveHedgeState = {
      vaultAddress: vaultAddress.toLowerCase(),
      isOpen: true,
      perpMarketIndex,
      size,
      entryPrice,
      lowestWickPrice: entryPrice,
      trailingExitPrice: initialExit,
      trailingTakeProfitBps,
      openedTimestamp: Math.floor(Date.now() / 1000)
    };

    this.activeHedges.set(vaultAddress.toLowerCase(), hedge);
    return hedge;
  }

  /**
   * Updates tracking on every new mark price update.
   * Enforces:
   *   P_lowest = min(P_lowest, P_current)
   *   P_exit = P_lowest * (1 + tau)
   */
  public updatePrice(
    vaultAddress: string,
    currentPrice: bigint
  ): TrailingUpdateResult | null {
    const hedge = this.activeHedges.get(vaultAddress.toLowerCase());
    if (!hedge || !hedge.isOpen) {
      return null;
    }

    if (currentPrice < hedge.lowestWickPrice) {
      hedge.lowestWickPrice = currentPrice;
      const tau = BigInt(hedge.trailingTakeProfitBps);
      // Recalculate trailing exit trigger from the lower bottom wick
      hedge.trailingExitPrice = currentPrice + (currentPrice * tau) / 10000n;
    }

    // Trigger unwind when rebound crosses trailing exit price
    const isExitTriggered = currentPrice >= hedge.trailingExitPrice;

    // Realized Cash Profit = Q_hedge * (P_entry - P_current)
    // Q_hedge: 1e18, P: 1e8 -> (1e18 * 1e8) / 1e20 = 1e6 (USDC)
    let profitUsdc = 0n;
    if (hedge.entryPrice > currentPrice) {
      const priceDelta = hedge.entryPrice - currentPrice;
      profitUsdc = (hedge.size * priceDelta) / 100_000_000_000_000_000_000n;
    }

    return {
      isExitTriggered,
      lowestWickPrice: hedge.lowestWickPrice,
      trailingExitPrice: hedge.trailingExitPrice,
      estimatedProfitUsdc: profitUsdc
    };
  }

  /**
   * Closes and removes the tracked hedge state upon unwind execution.
   */
  public closeHedge(vaultAddress: string): void {
    this.activeHedges.delete(vaultAddress.toLowerCase());
  }

  /**
   * Returns active hedge metadata if open.
   */
  public getHedge(vaultAddress: string): ActiveHedgeState | undefined {
    return this.activeHedges.get(vaultAddress.toLowerCase());
  }

  /**
   * Returns count of currently active tracked hedges.
   */
  public getActiveCount(): number {
    return this.activeHedges.size;
  }
}

