/**
 * AEGIS Lightpaper — GitBook Interactive Client-Side Engine
 * Navigation, Markdown Parsing, Math Formatting, Search Engine, TOC Scroll-Spy
 */

(function () {
  'use strict';

  // --- 1. LIGHTPAPER CHAPTER REGISTRY ---
  const CHAPTERS = [
    {
      id: 'abstract',
      group: 'GETTING STARTED',
      title: 'Abstract & Executive Summary',
      subtitle: 'Non-custodial risk engine and synthetic delta-hedging formulation for Elysium L2 and HyperCore.',
      prev: null,
      next: { id: 'liquidation-crisis', title: 'The Systemic Liquidation Crisis' },
      content: `
        <div class="gb-callout gb-callout-info">
          <div class="gb-callout-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">Production Verification Scorecard: 157 / 157 Passing</div>
            AEGIS smart contracts, formal invariants, Sentinel keeper daemon, and live RPC truthfulness suites are 100% verified on the <code>main</code> branch.
            Includes 115 Foundry tests across 14 suites (160,000+ fuzz runs), 29 Jest Keeper tests, and 13 live RPC truthfulness checks.
          </div>
        </div>

        <h2>Abstract</h2>
        <p>Forced liquidations remain the primary systemic risk vector in collateralized decentralized finance. Traditional debt protocols rely on abrupt, irreversible collateral auctions that seize borrower assets at fire-sale discounts (5% to 10% penalty surcharges), realize permanent capital loss at market troughs, and trigger cascading network-wide insolvency cascades.</p>

        <p><strong>AEGIS</strong> introduces an autonomous, non-custodial risk engine and synthetic delta-hedging protocol designed for the Elysium Orbit L2 ecosystem and HyperCore (Hyperliquid's L1 high-performance CLOB). Rather than liquidating spot collateral, AEGIS dynamically neutralizes directional downside exposure ($\\\\Delta$) by dispatching counterbalancing short perpetual futures contracts on HyperCore before liquidation thresholds are breached. Spot collateral remains 100% intact within the user's primary vault under zero-custody delegation (Invariant <strong>INV-1</strong>).</p>

        <p>To ensure immediate testability on stock Arbitrum Nitro ArbOS prior to the upcoming validator hardfork, AEGIS implements a <strong>Modular Dual-Mode Architecture</strong>, operating via modular oracle and dispatch adapters today and hot-swapping to native zero-gas precompiles (<code>0x0801</code> and <code>0x0802</code>) post-hardfork with zero vault migration. The protocol enforces Phase 1C deferred fee debt accounting, guaranteeing that emergency unwind operations are never blocked by liquidity deficits.</p>

        <h2>Key Protocol Pillars</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Architectural Pillar</th><th>Protocol Guarantee</th><th>Verification Metric</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Zero Custody Loss (INV-1)</strong></td>
                <td>Collateral never moves out of the user vault; session keys are trade-only.</td>
                <td>160,000+ fuzz runs, 0 unauthorized balance movements</td>
              </tr>
              <tr>
                <td><strong>Modular Dual-Mode Stack</strong></td>
                <td>Operates on stock ArbOS today, hot-swapping to native 0x0801/0x0802 post-hardfork.</td>
                <td><code>RelayedOracleAdapter.sol</code> + <code>AgentDispatchAdapter.sol</code></td>
              </tr>
              <tr>
                <td><strong>Phase 1C Non-Blocking Debt</strong></td>
                <td>Unwinds never revert if liquid USDC is zero; fees are tracked in <code>feeDebts[user]</code>.</td>
                <td>100% pass rate on zero-balance stress tests</td>
              </tr>
              <tr>
                <td><strong>50/50 Fee Conservation (INV-4)</strong></td>
                <td>10% fee strictly divided between Ascend buyback-burn and Sentinel node yield.</td>
                <td>Tested across all unwind amounts in <code>AegisFeeCollector.sol</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    },
    {
      id: 'liquidation-crisis',
      group: 'PART I: INTRODUCTION',
      title: 'The Systemic Liquidation Crisis',
      subtitle: 'Why traditional liquidation auctions destroy user capital and trigger catastrophic cascade failures.',
      prev: { id: 'abstract', title: 'Abstract & Executive Summary' },
      next: { id: 'hold-the-line', title: 'The "Hold the Line" Thesis' },
      content: `
        <div class="gb-callout gb-callout-danger">
          <div class="gb-callout-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">The Flaw of Collateral Auctions</div>
            Traditional DeFi liquidations do not protect users—they protect third-party liquidators at the direct expense of borrower equity.
          </div>
        </div>

        <h2>1. The Mechanics of Forced Liquidation</h2>
        <p>In debt-based decentralized financial architectures, solvency is traditionally guaranteed by enforcing an overcollateralization ratio:</p>
        
        <div class="gb-math-card">
          <div class="gb-math-title">Standard Loan-to-Value (LTV) Invariant</div>
          <div class="gb-math-formula">LTV = D_debt / (Q_collateral × P_collateral) ≤ LTV_max</div>
        </div>

        <p>When macro volatility drives collateral depreciation, <code>LTV</code> escalates toward the protocol's liquidation threshold <code>T_liq</code>. At this juncture, conventional protocols invoke third-party liquidators to seize underlying collateral.</p>

        <h2>2. Three Systemic Externalities</h2>
        <ul>
          <li><strong>The Liquidation Penalty (5% to 10% Surcharge):</strong> Liquidators receive an immediate bonus penalty deducted directly from user collateral. For a $100,000 position, a 10% penalty instantly destroys $10,000 of equity.</li>
          <li><strong>Bottom-Dumping into Thin Order Books:</strong> Liquidators immediately sell seized spot collateral onto Automated Market Makers (AMMs), realizing permanent losses precisely when the asset is undervalued.</li>
          <li><strong>MEV Priority Gas Auctions (PGAs):</strong> Searchers bribe validators to front-run liquidation transactions, creating cascading slippage that triggers secondary liquidations across correlated money markets.</li>
        </ul>
      `
    },
    {
      id: 'hold-the-line',
      group: 'PART I: INTRODUCTION',
      title: 'The "Hold the Line" Thesis',
      subtitle: 'Synthetically neutralizing downside delta risk without seizing or dumping user collateral.',
      prev: { id: 'liquidation-crisis', title: 'The Systemic Liquidation Crisis' },
      next: { id: 'system-overview', title: 'Three-Tier Protocol Stack' },
      content: `
        <div class="gb-callout gb-callout-success">
          <div class="gb-callout-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">Core Protocol Axiom: "Hold the Line"</div>
            Never seize or dump collateral during temporary flash crashes. Neutralize directional downside delta synthetically, and preserve the asset until macro recovery.
          </div>
        </div>

        <h2>1. The Mathematics of Delta Neutralization</h2>
        <p>Because the borrower is long the underlying asset ($\\\\Delta > 0$), downward price movements compress equity. If the protocol can open an offsetting short perpetual futures position on HyperCore:</p>
        
        <div class="gb-math-card">
          <div class="gb-math-title">Net Delta Invariant</div>
          <div class="gb-math-formula">Δ_net = Q_collateral - S* ≈ 0</div>
        </div>

        <p>The total dollar value of the position becomes immune to further downside depreciation. The borrower is synthetically insulated, and the primary collateral remains completely untouched inside their vault.</p>

        <h2>2. Zero-Custody Delegation (Invariant INV-1)</h2>
        <p>AEGIS enforces strict non-custodial boundaries:</p>
        <ul>
          <li><strong>No Pool Sharing:</strong> Each user's collateral is isolated in their own non-custodial <code>AegisVault.sol</code> instance.</li>
          <li><strong>Trade-Only Scoping:</strong> Delegated Sentinel keys only possess permission to open or close matching short perpetuals on HyperCore. They cannot transfer, withdraw, or encumber underlying assets.</li>
          <li><strong>Instant Unilateral Killswitch:</strong> Borrowers can revoke Sentinel delegation in a single EVM transaction via <code>manualOverride()</code> (Invariant <strong>INV-3</strong>).</li>
        </ul>
      `
    },
    {
      id: 'system-overview',
      group: 'PART II: ARCHITECTURE',
      title: 'Three-Tier Protocol Stack',
      subtitle: 'Elysium Orbit L2 EVM security, Sentinel Keeper network, and HyperCore L1 matching engine.',
      prev: { id: 'hold-the-line', title: 'The "Hold the Line" Thesis' },
      next: { id: 'dual-mode-framework', title: 'Modular Dual-Mode Framework' },
      content: `
        <h2>1. Protocol Execution Layers</h2>
        <p>AEGIS unites three specialized layers into a unified autonomous execution loop:</p>

        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Layer</th><th>Components</th><th>Primary Function</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Elysium Orbit L2</strong></td>
                <td><code>AegisVault.sol</code>, <code>AegisFeeCollector.sol</code>, <code>AegisSentinelRegistry.sol</code></td>
                <td>Non-custodial collateral storage, EIP-712 nonces, 50/50 fee routing, and node bonding.</td>
              </tr>
              <tr>
                <td><strong>Sentinel Keeper Network</strong></td>
                <td>Continuous TypeScript / Rust keeper daemon</td>
                <td>Sub-100ms Multicall3 telemetry evaluation, dynamic hedge sizing, EIP-712 intent signing.</td>
              </tr>
              <tr>
                <td><strong>HyperCore L1 Engine</strong></td>
                <td>Hyperliquid L1 CLOB matching engine</td>
                <td>Sub-78ms match latency, synthetic short perpetuals, trailing take-profit unwinds.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>2. Canonical Testnet Deployments (Elysium L2 99801)</h2>
        <ul>
          <li><strong>AegisVault (Phase 1C):</strong> <code>0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e</code></li>
          <li><strong>RelayedOracleAdapter:</strong> <code>0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</code></li>
          <li><strong>AgentDispatchAdapter:</strong> <code>0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6</code></li>
          <li><strong>AegisFeeCollector:</strong> <code>0x8A791620dd6260079BF849Dc5567aDC3F2FdC318</code></li>
          <li><strong>AegisSentinelRegistry:</strong> <code>0x610178dA211FEF7D417bC0e6FeD39F05609AD788</code></li>
          <li><strong>Canonical Testnet USDC:</strong> <code>0x7D29d8047B905000459c0E80c34a26CeedcB47b2</code></li>
          <li><strong>Canonical Testnet WHYPE:</strong> <code>0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234</code></li>
        </ul>
      `
    },
    {
      id: 'dual-mode-framework',
      group: 'PART II: ARCHITECTURE',
      title: 'Modular Dual-Mode Framework',
      subtitle: 'Stock ArbOS adapter bridging today and zero-downtime hot-swap to native 0x0801/0x0802 precompiles.',
      prev: { id: 'system-overview', title: 'Three-Tier Protocol Stack' },
      next: { id: 'health-factor', title: 'Health Factor & Position Valuation' },
      content: `
        <div class="gb-callout gb-callout-warning">
          <div class="gb-callout-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">Stock ArbOS vs. Validator Hardfork</div>
            Elysium Testnet currently executes stock Arbitrum Nitro ArbOS. Precompiles 0x0801 and 0x0802 are pending the upcoming L2 hardfork. AEGIS operates seamlessly today using the Modular Dual-Mode Stack.
          </div>
        </div>

        <h2>1. Dual-Mode Execution Architecture</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Dimension</th><th>Mode 1: Stock ArbOS (Live Today)</th><th>Mode 2: Native Precompiles (Post-Hardfork)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Oracle Telemetry</strong></td>
                <td><code>RelayedOracleAdapter.sol</code> (120s/300s staleness checks)</td>
                <td><code>0x0801</code> Precompile (Direct EVM memory read, &lt;70ms latency)</td>
              </tr>
              <tr>
                <td><strong>Intent Dispatch</strong></td>
                <td><code>AgentDispatchAdapter.sol</code> (EVM log events to Sentinels)</td>
                <td><code>0x0802</code> Predeploy (Direct state-transition intent bridge)</td>
              </tr>
              <tr>
                <td><strong>User Vaults</strong></td>
                <td>Identical <code>AegisVault.sol</code> contract</td>
                <td>Identical <code>AegisVault.sol</code> contract (zero vault migration)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>2. Zero-Downtime Hot-Swap Guarantee</h2>
        <p>When validators activate the custom precompiles, governance calls <code>vault.setOracleAdapter()</code> and <code>vault.setDispatchAdapter()</code>. User collateral, debt balances, and session keys are 100% preserved without any migration transactions.</p>
      `
    },
    {
      id: 'health-factor',
      group: 'PART III: QUANTITATIVE MODELS',
      title: 'Health Factor & Position Valuation',
      subtitle: 'Continuous mathematical formulation of vault solvency and trigger thresholds.',
      prev: { id: 'dual-mode-framework', title: 'Modular Dual-Mode Framework' },
      next: { id: 'dynamic-sizing', title: 'Proportional Hedge Sizing (γ)' },
      content: `
        <h2>1. Mathematical Formulation</h2>
        <p>The instantaneous solvency of a borrower vault is defined as:</p>
        
        <div class="gb-math-card">
          <div class="gb-math-title">Health Factor (H) Formula</div>
          <div class="gb-math-formula">H = (Q_collateral × P_mark × L_threshold) / D_debt</div>
        </div>

        <p>Where:</p>
        <ul>
          <li><code>Q_collateral</code>: Amount of deposited spot collateral (e.g. WHYPE, scaled to 1e18).</li>
          <li><code>P_mark</code>: Instantaneous mark price provided by oracle adapter (scaled to 1e8).</li>
          <li><code>L_threshold</code>: Protocol liquidation threshold (default 0.85).</li>
          <li><code>D_debt</code>: Outstanding borrowed USDC debt (scaled to 1e6).</li>
        </ul>

        <h2>2. Operational Health Regimes</h2>
        <ul>
          <li><strong>Healthy (H > 1.25):</strong> Baseline monitoring. No hedging.</li>
          <li><strong>Warning (1.15 < H ≤ 1.25):</strong> Sentinel pre-flight checks and depth validation.</li>
          <li><strong>Hedge Active (1.05 < H ≤ 1.15):</strong> Autonomous short perpetual dispatched.</li>
          <li><strong>Critical (H ≤ 1.05):</strong> 100% full delta coverage. Complete insulation.</li>
        </ul>
      `
    },
    {
      id: 'dynamic-sizing',
      group: 'PART III: QUANTITATIVE MODELS',
      title: 'Proportional Hedge Sizing (γ)',
      subtitle: 'Dynamic sizing function balancing downside protection against funding rate drag.',
      prev: { id: 'health-factor', title: 'Health Factor & Position Valuation' },
      next: { id: 'trailing-unwind', title: 'Trailing Take-Profit Unwinds (τ)' },
      content: `
        <h2>1. The Target Short Size Formula</h2>
        <div class="gb-math-card">
          <div class="gb-math-title">Optimal Short Hedge Size (S*)</div>
          <div class="gb-math-formula">S* = γ(H) × (D_debt / P_mark)</div>
        </div>

        <h2>2. Dynamic Coverage Function γ(H)</h2>
        <p>To avoid over-hedging and unnecessary funding fees during minor market dips, coverage scales proportionally:</p>

        <div class="gb-math-card">
          <div class="gb-math-title">Coverage Ratio γ(H)</div>
          <div class="gb-math-formula">γ(H) = min(1.0, [(H_trigger - H) / (H_trigger - H_critical)] × γ_max)</div>
        </div>

        <p>For $H_{\\\\text{trigger}} = 1.15$ and $H_{\\\\text{critical}} = 1.05$, a slight dip to $H = 1.10$ hedges exactly 50% of debt, while a drop to $H = 1.05$ hedges 100%.</p>
      `
    },
    {
      id: 'trailing-unwind',
      group: 'PART III: QUANTITATIVE MODELS',
      title: 'Trailing Take-Profit Unwinds (τ)',
      subtitle: 'Locking in short perpetual profits to pay down debt and monotonically restore vault health.',
      prev: { id: 'dynamic-sizing', title: 'Proportional Hedge Sizing (γ)' },
      next: { id: 'deferred-fee-debt', title: 'Phase 1C Deferred Fee Debt Engine' },
      content: `
        <div class="gb-callout gb-callout-success">
          <div class="gb-callout-icon">📈</div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">Invariant INV-2: Monotonic Health Restoration</div>
            Hedges are only unwound when cash profits strictly improve the borrower's Health Factor ($H_{\\\\text{post}} > H_{\\\\text{pre}}$).
          </div>
        </div>

        <h2>1. The Trailing Threshold Reversal</h2>
        <p>The Sentinel daemon tracks the lowest price observed during the crash ($P_{\\\\text{min}}$). When price rebounds by trailing offset $\\\\tau = 1.5\\\\%$:</p>
        
        <div class="gb-math-card">
          <div class="gb-math-title">Unwind Rebound Condition</div>
          <div class="gb-math-formula">P_current ≥ P_min × (1 + τ)</div>
        </div>

        <h2>2. Debt Paydown & Equity Recovery</h2>
        <p>The short position is closed on HyperCore. The realized USDC profit pays down debt directly in <code>AegisVault.sol</code>, immediately lowering debt and raising the Health Factor.</p>
      `
    },
    {
      id: 'deferred-fee-debt',
      group: 'PART IV: RISK & SETTLEMENT',
      title: 'Phase 1C Deferred Fee Debt Engine',
      subtitle: 'Guaranteeing emergency hedge unwinds never revert due to zero borrower liquid stablecoins.',
      prev: { id: 'trailing-unwind', title: 'Trailing Take-Profit Unwinds (τ)' },
      next: { id: 'bonding-slashing', title: 'Node Staking & Slashing Guardrails' },
      content: `
        <div class="gb-callout gb-callout-important">
          <div class="gb-callout-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div class="gb-callout-body">
            <div class="gb-callout-title">Non-Blocking Unwind Invariant</div>
            If liquid USDC fee collection fails during a high-stress unwind, <code>AegisVault.sol</code> records the fee into <code>feeDebts[user]</code> instead of reverting. The unwind succeeds unconditionally.
          </div>
        </div>

        <h2>1. The Solidity Implementation</h2>
        <div class="gb-code-container">
          <div class="gb-code-header">
            <span>AegisVault.sol — Phase 1C Non-Blocking Settlement</span>
            <button class="gb-copy-btn" onclick="gbCopyCode(this)">Copy</button>
          </div>
          <div class="gb-code-body">
            <pre><code>// Non-blocking fee settlement logic
try feeCollector.collectFee(user, protocolFee) {
    // Liquid payment succeeded
} catch {
    // Record deferred fee debt without reverting
    feeDebts[user] += protocolFee;
    emit FeeDebtRecorded(user, protocolFee);
}</code></pre>
          </div>
        </div>

        <h2>2. Repayment Channels</h2>
        <ul>
          <li><strong>Voluntary:</strong> Borrowers can call <code>repayFeeDebt(uint256 amount)</code> at any time.</li>
          <li><strong>Withdrawal Gate:</strong> Collateral cannot be completely withdrawn until outstanding fee debt is cleared.</li>
        </ul>
      `
    },
    {
      id: 'bonding-slashing',
      group: 'PART V: SENTINEL NETWORK',
      title: 'Node Staking & Slashing Guardrails',
      subtitle: '25,000 $AEGIS bonding requirement, 10% maximum slashing cap, and 7-day cooldown.',
      prev: { id: 'deferred-fee-debt', title: 'Phase 1C Deferred Fee Debt Engine' },
      next: { id: 'eip712-boundaries', title: 'Non-Custodial Session Boundaries' },
      content: `
        <h2>1. Sentinel Node Requirements</h2>
        <ul>
          <li><strong>Minimum Bond:</strong> 25,000 $AEGIS tokens staked in <code>AegisSentinelRegistry.sol</code>.</li>
          <li><strong>Unbonding Timelock:</strong> 7-day cooldown period preventing unstaking during market turbulence.</li>
          <li><strong>Latency SLA:</strong> Heartbeats and intent submissions required within 500ms.</li>
        </ul>

        <h2>2. Slashing Guardrails</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Infraction</th><th>Slashing Rate</th><th>Penalty Recipient</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>SLA Latency Breach (>500ms)</td>
                <td>Up to 10% (1,000 bps)</td>
                <td>50% Burn / 50% Stakers</td>
              </tr>
              <tr>
                <td>Slippage Limit Breach</td>
                <td>10% (1,000 bps)</td>
                <td>Affected User Indemnity</td>
              </tr>
              <tr>
                <td>Unauthorized Signature</td>
                <td>10% (1,000 bps)</td>
                <td>Affected User Indemnity</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    },
    {
      id: 'eip712-boundaries',
      group: 'PART V: SENTINEL NETWORK',
      title: 'Non-Custodial Session Boundaries',
      subtitle: 'Trade-only EIP-712 structured data signing and monotonic sequential nonces (INV-5).',
      prev: { id: 'bonding-slashing', title: 'Node Staking & Slashing Guardrails' },
      next: { id: 'supply-flywheel', title: 'Hard-Capped Supply & Burn Flywheel' },
      content: `
        <h2>1. Cryptographic EIP-712 Boundaries</h2>
        <p>Borrowers delegate session keys scoped strictly to trading actions. Keys possess zero balance transfer authority:</p>
        
        <div class="gb-code-container">
          <div class="gb-code-header">
            <span>EIP-712 Typed Data Intent Schema</span>
            <button class="gb-copy-btn" onclick="gbCopyCode(this)">Copy</button>
          </div>
          <div class="gb-code-body">
            <pre><code>const types = {
  TradeIntent: [
    { name: "vault", type: "address" },
    { name: "perpIndex", type: "uint32" },
    { name: "isShort", type: "bool" },
    { name: "size", type: "uint64" },
    { name: "limitPrice", type: "uint64" },
    { name: "nonce", type: "uint64" },
    { name: "expiry", type: "uint64" }
  ]
};</code></pre>
          </div>
        </div>

        <h2>2. Invariant INV-5: Anti-Replay Nonces</h2>
        <p>Sequential per-vault nonces guarantee that orders cannot be replayed, front-run, or executed out-of-order across blocks.</p>
      `
    },
    {
      id: 'supply-flywheel',
      group: 'PART VI: TOKENOMICS',
      title: 'Hard-Capped Supply & Burn Flywheel',
      subtitle: '700,000,000 $AEGIS fixed cap, counter-cyclical burning, and 50/50 fee conservation.',
      prev: { id: 'eip712-boundaries', title: 'Non-Custodial Session Boundaries' },
      next: { id: 'invariants', title: 'Security Invariants (INV-1 to INV-5)' },
      content: `
        <div style="border-left: 3px solid var(--hedge); padding: 12px 16px; margin: 0 0 20px; background: color-mix(in srgb, var(--hedge) 8%, var(--raised)); border-radius: 8px; font-size: 13.5px; line-height: 1.5;">
          <strong style="color: var(--hedge); display: block; margin-bottom: 4px;">Protocol Roadmap Notice (Phase 3 Integration):</strong>
          Throughout the active Elysium testnet phase and initial V1 launch, <strong>AEGIS operates strictly as a lean, pure autonomous delta-hedging engine</strong>. Staking, real yield distribution, and fee buyback-and-burn mechanisms are on the protocol <strong>Roadmap (Phase 3)</strong> and are not active in V1. Active testnet testers and mainnet hedgers accumulate Phase 1 (10%) and Phase 2 (15%) Points, converting 100% unlocked at Ascend TGE.
        </div>

        <h2>1. Fixed Hard Cap & Value Capture</h2>
        <ul>
          <li><strong>Total Supply:</strong> 700,000,000 $AEGIS tokens. Zero inflationary minting capability in smart contracts.</li>
          <li><strong>Initial Day-1 Float:</strong> 245,000,000 $AEGIS (35.0%) — 100% community-owned with zero VC or team float.</li>
          <li><strong>Team Alignment:</strong> Strict 24-month hard cliff; zero contributor tokens unlock until Month 25.</li>
        </ul>

        <h2>2. Visual Token Allocation (700M Hard Cap)</h2>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin: 20px 0; padding: 20px; background: var(--raised); border: 1px solid var(--rule); border-radius: 12px;">
          <div style="position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 200 200" width="200" height="200" style="transform: rotate(-90deg);">
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--rule)" stroke-width="30" opacity="0.25"></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--accent)" stroke-width="30" stroke-dasharray="43.98 395.84" stroke-dashoffset="0"><title>Phase 1 Testnet Points: 10.0% (70M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="color-mix(in srgb, var(--accent) 70%, #fff)" stroke-width="30" stroke-dasharray="65.97 373.85" stroke-dashoffset="-43.98"><title>Phase 2 Mainnet Points: 15.0% (105M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="color-mix(in srgb, var(--accent) 45%, var(--violet))" stroke-width="30" stroke-dasharray="43.98 395.84" stroke-dashoffset="-109.95"><title>Ascend Fair Launch: 10.0% (70M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--violet)" stroke-width="30" stroke-dasharray="87.96 351.86" stroke-dashoffset="-153.93"><title>kHYPE Liquid Staking: 20.0% (140M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--hedge)" stroke-width="30" stroke-dasharray="65.97 373.85" stroke-dashoffset="-241.89"><title>Ascend LP Incentives: 15.0% (105M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--danger)" stroke-width="30" stroke-dasharray="52.78 387.04" stroke-dashoffset="-307.86"><title>Protocol Security: 12.0% (84M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--ink-2)" stroke-width="30" stroke-dasharray="43.98 395.84" stroke-dashoffset="-360.64"><title>Core Team: 10.0% (70M $AEGIS)</title></circle>
              <circle cx="100" cy="100" r="70" fill="none" stroke="color-mix(in srgb, var(--violet) 40%, var(--rule))" stroke-width="30" stroke-dasharray="35.19 404.63" stroke-dashoffset="-404.62"><title>Strategic & Audits: 8.0% (56M $AEGIS)</title></circle>
            </svg>
            <div style="position: absolute; text-align: center; pointer-events: none;">
              <div style="font-family: var(--display); font-size: 22px; font-weight: 700; color: var(--ink);">700M</div>
              <div style="font-size: 10px; color: var(--accent); font-weight: 600; text-transform: uppercase;">$AEGIS CAP</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; width: 100%; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex-shrink: 0;"></span><span><strong>10.0%</strong> — Phase 1 Testnet Points (70M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 70%, #fff); flex-shrink: 0;"></span><span><strong>15.0%</strong> — Phase 2 Mainnet Points (105M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 45%, var(--violet)); flex-shrink: 0;"></span><span><strong>10.0%</strong> — Ascend Fair Launch (70M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: var(--violet); flex-shrink: 0;"></span><span><strong>20.0%</strong> — kHYPE Liquid Staking (140M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: var(--hedge); flex-shrink: 0;"></span><span><strong>15.0%</strong> — Ascend LP Incentives (105M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: var(--danger); flex-shrink: 0;"></span><span><strong>12.0%</strong> — Protocol Security (84M)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: var(--ink-2); flex-shrink: 0;"></span><span><strong>10.0%</strong> — Core Team (70M · 24m Cliff)</span></div>
            <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: color-mix(in srgb, var(--violet) 40%, var(--rule)); flex-shrink: 0;"></span><span><strong>8.0%</strong> — Strategic & Audits (56M)</span></div>
          </div>
        </div>

        <h2>3. Strategic Supply Matrix</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead><tr><th>Category</th><th>Share</th><th>Amount</th><th>TGE</th><th>Vesting</th></tr></thead>
            <tbody>
              <tr><td><strong>Phase 1: Testnet Points</strong></td><td>10.0%</td><td>70,000,000</td><td>100% (70M)</td><td>100% at TGE</td></tr>
              <tr><td><strong>Phase 2: Mainnet Points</strong></td><td>15.0%</td><td>105,000,000</td><td>100% (105M)</td><td>100% at TGE</td></tr>
              <tr><td><strong>Ascend Fair Launch</strong></td><td>10.0%</td><td>70,000,000</td><td>100% (70M)</td><td>100% at TGE</td></tr>
              <tr><td><strong>kHYPE Liquid Staking</strong></td><td>20.0%</td><td>140,000,000</td><td>0.0%</td><td>24m linear</td></tr>
              <tr><td><strong>Ascend LP Incentives</strong></td><td>15.0%</td><td>105,000,000</td><td>0.0%</td><td>36m linear</td></tr>
              <tr><td><strong>Protocol Security Reserve</strong></td><td>12.0%</td><td>84,000,000</td><td>0.0%</td><td>12m cliff, 36m linear</td></tr>
              <tr><td><strong>Core Contributors & Team</strong></td><td>10.0%</td><td>70,000,000</td><td>0.0%</td><td>24m cliff, 36m linear</td></tr>
              <tr><td><strong>Strategic & Audits</strong></td><td>8.0%</td><td>56,000,000</td><td>0.0%</td><td>12m cliff, 24m linear</td></tr>
            </tbody>
          </table>
        </div>

        <h2>4. Counter-Cyclical Deflationary Flywheel</h2>
        <p>During market crashes, traditional protocols suffer insolvency. AEGIS executes hedges, averts liquidation losses, and captures a 10% performance fee.</p>

        <div class="gb-math-card">
          <div class="gb-math-title">Strict Fee Conservation (INV-4)</div>
          <div class="gb-math-formula">Fee_total = Burn_50% + Yield_50%</div>
        </div>

        <p>50% is routed to Ascend Hook Pools to buy and burn $AEGIS permanently; 50% is distributed to bonded Sentinel stakers in USDC *(Phase 3 Roadmap)*.</p>
      `
    },
    {
      id: 'invariants',
      group: 'PART VII: FORMAL VERIFICATION',
      title: 'Security Invariants (INV-1 to INV-5)',
      subtitle: 'Formal verification proofs and mathematical bounds fuzzed across 160,000+ Foundry runs.',
      prev: { id: 'supply-flywheel', title: 'Hard-Capped Supply & Burn Flywheel' },
      next: { id: 'scorecard', title: 'Automated Test Suite Scorecard (157/157)' },
      content: `
        <h2>1. The Five Core Invariants</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Invariant</th><th>Mathematical Definition</th><th>Solidity Proof</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>INV-1: Non-Custodial</strong></td>
                <td>ΔQ_vault = 0 for delegated calls</td>
                <td>Zero transfer or approve bytecode reachable by session key.</td>
              </tr>
              <tr>
                <td><strong>INV-2: Monotonic Health</strong></td>
                <td>H_post > H_pre upon unwind</td>
                <td>Unwinds only execute at profitable trailing take-profit levels.</td>
              </tr>
              <tr>
                <td><strong>INV-3: Killswitch</strong></td>
                <td>Session key revoked in 1 tx</td>
                <td><code>manualOverride()</code> unilaterally resets session key.</td>
              </tr>
              <tr>
                <td><strong>INV-4: Fee Conservation</strong></td>
                <td>Fee = Burn_50% + Yield_50%</td>
                <td><code>AegisFeeCollector.sol</code> splits 100% of revenue symmetrically.</td>
              </tr>
              <tr>
                <td><strong>INV-5: Anti-Replay</strong></td>
                <td>Nonce_t+1 = Nonce_t + 1</td>
                <td>EIP-712 sequential nonces per user vault.</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    },
    {
      id: 'scorecard',
      group: 'PART VII: FORMAL VERIFICATION',
      title: 'Automated Test Suite Scorecard (157/157)',
      subtitle: '100% pass rate across 14 Foundry suites, 5 Keeper suites, and 6 Truthfulness suites.',
      prev: { id: 'invariants', title: 'Security Invariants (INV-1 to INV-5)' },
      next: { id: 'milestones', title: 'From Testnet Alpha to Mainnet Genesis' },
      content: `
        <h2>1. Automated Verification Scorecard</h2>
        <div class="gb-table-wrap">
          <table class="gb-table">
            <thead>
              <tr><th>Test Suite Category</th><th>Test Count</th><th>Tooling</th><th>Pass Rate</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Foundry Smart Contract Unit Tests</strong></td>
                <td>45 tests</td>
                <td>Foundry (<code>forge test</code>)</td>
                <td>100% PASS</td>
              </tr>
              <tr>
                <td><strong>Formal Invariant Fuzzing (INV-1 to 5)</strong></td>
                <td>70 tests (160k+ runs)</td>
                <td>Foundry (Fuzz Engine)</td>
                <td>100% PASS</td>
              </tr>
              <tr>
                <td><strong>Sentinel Keeper Daemon Suites</strong></td>
                <td>29 tests</td>
                <td>Jest / TypeScript</td>
                <td>100% PASS</td>
              </tr>
              <tr>
                <td><strong>Frontend Truthfulness & Live RPC</strong></td>
                <td>13 tests</td>
                <td>Node.js / Ethers (Chain 99801)</td>
                <td>100% PASS</td>
              </tr>
              <tr>
                <td><strong>TOTAL VERIFIED SUITES</strong></td>
                <td><strong>157 TESTS</strong></td>
                <td><strong>Continuous CI/CD</strong></td>
                <td><strong>100% PASS</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>2. Local Reproduction</h2>
        <div class="gb-code-container">
          <div class="gb-code-header">
            <span>Reproduce All 157 Tests Locally</span>
            <button class="gb-copy-btn" onclick="gbCopyCode(this)">Copy</button>
          </div>
          <div class="gb-code-body">
            <pre><code># Foundry tests
forge test

# Keeper tests
cd keeper && npm test && cd ..

# Live RPC Truthfulness
node test/test_frontend_truthfulness.js</code></pre>
          </div>
        </div>
      `
    },
    {
      id: 'milestones',
      group: 'PART VIII: PROTOCOL ROADMAP',
      title: 'From Testnet Alpha to Mainnet Genesis',
      subtitle: 'Four-phase operational roadmap from testnet activation through precompile hardfork.',
      prev: { id: 'scorecard', title: 'Automated Test Suite Scorecard (157/157)' },
      next: null,
      content: `
        <div style="border-left: 3px solid var(--accent); padding: 12px 16px; margin: 0 0 20px; background: color-mix(in srgb, var(--accent) 8%, var(--raised)); border-radius: 8px; font-size: 13.5px; line-height: 1.5;">
          <strong style="color: var(--accent); display: block; margin-bottom: 4px;">V1 Architecture Strategy: Pure Autonomous Delta Hedging</strong>
          Throughout the active Elysium testnet phase and V1 Mainnet Genesis, <strong>AEGIS is laser-focused on pure autonomous delta hedging</strong> for tokens with perpetual orderbooks on HyperCore, borrowers on Elysium, and tokens ascending from the Ascend Launchpad to HyperCore perpetual sessions. All staking contracts, fee collector distribution, and tokenomics yield mechanics are scheduled on our future roadmap (Phase 3).
        </div>

        <h2>Phase 1: Testnet Alpha (Active Today) — Pure Autonomous Hedging</h2>
        <ul>
          <li><strong>Core Non-Custodial Vault:</strong> Deployed lean <code>AegisVault.sol</code> on Elysium Orbit L2 Testnet (Chain ID <code>99801</code>).</li>
          <li><strong>HyperCore Sub-Second Execution:</strong> Real-time L1 CLOB order routing with sub-150ms execution latency.</li>
          <li><strong>Live Mainnet Price Telemetry:</strong> Real-time mark price resolution against live Hyperliquid orderbook data.</li>
          <li><strong>Ascend-to-HyperCore Token Hedging:</strong> Automated delta defense for WHYPE, WETH, and tokens that have ascended from Ascend Launchpad to HyperCore perpetual orderbooks.</li>
          <li><strong>Non-Custodial Invariants (INV-1 to INV-5):</strong> Trade-only session keys with zero collateral withdrawal capability verified across 160,000+ fuzz runs.</li>
          <li><strong>Dynamic Bottom-Wick Tracking:</strong> Continuous trough ratcheting with automated trailing take-profit unwinds.</li>
        </ul>

        <h2>Phase 2: Mainnet Genesis — Production Hedging Engine</h2>
        <ul>
          <li><strong>Targeted Security Audit:</strong> Focused, cost-efficient audit strictly covering the core non-custodial vault and session key delegation.</li>
          <li><strong>Ecosystem Grant Alignment:</strong> Collaboration with Elysium / Kinetiq ecosystem grant programs for security sponsorship.</li>
          <li><strong>Mainnet Launch on Elysium L2:</strong> Live autonomous liquidation protection for native WHYPE, WETH, WBTC, and top ascended ecosystem tokens.</li>
          <li><strong>Borrower Protection Integrations:</strong> Seamless risk defense for Elysium money market borrowers and leverage traders.</li>
        </ul>

        <h2>Phase 3: Future Roadmap — Yield & Staking Flywheel</h2>
        <ul>
          <li><strong>$AEGIS Token Deployment:</strong> Hard-capped supply of 700,000,000 $AEGIS with anti-dilutive economics and 35.0% Day-1 community float.</li>
          <li><strong>Decentralized Sentinel Bonding:</strong> Bonded node operator network with 25,000 $AEGIS stake requirements.</li>
          <li><strong>Ascend Closed Hook Pool Buyback & Burn:</strong> Programmatic routing of performance fees into Ascend AMM pools to burn $AEGIS.</li>
          <li><strong>Real-Yield Staking Distribution:</strong> Canonical USDC yield distribution to bonded node operators.</li>
        </ul>

        <h2>Phase 4: Future Roadmap — Precompiles & Multi-Asset SDKs</h2>
        <ul>
          <li><strong>Native ArbOS Precompile Activation:</strong> Validator activation of custom precompiles <code>0x0801</code> and <code>0x0802</code> for sub-70ms zero-gas EVM reads.</li>
          <li><strong>Cross-Margin Portfolio Delta Hedging:</strong> Unified account risk netting across multiple collateral positions.</li>
          <li><strong>Lending Protocol Risk SDK:</strong> Direct plug-and-play risk module for new money markets launching on Elysium.</li>
        </ul>
      `
    }
  ];

  // --- 2. APPLICATION STATE ---
  let activeChapterId = 'abstract';
  let isSearchModalOpen = false;

  // --- 3. DOM ELEMENTS ---
  const el = {
    root: document.documentElement,
    themeBtn: document.getElementById('themeToggleBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileBackdrop: document.getElementById('mobileBackdrop'),
    sidebar: document.getElementById('sidebarNav'),
    sidebarLinks: document.getElementById('sidebarLinks'),
    breadcrumbs: document.getElementById('breadcrumbs'),
    pageTitle: document.getElementById('pageTitle'),
    pageSubtitle: document.getElementById('pageSubtitle'),
    chapterContent: document.getElementById('chapterContent'),
    pageNav: document.getElementById('pageNav'),
    tocList: document.getElementById('tocList'),
    searchTrigger: document.getElementById('searchTrigger'),
    searchModalBackdrop: document.getElementById('searchModalBackdrop'),
    searchModalInput: document.getElementById('searchModalInput'),
    searchResults: document.getElementById('searchResults'),
    closeSearchBtn: document.getElementById('closeSearchBtn')
  };

  // --- 4. THEME MANAGEMENT ---
  function initTheme() {
    const saved = localStorage.getItem('aegis-gitbook-theme') || 'dark';
    applyTheme(saved);

    el.themeBtn.addEventListener('click', () => {
      const current = el.root.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  function applyTheme(theme) {
    el.root.setAttribute('data-theme', theme);
    localStorage.setItem('aegis-gitbook-theme', theme);
  }

  // --- 5. RENDER SIDEBAR NAVIGATION ---
  function renderSidebar() {
    const groups = {};
    CHAPTERS.forEach(ch => {
      if (!groups[ch.group]) groups[ch.group] = [];
      groups[ch.group].push(ch);
    });

    let html = '';
    for (const [groupName, items] of Object.entries(groups)) {
      html += `
        <div class="gb-sidebar-group">
          <div class="gb-sidebar-group-title">${groupName}</div>
          <ul class="gb-sidebar-list">
            ${items.map(item => `
              <li class="gb-sidebar-item ${item.id === activeChapterId ? 'active' : ''}" data-id="${item.id}">
                <a href="#${item.id}" class="gb-sidebar-link" onclick="window.gbNavigate('${item.id}')">
                  <span>${item.title}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    el.sidebarLinks.innerHTML = html;
  }

  // --- 6. RENDER CHAPTER ---
  function renderChapter(id) {
    const chapter = CHAPTERS.find(c => c.id === id) || CHAPTERS[0];
    activeChapterId = chapter.id;

    // Document Title
    document.title = `${chapter.title} | AEGIS Lightpaper GitBook`;

    // Breadcrumbs
    el.breadcrumbs.innerHTML = `
      <a href="#abstract" onclick="window.gbNavigate('abstract')">Lightpaper</a>
      <span class="gb-breadcrumb-sep">/</span>
      <span>${chapter.group}</span>
      <span class="gb-breadcrumb-sep">/</span>
      <span style="color:var(--ink);">${chapter.title}</span>
    `;

    // Header
    el.pageTitle.textContent = chapter.title;
    el.pageSubtitle.textContent = chapter.subtitle;

    // Body Content
    el.chapterContent.innerHTML = chapter.content;

    // Previous / Next Cards
    let navHtml = '';
    if (chapter.prev) {
      navHtml += `
        <a href="#${chapter.prev.id}" class="gb-nav-card prev" onclick="window.gbNavigate('${chapter.prev.id}')">
          <span class="gb-nav-label">← Previous</span>
          <span class="gb-nav-title">${chapter.prev.title}</span>
        </a>
      `;
    }
    if (chapter.next) {
      navHtml += `
        <a href="#${chapter.next.id}" class="gb-nav-card next" onclick="window.gbNavigate('${chapter.next.id}')">
          <span class="gb-nav-label">Next →</span>
          <span class="gb-nav-title">${chapter.next.title}</span>
        </a>
      `;
    }
    el.pageNav.innerHTML = navHtml;

    // Build Right-Hand TOC
    buildToc();

    // Update Sidebar Active state
    document.querySelectorAll('.gb-sidebar-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-id') === activeChapterId);
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Close mobile drawer if open
    closeMobileMenu();
  }

  // --- 7. RIGHT TABLE OF CONTENTS ---
  function buildToc() {
    const headings = el.chapterContent.querySelectorAll('h2, h3');
    if (headings.length === 0) {
      el.tocList.innerHTML = '<li class="gb-toc-item" style="color:var(--ink-2); font-size:12px;">Overview</li>';
      return;
    }

    let tocHtml = '';
    headings.forEach((h, idx) => {
      const headingId = 'heading-' + idx;
      h.id = headingId;
      const isSub = h.tagName.toLowerCase() === 'h3';
      tocHtml += `
        <li class="gb-toc-item" style="${isSub ? 'padding-left:12px;' : ''}">
          <a href="#${headingId}" class="gb-toc-link" onclick="window.gbScrollToHeading(event, '${headingId}')">${h.textContent}</a>
        </li>
      `;
    });

    el.tocList.innerHTML = tocHtml;
  }

  window.gbScrollToHeading = function (e, id) {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- 8. GLOBAL INSTANT SEARCH ENGINE ---
  function initSearch() {
    el.searchTrigger.addEventListener('click', openSearchModal);
    el.closeSearchBtn.addEventListener('click', closeSearchModal);
    el.searchModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.searchModalBackdrop) closeSearchModal();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearchModal();
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        closeSearchModal();
      }
    });

    el.searchModalInput.addEventListener('input', (e) => {
      executeSearch(e.target.value.trim());
    });
  }

  function openSearchModal() {
    isSearchModalOpen = true;
    el.searchModalBackdrop.classList.add('open');
    el.searchModalInput.value = '';
    executeSearch('');
    setTimeout(() => el.searchModalInput.focus(), 50);
  }

  function closeSearchModal() {
    isSearchModalOpen = false;
    el.searchModalBackdrop.classList.remove('open');
  }

  function executeSearch(query) {
    if (!query) {
      el.searchResults.innerHTML = CHAPTERS.slice(0, 6).map(ch => `
        <li class="gb-search-result-item">
          <a href="#${ch.id}" onclick="window.gbNavigate('${ch.id}'); window.gbCloseSearch();">
            <div class="gb-result-meta">${ch.group}</div>
            <div class="gb-result-title">${ch.title}</div>
            <div class="gb-result-excerpt">${ch.subtitle}</div>
          </a>
        </li>
      `).join('');
      return;
    }

    const q = query.toLowerCase();
    const hits = [];

    CHAPTERS.forEach(ch => {
      const titleMatch = ch.title.toLowerCase().includes(q);
      const subMatch = ch.subtitle.toLowerCase().includes(q);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = ch.content;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      const textIdx = text.toLowerCase().indexOf(q);

      if (titleMatch || subMatch || textIdx !== -1) {
        let excerpt = ch.subtitle;
        if (textIdx !== -1) {
          const start = Math.max(0, textIdx - 40);
          const end = Math.min(text.length, textIdx + 80);
          excerpt = '...' + text.slice(start, end).replace(new RegExp(q, 'gi'), m => `<strong>${m}</strong>`) + '...';
        }
        hits.push({ ch, excerpt, score: (titleMatch ? 10 : 0) + (subMatch ? 5 : 0) + (textIdx !== -1 ? 2 : 0) });
      }
    });

    hits.sort((a, b) => b.score - a.score);

    if (hits.length === 0) {
      el.searchResults.innerHTML = `
        <li style="padding: 24px; text-align: center; color: var(--ink-2); font-size: 14px;">
          No Lightpaper matches found for "<strong>${escapeHtml(query)}</strong>"
        </li>
      `;
      return;
    }

    el.searchResults.innerHTML = hits.map(hit => `
      <li class="gb-search-result-item">
        <a href="#${hit.ch.id}" onclick="window.gbNavigate('${hit.ch.id}'); window.gbCloseSearch();">
          <div class="gb-result-meta">${hit.ch.group}</div>
          <div class="gb-result-title">${hit.ch.title}</div>
          <div class="gb-result-excerpt">${hit.excerpt}</div>
        </a>
      </li>
    `).join('');
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // --- 9. MOBILE MENU ---
  function initMobileMenu() {
    el.mobileMenuBtn.addEventListener('click', () => {
      el.sidebar.classList.toggle('open');
      el.mobileBackdrop.classList.toggle('open');
    });

    el.mobileBackdrop.addEventListener('click', closeMobileMenu);
  }

  function closeMobileMenu() {
    el.sidebar.classList.remove('open');
    el.mobileBackdrop.classList.remove('open');
  }

  // --- 10. GLOBAL NAVIGATION API ---
  window.gbNavigate = function (id) {
    window.location.hash = '#' + id;
    renderChapter(id);
  };

  window.gbCloseSearch = closeSearchModal;

  window.gbCopyCode = function (btn) {
    const pre = btn.closest('.gb-code-container').querySelector('code');
    if (!pre) return;
    navigator.clipboard.writeText(pre.innerText).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      setTimeout(() => {
        btn.textContent = orig;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    });
  };

  // --- 11. HASH ROUTING ---
  function handleHash() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      renderChapter('abstract');
    } else {
      const match = CHAPTERS.find(c => c.id === hash);
      if (match) renderChapter(match.id);
      else renderChapter('abstract');
    }
  }

  window.addEventListener('hashchange', handleHash);

  // --- 12. INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderSidebar();
    initSearch();
    initMobileMenu();
    handleHash();
  });

})();
