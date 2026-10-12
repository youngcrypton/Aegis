/**
 * AEGIS Documentation Platform — Client-Side Engine
 * Search, Router, Scroll-Spy, Table of Contents, Theme Synchronization
 */

(function () {
 'use strict';

 // --- 1. DOCUMENTATION REGISTRY & CONTENT DATABASE ---
 const DOCS_DATA = [
 // PART I: INTRODUCTION
 {
 id: 'welcome',
 category: 'Introduction',
 tag: 'CORE',
 title: 'Welcome to AEGIS',
 subtitle: 'The non-custodial risk engine and collateral protection protocol for Elysium L2 and HyperCore.',
 prev: null,
 next: { id: 'problem-forced-liquidation', title: 'The Problem: Forced Liquidation' },
 content: `
 <div class="docs-section">
 <h2>1. Mission & Philosophy</h2>
 <p>AEGIS is a decentralized risk engine designed to insulate leveraged traders, collateralized borrowers, and liquidity providers from the destructive consequences of forced liquidation. The core operational mantra of the protocol is simple and uncompromising:</p>
 <div class="callout callout-important">
 <div class="callout-icon">[INFO]</div>
 <div class="callout-body">
 <div class="callout-title">Core Protocol Axiom: "Hold the Line"</div>
 Traditional lending protocols enforce solvency through abrupt, irreversible collateral auctions that strip users of assets at fire-sale discounts. AEGIS introduces an autonomous synthetic hedging barrier that dynamically stabilizes positions <em>before</em> liquidation thresholds are breached.
 </div>
 </div>
 <p>Rather than liquidating and selling underlying spot collateral into thin order books, AEGIS relies on high-speed autonomous Sentinel nodes to open counterbalancing short perpetual futures contracts on <strong>HyperCore</strong> (Hyperliquid's L1 high-frequency matching engine). Net directional delta exposure is neutralized while the borrower's collateral remains locked inside their primary vault under zero-custody delegation.</p>

 <h2>2. How to Read This Documentation</h2>
 <p>This technical knowledge base is organized progressively from foundational DeFi mechanics through advanced financial engineering, smart contract interfaces, node operations, and formal verification proofs:</p>
 <ul>
 <li><strong>Part I: Introduction</strong> — High-level problem definition, economic motivation, protocol architecture overview, core glossary, and frequently asked questions.</li>
 <li><strong>Part II: Core Concepts</strong> — Deep dive into collateral dynamics, directional delta risk, liquidation buffers, session keys, and the 14-stage hedge lifecycle.</li>
 <li><strong>Part III: Protocol Mechanics</strong> — Concrete operational flow from synchronous 100ms market monitoring to sub-second intent execution and trailing profit unwinds.</li>
 <li><strong>Part IV: Mathematical Specifications</strong> — Rigorous formal definitions of Health Factor ($H$), coverage ratio ($\gamma$), trailing unwind parameter ($\tau$), and worked numerical quant models.</li>
 <li><strong>Part V: Smart Contract Architecture</strong> — Specifications and interface definitions for <code>AegisVault.sol</code>, <code>AegisSentinelRegistry.sol</code>, <code>AegisFeeCollector.sol</code>, Precompile <code>0x0801</code>, and Predeploy <code>0x0802</code>.</li>
 <li><strong>Part VI: Sentinel Node Operations</strong> — Hardware specifications, 25,000 $AEGIS bonding requirements, latency SLAs, and slashing penalties.</li>
 <li><strong>Part VII: Security Model & Invariants</strong> — Formal verification invariants (INV-1 through INV-5), trust assumptions, attack surface analysis, and residual market risks.</li>
 <li><strong>Part VIII: Developer Integration</strong> — Step-by-step code samples using Ethers.js and Viem for querying health factors, delegating session keys, and dispatching orders.</li>
 </ul>

 <div class="callout callout-note">
 <div class="callout-icon">ℹ️</div>
 <div class="callout-body">
 <div class="callout-title">Brand and Specification Integrity Note</div>
 In accordance with <code>AGENTS.md</code> and the authoritative AEGIS brand kit (<code>brand/kit/tokens.css</code>), this documentation maintains strict dual-theme accessibility (Light and Dark modes) and relies solely on vetted tokens. Open brand decisions (wordmark capitalization "Aegis" vs "AEGIS" and navy token nuances) remain active items subject to community governance.
 </div>
 </div>
 </div>
 `
 },
 {
 id: 'problem-forced-liquidation',
 category: 'Introduction',
 tag: 'CORE',
 title: 'The Problem: Forced Liquidation',
 subtitle: 'Why traditional liquidation auctions destroy user capital and trigger catastrophic cascade failures in DeFi.',
 prev: { id: 'welcome', title: 'Welcome to AEGIS' },
 next: { id: 'aegis-approach', title: 'The AEGIS Approach' },
 content: `
 <div class="docs-section">
 <h2>1. Mechanics of Liquidation Risk</h2>
 <p>In debt-based decentralized financial systems (such as collateralized debt positions, lending pools, and margin venues), a borrower deposits volatile crypto assets $C$ to borrow a stable asset $D$ (typically USDC). Because crypto assets undergo extreme short-term drawdowns, protocols require overcollateralization:</p>
 <div class="math-card">
 <div class="math-title">Standard Loan-to-Value (LTV) Invariant</div>
 <div class="math-formula">LTV = \\frac{D_{\\text{debt}}}{Q_{\\text{collateral}} \\times P_{\\text{collateral}}} \\le LTV_{\\text{max}}</div>
 </div>
 <p>When market drawdowns compress collateral value $P_{\\text{collateral}}$, the Loan-to-Value ratio escalates. Once it crosses the protocol's <strong>Liquidation Threshold ($T_{\\text{liq}}$)</strong>, the loan enters an under-margined state.</p>

 <h2>2. The Destruction of Collateral via Liquidations</h2>
 <p>When an existing protocol liquidates a borrower, it invokes a third-party liquidation keeper to eliminate the bad debt. This process creates severe negative externalities for the borrower:</p>
 <ul>
 <li><strong>Penalties (5% to 10% Surcharge)</strong>: The liquidator receives an immediate bonus penalty deducted directly from user collateral. For a $100,000 position, a 10% penalty instantly destroys $10,000 of equity.</li>
 <li><strong>Market Dumping at Market Bottoms</strong>: Liquidators immediately sell seized spot collateral onto Automated Market Makers (AMMs) or centralized books, realizing permanent losses precisely when the asset is undervalued.</li>
 <li><strong>MEV and Liquidation Cascades</strong>: MEV searchers bribe validators to extract arbitrage from collateral liquidation transactions, creating systemic cascade cascades that trigger secondary liquidations across the network.</li>
 </ul>

 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr>
 <th>Mechanic</th>
 <th>Traditional Liquidation</th>
 <th>AEGIS Delta-Hedging</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td><strong>Collateral Disposition</strong></td>
 <td>Forcibly sold/dumped on market</td>
 <td>100% retained inside user vault</td>
 </tr>
 <tr>
 <td><strong>Penalty Loss</strong></td>
 <td>5% to 10% direct penalty loss</td>
 <td>0% liquidation penalty incurred</td>
 </tr>
 <tr>
 <td><strong>Execution Venue</strong></td>
 <td>Spot DEX / AMM swap</td>
 <td>HyperCore Perpetual Futures CLOB</td>
 </tr>
 <tr>
 <td><strong>Custody Model</strong></td>
 <td>Full custody transfer to liquidator</td>
 <td>Non-custodial trade-only session key</td>
 </tr>
 <tr>
 <td><strong>Rebound Participation</strong></td>
 <td>0% (collateral is permanently gone)</td>
 <td>High (hedge unwinds, restoring upside)</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 `
 },
 {
 id: 'aegis-approach',
 category: 'Introduction',
 tag: 'CORE',
 title: 'The AEGIS Approach',
 subtitle: 'Dynamic perpetual delta-hedging to neutralize downside exposure without liquidating collateral.',
 prev: { id: 'problem-forced-liquidation', title: 'The Problem: Forced Liquidation' },
 next: { id: 'core-principles', title: 'Core Principles & Security Invariants' },
 content: `
 <div class="docs-section">
 <h2>1. Synthetic Downside Neutralization</h2>
 <p>AEGIS replaces destructive spot liquidation auctions with automated derivative hedging. When an open position approaches distress, an autonomous Sentinel node programmatically executes a short perpetual contract on HyperCore matching the exact asset and delta coverage ratio desired by the borrower.</p>
 
 <div class="diagram-container">
 <div class="diagram-header">
 <div class="diagram-title">System Execution Topology</div>
 <div class="diagram-desc">Synchronous precompile state reads on Elysium coupled with sub-second trade intent execution on HyperCore.</div>
 </div>
 <div class="diagram-svg-wrap">
 <svg viewBox="0 0 760 220" fill="none" xmlns="http://www.w3.org/2000/svg">
 <!-- User Vault -->
 <rect x="20" y="30" width="180" height="160" rx="12" fill="var(--raised)" stroke="var(--rule)" stroke-width="1.5"/>
 <text x="110" y="65" text-anchor="middle" fill="var(--ink)" font-family="var(--display)" font-size="16">User Vault</text>
 <text x="110" y="90" text-anchor="middle" fill="var(--ink-2)" font-size="12">Collateral: 1,000 HYPE</text>
 <text x="110" y="110" text-anchor="middle" fill="var(--ink-2)" font-size="12">Debt: $32,000 USDC</text>
 <rect x="40" y="130" width="140" height="32" rx="6" fill="var(--ground)" stroke="var(--rule)"/>
 <text x="110" y="151" text-anchor="middle" fill="var(--accent)" font-weight="600" font-size="11">Session Key Delegated</text>

 <!-- Arrow to Elysium -->
 <path d="M200 110 H270" stroke="var(--rule)" stroke-width="2" stroke-dasharray="4 4"/>
 <polygon points="270,106 278,110 270,114" fill="var(--rule)"/>

 <!-- Elysium L2 -->
 <rect x="280" y="30" width="200" height="160" rx="12" fill="var(--raised)" stroke="var(--rule)" stroke-width="1.5"/>
 <text x="380" y="65" text-anchor="middle" fill="var(--ink)" font-family="var(--display)" font-size="16">Elysium L2</text>
 <text x="380" y="88" text-anchor="middle" fill="var(--ink-2)" font-size="12">100–200ms Block Time</text>
 <rect x="295" y="105" width="170" height="32" rx="6" fill="var(--ground)" stroke="var(--rule)"/>
 <text x="380" y="125" text-anchor="middle" fill="var(--accent)" font-family="monospace" font-size="11">0x0801 Precompile Read</text>
 <rect x="295" y="145" width="170" height="32" rx="6" fill="var(--ground)" stroke="var(--rule)"/>
 <text x="380" y="165" text-anchor="middle" fill="var(--hedge)" font-family="monospace" font-size="11">0x0802 Predeploy Intent</text>

 <!-- Arrow to HyperCore -->
 <path d="M480 110 H550" stroke="var(--rule)" stroke-width="2"/>
 <polygon points="550,106 558,110 550,114" fill="var(--accent)"/>

 <!-- HyperCore Engine -->
 <rect x="560" y="30" width="180" height="160" rx="12" fill="var(--raised)" stroke="var(--accent)" stroke-width="1.5"/>
 <text x="650" y="65" text-anchor="middle" fill="var(--accent)" font-family="var(--display)" font-size="16">HyperCore L1</text>
 <text x="650" y="88" text-anchor="middle" fill="var(--ink-2)" font-size="12">High-Throughput CLOB</text>
 <rect x="580" y="110" width="140" height="60" rx="8" fill="var(--ground)" stroke="var(--rule)"/>
 <text x="650" y="135" text-anchor="middle" fill="var(--hedge)" font-weight="600" font-size="11">Active Short Hedge</text>
 <text x="650" y="155" text-anchor="middle" fill="var(--ink)" font-size="12">500 HYPE Short</text>
 </svg>
 </div>
 </div>

 <h2>2. Offsetting PnL Equilibrium</h2>
 <p>Consider a portfolio holding 1,000 units of HYPE at $45.00 ($45,000 total collateral) with $32,000 borrowed debt. If HYPE drops to $42.00:</p>
 <ul>
 <li><strong>Spot Collateral Loss</strong>: Spot value falls by -$3,000 to $42,000.</li>
 <li><strong>Short Hedge Gain</strong>: If a 100% hedge was opened at $45.00, the 1,000-unit short generates an unrealized cash gain of +$3,000.</li>
 <li><strong>Net Portfolio Equity</strong>: The net balance remains flat at $13,000 ($45,000 - $32,000 = $13,000). The liquidation trigger is averted.</li>
 </ul>

 <div class="callout callout-warning">
 <div class="callout-icon">[ALERT]</div>
 <div class="callout-body">
 <div class="callout-title">Important Technical Reality: Hedging is Not Free of Risk</div>
 Hedging drastically reduces directional delta exposure, but it does not magically eliminate all risks. Perpetuals carry funding rate costs, basis risk (divergence between spot index and perp mark prices), order book execution slippage, and exchange counterparty exposure. The platform guarantees risk mitigation, not absolute risk immunity.
 </div>
 </div>
 </div>
 `
 },
 {
 id: 'core-principles',
 category: 'Introduction',
 tag: 'CORE',
 title: 'Core Principles & Security Invariants',
 subtitle: 'Non-negotiable architectural axioms governing funds custody, operator boundaries, and execution.',
 prev: { id: 'aegis-approach', title: 'The AEGIS Approach' },
 next: { id: 'key-terminology', title: 'Key Terminology & Glossary' },
 content: `
 <div class="docs-section">
 <h2>1. The Five System Invariants</h2>
 <p>The AEGIS protocol architecture is bounded by five formal system invariants specified in <code>DESIGN.md</code> §7 and enforced on-chain via smart contracts and execution precompiles:</p>

 <div class="lifecycle-flow">
 <div class="flow-step">
 <div class="step-num">INV-1</div>
 <div class="step-content">
 <div class="step-title">Non-Custodial Session Key Invariant</div>
 <div class="step-desc">Delegated trade-only session keys issued to <code>AegisVault.sol</code> can exclusively dispatch <code>placeLimitOrder()</code> and <code>cancelOrder()</code> via the <code>0x0802</code> ElysiumCoreWriter. Neither smart contract code, administrative multi-sigs, nor Sentinel node daemons possess bytecode or authorization to transfer, withdraw, or seize underlying user collateral.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">INV-2</div>
 <div class="step-content">
 <div class="step-title">Slashing Bound Invariant</div>
 <div class="step-desc">Penalty slash amounts assessed against negligent or delinquent node operators cannot exceed the active bonded stake deposited in <code>AegisSentinelRegistry.sol</code> (minimum 25,000 $AEGIS).</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">INV-3</div>
 <div class="step-content">
 <div class="step-title">Instant Manual Override Invariant</div>
 <div class="step-desc">Invoking <code>manualOverride()</code> on <code>AegisVault.sol</code> immediately deactivates all automated Sentinel execution rights, atomically cancels resting hedge orders, and restores 100% manual control to the user's primary wallet in a single transaction.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">INV-4</div>
 <div class="step-content">
 <div class="step-title">Fee Conservation Invariant</div>
 <div class="step-desc">Performance fees collected on averted liquidation penalties (10%) are strictly allocated 50% to market buy-and-burn via Ascend Closed Hook Pools and 50% to real yield distributions in USDC/HYPE to governance stakers. Zero unallocated fee leakage is permitted.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">INV-5</div>
 <div class="step-content">
 <div class="step-title">Monotonic Nonce Ordering</div>
 <div class="step-desc">All order intents emitted to predeploy <code>0x0802</code> enforce strictly increasing nonces per position, preventing cross-block replay and front-running attacks.</div>
 </div>
 </div>
 </div>
 </div>
 `
 },
 {
 id: 'key-terminology',
 category: 'Introduction',
 tag: 'CORE',
 title: 'Key Terminology & Glossary',
 subtitle: 'Standardized nomenclature for financial models, contract interfaces, and execution lanes.',
 prev: { id: 'core-principles', title: 'Core Principles & Security Invariants' },
 next: { id: 'faq', title: 'Frequently Asked Questions' },
 content: `
 <div class="docs-section">
 <h2>Glossary of Terms</h2>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr>
 <th>Term</th>
 <th>Symbol</th>
 <th>Definition</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td><strong>Health Factor</strong></td>
 <td><code>H</code></td>
 <td>The ratio of discounted collateral value to total borrowed debt liability. When $H \le 1.00$, the position is subject to immediate third-party liquidation.</td>
 </tr>
 <tr>
 <td><strong>Delta Coverage Ratio</strong></td>
 <td><code>&gamma;</code></td>
 <td>The fraction of total position delta hedged via perpetual contracts, ranging from 0.10 (10% partial hedge) to 1.00 (100% delta-neutral lock).</td>
 </tr>
 <tr>
 <td><strong>Trailing Tolerance</strong></td>
 <td><code>&tau;</code></td>
 <td>The percentage bounce threshold above the lowest wick ($P_{\\text{lowest}}$) required to trigger the trailing profit-taking unwind order.</td>
 </tr>
 <tr>
 <td><strong>Sentinel Node</strong></td>
 <td>&mdash;</td>
 <td>An autonomous off-chain validator node bonded with 25,000 $AEGIS that continuously evaluates vault health and dispatches trade intents.</td>
 </tr>
 <tr>
 <td><strong>Session Key</strong></td>
 <td>&mdash;</td>
 <td>An ephemeral cryptographic keypair authorized strictly to sign order intents on HyperCore, mathematically barred from withdrawing collateral.</td>
 </tr>
 <tr>
 <td><strong>Precompile 0x0801</strong></td>
 <td>&mdash;</td>
 <td>A zero-gas, synchronous EVM precompile on Elysium L2 that exposes live spot/perp order book depth and mark prices from HyperCore in ~70ms.</td>
 </tr>
 <tr>
 <td><strong>Predeploy 0x0802</strong></td>
 <td>&mdash;</td>
 <td><code>ElysiumCoreWriter</code>: A privileged predeploy contract on Elysium emitting signed trade orders executed by HyperCore matching engines.</td>
 </tr>
 <tr>
 <td><strong>Manual Override</strong></td>
 <td>&mdash;</td>
 <td>An emergency transaction callable by the vault owner to instantly kill Sentinel authority and close open derivative positions.</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 `
 },
 {
 id: 'faq',
 category: 'Introduction',
 tag: 'CORE',
 title: 'Frequently Asked Questions',
 subtitle: 'Answers to essential questions regarding security, custody, performance, and fees.',
 prev: { id: 'key-terminology', title: 'Key Terminology & Glossary' },
 next: { id: 'health-factor', title: 'Understanding Position Health & Math' },
 content: `
 <div class="docs-section">
 <h2>Common Inquiries</h2>
 
 <h3>Does AEGIS guarantee that I will never be liquidated under any circumstance?</h3>
 <p><strong>No protocol can make unconditional guarantees in adversarial market conditions.</strong> While AEGIS is engineered to prevent liquidations by opening short hedges well in advance of the liquidation threshold, extreme black swan events (such as total market illiquidity, multi-block oracle outages, or instantaneous flash crashes exceeding 50% in a single block) could delay hedge execution. AEGIS substantially reduces liquidation probability under standard and volatile market regimes.</p>

 <h3>Can a Sentinel node steal or withdraw my deposited collateral?</h3>
 <p><strong>No.</strong> Under invariant <code>INV-1</code>, Sentinel nodes operate exclusively using delegated session keys scoped to order placement on HyperCore. The underlying collateral remains locked inside <code>AegisVault.sol</code>, whose bytecode possesses no method for external address transfers except back to the authenticated vault owner.</p>

 <h3>What happens if the price rebounds immediately after a hedge is opened?</h3>
 <p>When the price rebounds, the <strong>Trailing Unwind Engine</strong> automatically detects that the asset has bounced by the user's trailing tolerance $\\tau$ (e.g. 1.5%) off the lowest wick. It purchases to close the short perpetual hedge, locks in the realized hedge cash gain into the vault balance, and leaves the spot collateral intact to participate in further upside.</p>

 <h3>How does AEGIS charge fees?</h3>
 <p>AEGIS charges a <strong>10% performance fee exclusively on averted liquidation penalties</strong>. If a user was protected from a 10% liquidation penalty ($10,000 on a $100k vault), AEGIS captures 10% of that saved amount ($1,000). If no hedge is triggered, zero management fees are levied. Captured fees are split 50/50 between $AEGIS token buyback-and-burn and staking yield.</p>
 </div>
 `
 },

 // PART II: CORE CONCEPTS & PART IV: MATHEMATICAL SPECIFICATIONS
 {
 id: 'health-factor',
 category: 'Core Concepts',
 tag: 'MATH',
 title: 'Understanding Position Health & Math',
 subtitle: 'Formal mathematical formulation of Health Factor (H), threshold boundaries, and solvency ratios.',
 prev: { id: 'faq', title: 'Frequently Asked Questions' },
 next: { id: 'hedge-lifecycle', title: 'The Complete 14-Stage Hedge Lifecycle' },
 content: `
 <div class="docs-section">
 <h2>1. Formal Health Factor Formulation</h2>
 <p>Solvency across all collateralized positions in AEGIS is measured by the continuous dimensionless scalar <strong>Health Factor ($H$)</strong>. For a multi-asset collateral vault backing debt $D_{\\text{total}}$:</p>

 <div class="math-card">
 <div class="math-title">Health Factor Formal Equation</div>
 <div class="math-formula">H = \\frac{\\sum_{i=1}^{n} \\big( Q_i \\times P_i \\times T_i \\big)}{D_{\\text{total}}}</div>
 </div>

 <table class="math-legend">
 <thead>
 <tr><th>Variable</th><th>Definition</th><th>Measurement Unit</th></tr>
 </thead>
 <tbody>
 <tr>
 <td>Q_i</td>
 <td>Total quantity of collateral token $i$ deposited in the vault.</td>
 <td>Base token units (e.g. ETH, HYPE)</td>
 </tr>
 <tr>
 <td>P_i</td>
 <td>Mark price of collateral token $i$ queried synchronously via precompile <code>0x0801</code>.</td>
 <td>USD (scaled 1e8 fixed-point)</td>
 </tr>
 <tr>
 <td>T_i</td>
 <td>Liquidation threshold ratio established for asset $i$ (e.g. 0.80 for 80% maximum LTV).</td>
 <td>Dimensionless scalar $\\in (0, 1.00)$</td>
 </tr>
 <tr>
 <td>D_{\\text{total}}</td>
 <td>Cumulative borrowed debt liabilities plus accrued interest.</td>
 <td>USDC (scaled 1e6 fixed-point)</td>
 </tr>
 </tbody>
 </table>

 <h2>2. Threshold Regime Mapping</h2>
 <p>The health factor determines the state machine transitions of the vault:</p>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr>
 <th>Health Factor Range</th>
 <th>Protocol State</th>
 <th>Sentinel Action</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td><code>H &gt; 1.30</code></td>
 <td><strong>Healthy / Safe</strong></td>
 <td>Passive monitoring via precompile 0x0801 every 100ms.</td>
 </tr>
 <tr>
 <td><code>1.10 &lt; H &le; 1.30</code></td>
 <td><strong>Caution / Standby</strong></td>
 <td>Orderbook depth verification; Sentinel arms execution payload.</td>
 </tr>
 <tr>
 <td><code>H &le; H_trigger (e.g. 1.10)</code></td>
 <td><strong>Triggered / Hedging Active</strong></td>
 <td>Short perpetual orders dispatched immediately via <code>0x0802</code>.</td>
 </tr>
 <tr>
 <td><code>H &le; 1.00</code></td>
 <td><strong>Insolvency / Liquidation Horizon</strong></td>
 <td>Position subject to immediate external protocol liquidation if unhedged.</td>
 </tr>
 </tbody>
 </table>
 </div>

 <h2>3. Distance to Liquidation Equation</h2>
 <p>Traders and algorithms calculate the absolute dollar buffer ($\Delta P$) and percentage distance ($d_{\%}$) to liquidation as follows:</p>
 <div class="math-card">
 <div class="math-title">Liquidation Price & Distance Formulas</div>
 <div class="math-formula">P_{\\text{liq}} = \\frac{D_{\\text{total}}}{Q_{\\text{collateral}} \\times T} \\qquad d_{\\%} = \\frac{P_{\\text{current}} - P_{\\text{liq}}}{P_{\\text{current}}} \\times 100</div>
 </div>
 <p>For example, with 1,000 HYPE ($Q=1000$), $T=0.80$, and debt of $32,000 USDC ($D=32000$):</p>
 <div class="math-card">
 <div class="math-formula">P_{\\text{liq}} = \\frac{32,000}{1,000 \\times 0.80} = \\frac{32,000}{800} = \\$40.00</div>
 </div>
 <p>If the current mark price $P_{\\text{current}} = \\$48.50$, the percentage distance is $(48.50 - 40.00) / 48.50 \\times 100 = 17.53\\%$.</p>
 </div>
 `
 },
 {
 id: 'hedge-lifecycle',
 category: 'Core Concepts',
 tag: 'CORE',
 title: 'The Complete 14-Stage Hedge Lifecycle',
 subtitle: 'End-to-end operational state machine governing positions from configuration to final settlement.',
 prev: { id: 'health-factor', title: 'Understanding Position Health & Math' },
 next: { id: 'hedge-sizing-math', title: 'Hedge Sizing & Trailing Unwind Math' },
 content: `
 <div class="docs-section">
 <h2>The 14 Discrete Stages of Collateral Protection</h2>
 <p>AEGIS enforces a deterministic state machine through every phase of position lifetime:</p>

 <div class="lifecycle-flow">
 <div class="flow-step">
 <div class="step-num">1</div>
 <div class="step-content">
 <div class="step-title">Position Configuration</div>
 <div class="step-desc">Trader deposits collateral into <code>AegisVault.sol</code>, specifies trigger mode (Hybrid, Price, or Health Factor), sets hedge ratio ($\gamma$), and defines trailing tolerance ($\tau$).</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">2</div>
 <div class="step-content">
 <div class="step-title">Session Key Delegation</div>
 <div class="step-desc">Trader cryptographically delegates a trade-only session key to <code>AegisVault.sol</code>, granting permission strictly to submit order intents.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">3</div>
 <div class="step-content">
 <div class="step-title">Continuous Sentinel Monitoring</div>
 <div class="step-desc">Bonded Sentinel nodes query Elysium precompile <code>0x0801</code> synchronously every 100ms block at zero gas cost.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">4</div>
 <div class="step-content">
 <div class="step-title">Risk Detection & Boundary Breaches</div>
 <div class="step-desc">Market price experiences a sudden drawdown; the computed health factor breaches the configured threshold: $(H \le H_{\text{trigger}}) \lor (P \le P_{\text{trigger}})$.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">5</div>
 <div class="step-content">
 <div class="step-title">Hedge Sizing Computation</div>
 <div class="step-desc">The Sentinel calculates required short perpetual size $Q_{\text{hedge}}$ using coverage ratio $\gamma$ and current HyperCore order book depth.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">6</div>
 <div class="step-content">
 <div class="step-title">Execution Authorization Verification</div>
 <div class="step-desc">The node constructs the trade intent, signs it with the user's delegated session key, and verifies slippage bounds against <code>maxSlippageBps</code>.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">7</div>
 <div class="step-content">
 <div class="step-title">Intent Submission via 0x0802</div>
 <div class="step-desc">The intent is written to predeploy <code>0x0802</code> (ElysiumCoreWriter), emitting the canonical event <code>OrderIntentEmitted</code>.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">8</div>
 <div class="step-content">
 <div class="step-title">Atomic CLOB Execution on HyperCore</div>
 <div class="step-desc">HyperCore perpetual matching engine executes the short perpetual order on the L1 CLOB within sub-100ms latency.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">9</div>
 <div class="step-content">
 <div class="step-title">Health Stabilization Reassessment</div>
 <div class="step-desc">Short perpetual profits counterbalance spot collateral drops. Net health factor stabilizes above liquidation threshold.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">10</div>
 <div class="step-content">
 <div class="step-title">Active Hedge Tracking & Wick Recording</div>
 <div class="step-desc">Sentinel tracks the position, updating the lowest market wick price $P_{\text{lowest}}$ and computing trailing exit target $P_{\text{exit}} = P_{\text{lowest}} \times (1 + \tau)$.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">11</div>
 <div class="step-content">
 <div class="step-title">Trailing Profit Unwind Trigger</div>
 <div class="step-desc">Market bounces off the low, crossing $P_{\text{exit}}$. The Sentinel submits a buy-to-close intent via <code>0x0802</code>.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">12</div>
 <div class="step-content">
 <div class="step-title">Profit Capture & Fee Distribution</div>
 <div class="step-desc">Short hedge realized profit is credited to the user's vault. <code>AegisFeeCollector.sol</code> splits the 10% performance fee 50/50 to buyback-and-burn and stakers.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">13</div>
 <div class="step-content">
 <div class="step-title">Emergency Override Protocol (INV-3)</div>
 <div class="step-desc">If the user calls <code>manualOverride()</code> at any point, Sentinel permissions are immediately revoked and resting orders are canceled.</div>
 </div>
 </div>
 <div class="flow-step">
 <div class="step-num">14</div>
 <div class="step-content">
 <div class="step-title">Failure Handling & Slashing</div>
 <div class="step-desc">If an assigned Sentinel node fails to execute within 3 blocks or exceeds slippage limits, <code>AegisSentinelRegistry.sol</code> slashes 10% of their 25,000 $AEGIS bond.</div>
 </div>
 </div>
 </div>
 </div>
 `
 },
 {
 id: 'hedge-sizing-math',
 category: 'Mathematical Specs',
 tag: 'MATH',
 title: 'Hedge Sizing & Trailing Unwind Math',
 subtitle: 'Exact mathematical equations for calculating perpetual position sizes and trailing profit thresholds.',
 prev: { id: 'hedge-lifecycle', title: 'The Complete 14-Stage Hedge Lifecycle' },
 next: { id: 'worked-examples', title: 'Worked Numerical Quant Models' },
 content: `
 <div class="docs-section">
 <h2>1. Hedge Sizing Algorithm (Coverage Ratio $\\gamma$)</h2>
 <p>The short perpetual hedge size $Q_{\\text{hedge}}$ is scaled by the trader's chosen coverage parameter $\\gamma \\in [0.10, 1.00]$:</p>

 <div class="math-card">
 <div class="math-title">General Hedge Sizing Equation</div>
 <div class="math-formula">Q_{\\text{hedge}} = \\gamma \\times \\frac{D_{\\text{total}} - \\big(Q_{\\text{collateral}} \\times P_{\\text{current}} \\times T\\big)}{P_{\\text{perp}} \\times (1 - T)}</div>
 </div>

 <p>Two primary institutional configurations exist:</p>
 <ul>
 <li><strong>Full Delta-Neutral Lock ($\gamma = 1.00$)</strong>:
 <div class="math-card">
 <div class="math-formula">Q_{\\text{hedge}} = Q_{\\text{collateral}}</div>
 </div>
 The short perpetual size identically matches the collateral quantity, completely locking the USD value of equity.
 </li>
 <li><strong>Surgical Buffer Hedging ($\gamma = 0.25 - 0.50$)</strong>:
 The Sentinel opens only the minimum hedge required to maintain $H \ge 1.15$, preserving maximum upside if the asset bounces quickly while paying minimal trading fees.
 </li>
 </ul>

 <h2>2. Trailing Profit-Take and Unwind Mathematics</h2>
 <p>While the short hedge is active, the Sentinel records the absolute lowest market wick price ($P_{\\text{lowest}}$). The trailing exit price $P_{\\text{exit}}$ is defined dynamically:</p>

 <div class="math-card">
 <div class="math-title">Trailing Exit Formula</div>
 <div class="math-formula">P_{\\text{exit}} = P_{\\text{lowest}} \\times (1 + \\tau)</div>
 </div>

 <table class="math-legend">
 <thead><tr><th>Parameter</th><th>Description</th><th>Typical Value</th></tr></thead>
 <tbody>
 <tr>
 <td>P_{\\text{lowest}}</td>
 <td>Lowest mark price recorded on HyperCore since hedge initiation.</td>
 <td>USD mark price</td>
 </tr>
 <tr>
 <td>\\tau</td>
 <td>User-configured trailing tolerance ratio.</td>
 <td>0.015 (1.5%) &mdash; allowed range: 0.005 to 0.05</td>
 </tr>
 <tr>
 <td>P_{\\text{exit}}</td>
 <td>Threshold where Sentinel submits buy-to-close market order.</td>
 <td>USD exit trigger</td>
 </tr>
 </tbody>
 </table>
 </div>
 `
 },
 {
 id: 'worked-examples',
 category: 'Mathematical Specs',
 tag: 'MATH',
 title: 'Worked Numerical Quant Models',
 subtitle: 'Step-by-step mathematical walkthroughs of market drawdowns, hedge openings, and trailing unwinds.',
 prev: { id: 'hedge-sizing-math', title: 'Hedge Sizing & Trailing Unwind Math' },
 next: { id: 'contract-architecture', title: 'Smart Contract Architecture & Interfaces' },
 content: `
 <div class="docs-section">
 <h2>Case Study: 1,000 HYPE Position Drawdown & Recovery</h2>
 <p>To demonstrate the mathematical mechanics under live market conditions, examine this complete scenario with concrete figures:</p>

 <div class="table-wrapper">
 <table class="tech-table">
 <thead><tr><th>Parameter</th><th>Value</th><th>Notes</th></tr></thead>
 <tbody>
 <tr><td>Collateral Asset</td><td>1,000 HYPE</td><td>Deposited in <code>AegisVault.sol</code></td></tr>
 <tr><td>Borrowed Debt</td><td>$32,000 USDC</td><td>Borrowed against collateral</td></tr>
 <tr><td>Liquidation Threshold ($T$)</td><td>0.80 (80%)</td><td>Standard Elysium market parameter</td></tr>
 <tr><td>Initial Mark Price ($P_0$)</td><td>$48.50</td><td>Initial Collateral Value: $48,500</td></tr>
 <tr><td>Initial Health Factor ($H_0$)</td><td>1.2125</td><td>$(1,000 \times 48.50 \times 0.80) / 32,000$</td></tr>
 <tr><td>Trigger Health Factor ($H_{\\text{trig}}$)</td><td>1.10</td><td>Hedge triggers when $P \le \$44.00$</td></tr>
 <tr><td>Coverage Ratio ($\gamma$)</td><td>0.50 (50%)</td><td>Surgical partial hedge = 500 HYPE Short</td></tr>
 <tr><td>Trailing Tolerance ($\tau$)</td><td>0.015 (1.5%)</td><td>User setting</td></tr>
 </tbody>
 </table>
 </div>

 <h3>Phase A: Market Drawdown & Trigger Breach</h3>
 <p>The price crashes from $48.50 down to $43.50. At $43.50, the unhedged health factor evaluates to:</p>
 <div class="math-card">
 <div class="math-formula">H = \\frac{1,000 \\times 43.50 \\times 0.80}{32,000} = \\frac{34,800}{32,000} = 1.0875 &lt; 1.10</div>
 </div>
 <p>Because $1.0875 \le 1.10$, the Sentinel fires immediately. It opens a <strong>500 HYPE short perpetual</strong> on HyperCore at an average fill price of <strong>$43.50</strong>.</p>

 <h3>Phase B: Continued Drawdown to Lowest Wick</h3>
 <p>The market sells off further, touching a local bottom wick of <strong>$40.20</strong> ($P_{\\text{lowest}} = 40.20$).</p>
 <ul>
 <li>Unhedged Collateral Value: $1,000 \times 40.20 = \$40,200$.</li>
 <li>Unrealized Short Hedge PnL: $500 \times (43.50 - 40.20) = 500 \times 3.30 = +\$1,650$.</li>
 <li>Net Position Equity: $\$40,200 - \$32,000 + \$1,650 = \$9,850$.</li>
 <li>Effective Health Factor with Hedge: $(32,160 + 1,650) / 32,000 = 1.0565$. <em>The position survived without liquidation!</em></li>
 </ul>

 <h3>Phase C: Market Bounce & Trailing Unwind</h3>
 <p>The market begins to recover. The trailing exit threshold is computed:</p>
 <div class="math-card">
 <div class="math-formula">P_{\\text{exit}} = 40.20 \\times (1 + 0.015) = 40.20 \\times 1.015 = \\$40.803</div>
 </div>
 <p>When the price crosses $40.81, the Sentinel buys to close the 500 HYPE short at $40.81:</p>
 <ul>
 <li>Realized Short Profit: $500 \times (43.50 - 40.81) = 500 \times 2.69 = +\$1,345.00$.</li>
 <li>Averted Liquidation Penalty (10% of $32k): $3,200.00.</li>
 <li>AEGIS 10% Performance Fee: $10\% \times \$3,200 = \$320.00$ ($160 to buyback-burn, $160 to stakers).</li>
 <li>Net Retained Cash Profit Deposited into Vault: $\$1,345.00 - \$320.00 = +\$1,025.00$.</li>
 <li><strong>Outcome</strong>: 1,000 HYPE collateral remains 100% intact, vault cash increased by $1,025, and zero liquidation occurred.</li>
 </ul>
 </div>
 `
 },

 // PART V: SMART CONTRACT ARCHITECTURE
 {
 id: 'contract-architecture',
 category: 'Smart Contracts',
 tag: 'SOL',
 title: 'Smart Contract Architecture & Interfaces',
 subtitle: 'Technical specifications, state storage schemas, and Solidity interfaces for Elysium L2 core contracts.',
 prev: { id: 'worked-examples', title: 'Worked Numerical Quant Models' },
 next: { id: 'precompiles', title: 'Precompile 0x0801 & Predeploy 0x0802' },
 content: `
 <div class="docs-section">
 <h2>1. Contract Suite Overview</h2>
 <p>AEGIS smart contracts are architected for Solidity 0.8.24 on Elysium L2. The protocol consists of four core modular contracts:</p>
 
 <div class="table-wrapper">
 <table class="tech-table">
 <thead><tr><th>Contract Name</th><th>Role & Responsibility</th><th>Verification Status</th></tr></thead>
 <tbody>
 <tr>
 <td><code>AegisTypes.sol</code></td>
 <td>Defines shared enums, parameter structs, event signatures, and custom errors.</td>
 <td>Architecturally Specified</td>
 </tr>
 <tr>
 <td><code>AegisVault.sol</code></td>
 <td>Manages position health, collateral storage, session key delegations, and <code>manualOverride()</code>.</td>
 <td>Architecturally Specified</td>
 </tr>
 <tr>
 <td><code>AegisSentinelRegistry.sol</code></td>
 <td>Handles node operator bonding (25,000 $AEGIS), uptime SLA metrics, and slashing logic.</td>
 <td>Architecturally Specified</td>
 </tr>
 <tr>
 <td><code>AegisFeeCollector.sol</code></td>
 <td>Collects 10% performance fees; executes 50% buyback-burn on Ascend and 50% staking yield.</td>
 <td>Architecturally Specified</td>
 </tr>
 </tbody>
 </table>
 </div>

 <h2>2. AegisVault.sol Specification</h2>
 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title">
 <span>[SPEC]</span> AegisVault.sol (Interface Specification)
 </div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Interface</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-cmt">// SPDX-License-Identifier: MIT</span>
<span class="tok-kw">pragma solidity</span> ^0.8.24;

<span class="tok-kw">import</span> { AegisTypes } <span class="tok-kw">from</span> <span class="tok-str">"./AegisTypes.sol"</span>;

<span class="tok-kw">interface</span> <span class="tok-typ">IAegisVault</span> {
 <span class="tok-kw">event</span> <span class="tok-fn">PositionConfigured</span>(<span class="tok-typ">address indexed</span> user, AegisTypes.<span class="tok-typ">ProConfig</span> config);
 <span class="tok-kw">event</span> <span class="tok-fn">SessionKeyDelegated</span>(<span class="tok-typ">address indexed</span> user, <span class="tok-typ">address indexed</span> sessionKey, <span class="tok-typ">uint64</span> expiry);
 <span class="tok-kw">event</span> <span class="tok-fn">HedgeExecuted</span>(<span class="tok-typ">address indexed</span> user, <span class="tok-typ">uint256</span> size, <span class="tok-typ">uint256</span> price);
 <span class="tok-kw">event</span> <span class="tok-fn">ManualOverrideTriggered</span>(<span class="tok-typ">address indexed</span> user);

 <span class="tok-cmt">/// @notice Sets Pro-Trader risk and hedge parameters</span>
 <span class="tok-kw">function</span> <span class="tok-fn">setProConfig</span>(AegisTypes.<span class="tok-typ">ProConfig calldata</span> config) <span class="tok-kw">external</span>;

 <span class="tok-cmt">/// @notice Delegates trade-only session key strictly scoped to 0x0802</span>
 <span class="tok-kw">function</span> <span class="tok-fn">delegateSessionKey</span>(<span class="tok-typ">address</span> sessionKey, <span class="tok-typ">uint64</span> durationSeconds) <span class="tok-kw">external</span>;

 <span class="tok-cmt">/// @notice Emergency killswitch revoking permissions and closing hedges</span>
 <span class="tok-kw">function</span> <span class="tok-fn">manualOverride</span>() <span class="tok-kw">external</span>;

 <span class="tok-cmt">/// @notice Synchronous health factor evaluator reading precompile 0x0801</span>
 <span class="tok-kw">function</span> <span class="tok-fn">getHealthFactor</span>(<span class="tok-typ">address</span> user) <span class="tok-kw">external view returns</span> (<span class="tok-typ">uint256</span> healthFactorScaled);
}</code></pre>
 </div>
 </div>

 <h2>3. AegisSentinelRegistry.sol Specification</h2>
 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title">
 <span>[SPEC]</span> AegisSentinelRegistry.sol (Node Staking & Slashing)
 </div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Interface</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-cmt">// SPDX-License-Identifier: MIT</span>
<span class="tok-kw">pragma solidity</span> ^0.8.24;

<span class="tok-kw">interface</span> <span class="tok-typ">IAegisSentinelRegistry</span> {
 <span class="tok-typ">uint256 public constant</span> MIN_BOND = 25_000 * 1e18; <span class="tok-cmt">// 25,000 $AEGIS</span>

 <span class="tok-kw">event</span> <span class="tok-fn">SentinelBonded</span>(<span class="tok-typ">address indexed</span> operator, <span class="tok-typ">uint256</span> amount);
 <span class="tok-kw">event</span> <span class="tok-fn">SentinelSlashed</span>(<span class="tok-typ">address indexed</span> operator, <span class="tok-typ">uint256</span> penalty, <span class="tok-typ">address indexed</span> recipient);

 <span class="tok-cmt">/// @notice Stakes $AEGIS to qualify as an active Sentinel node</span>
 <span class="tok-kw">function</span> <span class="tok-fn">stakeBond</span>(<span class="tok-typ">uint256</span> amount) <span class="tok-kw">external</span>;

 <span class="tok-cmt">/// @notice Slashes 10% of operator bond for SLA violation or slippage breach</span>
 <span class="tok-kw">function</span> <span class="tok-fn">slashOperator</span>(<span class="tok-typ">address</span> operator, <span class="tok-typ">address</span> affectedUser) <span class="tok-kw">external</span>;
}</code></pre>
 </div>
 </div>
 </div>
 `
 },
 {
 id: 'precompiles',
 category: 'Smart Contracts',
 tag: 'SOL',
 title: 'Precompile 0x0801 & Predeploy 0x0802',
 subtitle: 'Low-level specification of the HyperCore synchronous market reader and asynchronous intent writer.',
 prev: { id: 'contract-architecture', title: 'Smart Contract Architecture & Interfaces' },
 next: { id: 'tokenomics', title: '$AEGIS Tokenomics & Economy' },
 content: `
 <div class="docs-section">
 <h2>1. Precompile 0x0801: HyperCore Market Data Reader</h2>
 <p>Elysium L2 exposes a native EVM precompile at fixed address <code>0x0801</code> that bridges HyperCore L1 state into the Elysium execution environment with zero gas cost and sub-70ms read latency:</p>

 <div class="callout callout-note">
 <div class="callout-icon">[FAST]</div>
 <div class="callout-body">
 <div class="callout-title">Synchronous Zero-Gas Execution</div>
 Unlike standard oracles (e.g. Chainlink) which require periodic push transactions and multi-block lag, <code>0x0801</code> reads the live HyperCore memory pool directly during EVM opcode execution.
 </div>
 </div>

 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title"><span>[ABI]</span> Precompile 0x0801 ABI Definition</div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Interface</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-kw">interface</span> <span class="tok-typ">IHyperCoreReadPrecompile</span> {
 <span class="tok-cmt">/// @notice Returns current mark price, funding rate, and 24h volume</span>
 <span class="tok-kw">function</span> <span class="tok-fn">getPerpMarket</span>(<span class="tok-typ">uint32</span> perpIndex) <span class="tok-kw">external view returns</span> (
 <span class="tok-typ">uint64</span> markPriceScaled, <span class="tok-cmt">// 1e8 fixed point</span>
 <span class="tok-typ">int64</span> fundingRateScaled, <span class="tok-cmt">// 1e8 hourly funding rate</span>
 <span class="tok-typ">uint128</span> openInterest <span class="tok-cmt">// Total open contracts</span>
 );

 <span class="tok-cmt">/// @notice Returns cumulative orderbook depth for asks and bids</span>
 <span class="tok-kw">function</span> <span class="tok-fn">getOrderbookDepth</span>(<span class="tok-typ">uint32</span> perpIndex, <span class="tok-typ">uint8</span> levels) <span class="tok-kw">external view returns</span> (
 <span class="tok-typ">uint64[] memory</span> bidPrices,
 <span class="tok-typ">uint64[] memory</span> bidSizes,
 <span class="tok-typ">uint64[] memory</span> askPrices,
 <span class="tok-typ">uint64[] memory</span> askSizes
 );
}</code></pre>
 </div>
 </div>

 <h2>2. Predeploy 0x0802: ElysiumCoreWriter</h2>
 <p>The predeploy at <code>0x0802</code> is the designated intent-writing bridge between Elysium L2 and HyperCore's L1 matching engine. It dispatches trade intents without granting withdrawal authority.</p>

 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title"><span>[CALL]</span> Predeploy 0x0802 Interface</div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Interface</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-kw">interface</span> <span class="tok-typ">IElysiumCoreWriter</span> {
 <span class="tok-kw">event</span> <span class="tok-fn">OrderIntentEmitted</span>(
 <span class="tok-typ">address indexed</span> vault,
 <span class="tok-typ">uint32 indexed</span> perpIndex,
 <span class="tok-typ">bool</span> isShort,
 <span class="tok-typ">uint64</span> size,
 <span class="tok-typ">uint64</span> limitPrice,
 <span class="tok-typ">uint64</span> nonce
 );

 <span class="tok-cmt">/// @notice Dispatches trade intent using delegated session key</span>
 <span class="tok-kw">function</span> <span class="tok-fn">dispatchOrderIntent</span>(
 <span class="tok-typ">address</span> userVault,
 <span class="tok-typ">uint32</span> perpIndex,
 <span class="tok-typ">bool</span> isShort,
 <span class="tok-typ">uint64</span> size,
 <span class="tok-typ">uint64</span> limitPrice,
 <span class="tok-typ">bytes calldata</span> sessionKeySignature
 ) <span class="tok-kw">external</span>;
}</code></pre>
 </div>
 </div>
 </div>
 `
 },

 // PART V: TOKENOMICS & ECONOMY
 {
 id: 'tokenomics',
 category: 'Tokenomics',
 tag: '700M',
 title: '$AEGIS Tokenomics & Economy',
 subtitle: 'Hard-capped 700M supply allocation, Ascend ecosystem synergy, counter-cyclical burning, and strict 24-month team lock.',
 prev: { id: 'precompiles', title: 'Precompile 0x0801 & Predeploy 0x0802' },
 next: { id: 'sentinel-operator-guide', title: 'Sentinel Node Operator Guide' },
 content: `
 <div class="docs-section">
 <h2>1. Executive Overview & Non-Monetary Disclaimer</h2>
 <p>The <strong>$AEGIS</strong> token is the native governance, bonding, and fee-capture asset of the AEGIS protocol, deployed natively on Elysium L2 (Chain ID <code>99801</code>) with a strict, immutable hard cap of <strong>700,000,000 $AEGIS</strong> tokens. The protocol incorporates zero inflationary minting functions, enforcing a mathematically fixed total supply.</p>

 <div class="callout callout-important">
 <div class="callout-icon">[RULE]</div>
 <div class="callout-body">
 <div class="callout-title">Non-Monetary Valuation Notice</div>
 $AEGIS currently possesses zero established monetary value, secondary market pricing, or fiat exchange rate. All quantitative allocations, performance fee splits, and economic mechanisms detailed throughout this documentation represent programmatic token quantities, basis points (bps), and deterministic on-chain state transitions, not speculative financial forecasts.
 </div>
 </div>

 <p>Unlike standard DeFi models that rely on inflationary emissions to subsidize temporary liquidity, AEGIS implements a <strong>counter-cyclical deflationary flywheel</strong>. During market crashes—when traditional protocols suffer liquidation cascades—AEGIS executes autonomous delta-hedges. The resulting 10% performance fee on averted liquidation losses generates programmatic open-market buy pressure through <strong>Ascend Closed Hook Pools</strong>, permanently destroying tokens at the <code>0x000...dEaD</code> address while distributing real cash-flow yield to governance stakers in native debt tokens.</p>

 <h2>2. Key Token Metrics at a Glance</h2>
 <div class="tokenomics-stats-grid">
 <div class="stat-metric-card">
 <div class="stat-metric-label">Total Fixed Supply</div>
 <div class="stat-metric-value">700,000,000</div>
 <div class="stat-metric-sub">Hard-capped $AEGIS tokens. Zero inflationary minting capability in smart contracts.</div>
 <span class="stat-metric-badge stat-badge-teal">Fixed Hard Cap</span>
 </div>

 <div class="stat-metric-card">
 <div class="stat-metric-label">Initial Day-1 Float (TGE)</div>
 <div class="stat-metric-value">118,300,000</div>
 <div class="stat-metric-sub">16.9% total float (91M Ascend Fair Launch + Initial Ascend/Keeper float).</div>
 <span class="stat-metric-badge stat-badge-teal">Controlled Initial Float</span>
 </div>

 <div class="stat-metric-card">
 <div class="stat-metric-label">Core Contributor Lock</div>
 <div class="stat-metric-value">24-Month Cliff</div>
 <div class="stat-metric-sub">0% at TGE. Zero tokens for 2 full years, followed by 48-month linear vesting.</div>
 <span class="stat-metric-badge stat-badge-violet">6-Year Alignment</span>
 </div>

 <div class="stat-metric-card">
 <div class="stat-metric-label">Direct Ascend Alignment</div>
 <div class="stat-metric-value">39.0%</div>
 <div class="stat-metric-sub">273,000,000 $AEGIS total (182M Ecosystem & Community + 91M Fair Launch).</div>
 <span class="stat-metric-badge stat-badge-hedge">Ascend Ecosystem Focus</span>
 </div>
 </div>

 <h2>3. Visual Token Allocation (700M Cap)</h2>
 <div class="allocation-bar-wrap">
 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
 <span style="font-weight:600; font-size:13px; color:var(--ink);">Supply Distribution Across Strategic Pillars</span>
 <span style="font-family:monospace; font-size:12px; color:var(--ink-2);">700,000,000 $AEGIS (100.0%)</span>
 </div>
 
 <div class="allocation-progress-bar">
 <div class="alloc-segment" style="width:26%; background:var(--accent);" title="Ascend Ecosystem & Community: 26.0% (182M)"></div>
 <div class="alloc-segment" style="width:26%; background:var(--violet);" title="Sentinel & Community Incentives: 26.0% (182M)"></div>
 <div class="alloc-segment" style="width:15%; background:var(--hedge);" title="Protocol Security & Insurance: 15.0% (105M)"></div>
 <div class="alloc-segment" style="width:13%; background:#087E6D;" title="Ascend Fair Launch (TGE): 13.0% (91M)"></div>
 <div class="alloc-segment" style="width:12%; background:#305EA5;" title="Core Contributors & Team: 12.0% (84M)"></div>
 <div class="alloc-segment" style="width:8%; background:var(--danger);" title="Strategic Partners & Foundation: 8.0% (56M)"></div>
 </div>

 <div class="alloc-legend-grid">
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:var(--accent);"></span>
 <span><strong>26.0%</strong> — Ascend Ecosystem (182M)</span>
 </div>
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:var(--violet);"></span>
 <span><strong>26.0%</strong> — Sentinel & Community (182M)</span>
 </div>
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:var(--hedge);"></span>
 <span><strong>15.0%</strong> — Protocol Security (105M)</span>
 </div>
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:#087E6D;"></span>
 <span><strong>13.0%</strong> — Ascend Fair Launch (91M)</span>
 </div>
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:#305EA5;"></span>
 <span><strong>12.0%</strong> — Core Contributors (84M)</span>
 </div>
 <div class="alloc-legend-item">
 <span class="alloc-legend-dot" style="background:var(--danger);"></span>
 <span><strong>8.0%</strong> — Strategic & Foundation (56M)</span>
 </div>
 </div>
 </div>

 <h2>4. Deep Ascend Ecosystem Symbiosis</h2>
 <p>The tokenomics of AEGIS are architected to directly empower and expand the <strong>Ascend ecosystem</strong> on Elysium L2 and Kinetiq:</p>
 
 <div class="callout callout-note">
 <div class="callout-icon">[FAST]</div>
 <div class="callout-body">
 <div class="callout-title">Ascend's Architectural Alignment</div>
 Ascend operates without a native token of its own, prioritizing value capture in <strong>HYPE</strong>, <strong>kHYPE</strong> (Kinetiq liquid-staked HYPE), and <strong>KNTQ</strong>. AEGIS's fee routing and staking integration directly fuel Ascend's core volume and buyback loops.
 </div>
 </div>

 <ul>
 <li><strong>Exclusive Buyback Routing on Ascend Closed Hook Pools</strong>: <code>AegisFeeCollector.sol</code> routes 100% of all market buybacks exclusively through <code>IAscendHookPool.sol</code>. Every time AEGIS averts liquidations during market drawdowns, programmatic buy volume flows directly into Ascend pools, boosting trading volume and liquidity provider fees.</li>
 <li><strong>Automatic HYPE & KNTQ Protocol Buybacks</strong>: Ascend captures a 1% platform transaction fee on trading activity within its pools. A substantial portion of this revenue is routed into Ascend's native 50:50 buyback split of HYPE and KNTQ (with 60% of purchased KNTQ permanently burned). Thus, AEGIS fee volume automatically drives deflationary pressure across the broader Kinetiq ecosystem.</li>
 <li><strong>kHYPE Staker Liquidity Distribution (70,000,000 $AEGIS)</strong>: Dedicated allocation integrated with Ascend's kHYPE yield mechanism. Users who stake native HYPE to receive kHYPE on Kinetiq receive periodic $AEGIS distributions without needing to sell their primary assets.</li>
 <li><strong>Protocol-Owned Liquidity (POL) on Ascend (63,000,000 $AEGIS)</strong>: Permanently paired with USDC/HYPE in an Ascend Closed Hook Pool to anchor unbreakable, slippage-resistant day-1 liquidity.</li>
 <li><strong>The Ascension Graduation Pipeline</strong>: Meeting Ascend's volume, liquidity, and Sentinel decentralization milestones triggers protocol graduation across the Mirror Bridge to HyperEVM, leading to native CLOB listing on HyperCore spot and HIP-3 perpetual markets on Kinetiq.</li>
 </ul>

 <h2>5. Comprehensive Token Allocation Matrix</h2>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr>
 <th>Allocation Category</th>
 <th>Share (%)</th>
 <th>Token Amount</th>
 <th>TGE Unlock</th>
 <th>Cliff</th>
 <th>Vesting Schedule</th>
 <th>Operational Role</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td><strong>Ascend Ecosystem & Community</strong></td>
 <td><code>26.0%</code></td>
 <td>182,000,000</td>
 <td>10.0% (18.2M)</td>
 <td>0 mos</td>
 <td>24 mos linear</td>
 <td>kHYPE stakers, Ascend LP incentives, and community rewards</td>
 </tr>
 <tr>
 <td><strong>Community & Sentinel Incentives</strong></td>
 <td><code>26.0%</code></td>
 <td>182,000,000</td>
 <td>5.0% (9.1M)</td>
 <td>0 mos</td>
 <td>36 mos linear</td>
 <td>Sentinel 24/7 node uptime, telemetry relays, bug bounties</td>
 </tr>
 <tr>
 <td><strong>Ascend Launchpad Fair Launch</strong></td>
 <td><code>13.0%</code></td>
 <td>91,000,000</td>
 <td>100.0% (91M)</td>
 <td>0 mos</td>
 <td>Instant (100%)</td>
 <td>Day-1 public liquidity via Ascend Closed Hook Pool</td>
 </tr>
 <tr>
 <td><strong>Protocol Security & Insurance</strong></td>
 <td><code>15.0%</code></td>
 <td>105,000,000</td>
 <td>0.0%</td>
 <td>12 mos</td>
 <td>36 mos linear</td>
 <td>DAO multi-sig emergency backstop reserve for black swan events</td>
 </tr>
 <tr>
 <td><strong>Core Contributors & Team</strong></td>
 <td><code>12.0%</code></td>
 <td>84,000,000</td>
 <td>0.0%</td>
 <td>24 mos</td>
 <td>48 mos linear</td>
 <td>Strict 2-year hard cliff; zero tokens until Month 25 (6-year horizon)</td>
 </tr>
 <tr>
 <td><strong>Strategic Partners & Foundation</strong></td>
 <td><code>8.0%</code></td>
 <td>56,000,000</td>
 <td>0.0%</td>
 <td>18 mos</td>
 <td>36 mos linear</td>
 <td>Audits, legal structuring, institutional risk models</td>
 </tr>
 </tbody>
 </table>
 </div>

 <h2>6. Ultra-Strict Core Contributor Lockup</h2>
 <p>To demonstrate absolute institutional commitment and eliminate any possibility of mercenary team dumping, Core Contributor tokens adhere to an industry-leading vesting standard:</p>
 
 <div class="callout callout-warning">
 <div class="callout-icon">[SEC]</div>
 <div class="callout-body">
 <div class="callout-title">The 24-Month Hard Cliff Guarantee</div>
 Core contributors receive <strong>0 tokens at TGE</strong> and <strong>0 tokens throughout the entire first 24 months</strong>. Not a single team token enters circulation until the protocol has been operational in production for two full years.
 </div>
 </div>

 <ul>
 <li><strong>Cliff Duration</strong>: 24 months (Months 1–24: 0 tokens unlocked).</li>
 <li><strong>Vesting Schedule</strong>: 48 months linear block-by-block progression from Month 25 through Month 72.</li>
 <li><strong>Monthly Emission</strong>: Exactly 1,750,000 $AEGIS per month (~0.25% of total supply).</li>
 <li><strong>Full Maturity</strong>: Month 72 (6 years post-TGE).</li>
 </ul>

 <h2>7. The Four Core Value Accrual Pillars</h2>
 <p>Every tokenomic mechanic is implemented directly in smart contract bytecode on Elysium L2:</p>

 <div class="lifecycle-flow">
 <div class="flow-step">
 <div class="step-num">1</div>
 <div class="step-content">
 <div class="step-title">Sentinel Node Operator Bonding (PoS / Bonded Keepers)</div>
 <div class="step-desc">
 Under <code>AegisSentinelRegistry.sol</code>, node operators must bond at least <strong>25,000 $AEGIS</strong> (<code>MIN_BOND</code>) to run an active keeper daemon. Slashed penalties (enforced strictly &le; 10% by Invariant <strong>INV-2</strong>) route directly to victim vault restitution. 400 active sentinel nodes permanently lock <strong>10,000,000 $AEGIS</strong> out of circulation.
 </div>
 </div>
 </div>

 <div class="flow-step">
 <div class="step-num">2</div>
 <div class="step-content">
 <div class="step-title">Counter-Cyclical Market Buyback & Permanent Burn</div>
 <div class="step-desc">
 Under <code>AegisFeeCollector.sol</code>, every averted liquidation triggers a 10% performance fee on the saved penalty. Exactly 50% of this fee routes to the Ascend Closed Hook Pool to market-buy $AEGIS and permanently destroy it at <code>0x000000000000000000000000000000000000dEaD</code> (Invariant <strong>INV-4</strong>).
 </div>
 </div>
 </div>

 <div class="flow-step">
 <div class="step-num">3</div>
 <div class="step-content">
 <div class="step-title">Real Yield Staker Cash Flow (Zero Inflation)</div>
 <div class="step-desc">
 The remaining 50% of captured performance fees is distributed directly in <strong>USDC and native debt assets</strong> to governance stakers. Stakers earn sustainable cash flow without inflationary token dilution or mercenary farming mechanics.
 </div>
 </div>
 </div>

 <div class="flow-step">
 <div class="step-num">4</div>
 <div class="step-content">
 <div class="step-title">Institutional TVL Protection Quotas</div>
 <div class="step-desc">
 Under <code>AegisVault.sol</code>, institutional traders lock $AEGIS at a 1:50 ratio (1 $AEGIS locked per 50 units of protected debt) to access sub-second execution lanes, customized trailing take-profit parameters (&tau;), and reduced fee tiers.
 </div>
 </div>
 </div>
 </div>

 <h2>8. Circulating Supply Emission Milestones</h2>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr>
 <th>Milestone Timeline</th>
 <th>Gross Circulating Supply</th>
 <th>% of 700M Hard Cap</th>
 <th>Unlocking Components & Tranches</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td><strong>TGE (Day 1)</strong></td>
 <td>118,300,000</td>
 <td><code>16.9%</code></td>
 <td>91M Ascend Fair Launch + 18.2M Ascend initial float + 9.1M Keeper float</td>
 </tr>
 <tr>
 <td><strong>Month 6</strong></td>
 <td>155,700,000</td>
 <td><code>22.2%</code></td>
 <td>Linear community emissions; zero team/investor unlocks</td>
 </tr>
 <tr>
 <td><strong>Month 12</strong></td>
 <td>201,100,000</td>
 <td><code>28.7%</code></td>
 <td>Protocol Security Reserve cliff begins (governed by DAO multi-sig)</td>
 </tr>
 <tr>
 <td><strong>Month 18</strong></td>
 <td>254,500,000</td>
 <td><code>36.4%</code></td>
 <td>Strategic Partner & Foundation cliff ends (1.55M/mo linear)</td>
 </tr>
 <tr>
 <td><strong>Month 24</strong></td>
 <td>308,000,000</td>
 <td><code>44.0%</code></td>
 <td><strong>Core Team 24-Month Cliff ends</strong>; linear vesting begins</td>
 </tr>
 <tr>
 <td><strong>Month 36</strong></td>
 <td>472,000,000</td>
 <td><code>67.4%</code></td>
 <td>Ascend community pool (24m) and Sentinel pool (36m) conclude</td>
 </tr>
 <tr>
 <td><strong>Month 48</strong></td>
 <td>586,000,000</td>
 <td><code>83.7%</code></td>
 <td>Foundation pool fully vested; only team tail vesting remains</td>
 </tr>
 <tr>
 <td><strong>Month 72 (Year 6)</strong></td>
 <td>700,000,000</td>
 <td><code>100.0%</code></td>
 <td>Core Team 48-month linear vesting complete; 100% supply fully issued</td>
 </tr>
 </tbody>
 </table>
 </div>
 <p><em>Notice: Gross circulating supply indicates theoretical maximums. Because <code>AegisFeeCollector.sol</code> continuously routes 50% of protocol performance fees to permanent burning at <code>0x...dEaD</code>, the net circulating supply will diverge progressively below these figures as adoption expands.</em></p>

 <h2>9. Parametric Quant Lifecycle (Non-Monetary Model)</h2>
 <p>The mathematical lifecycle of a risk event operates strictly across quantitative units and state variables:</p>

 <div class="math-card">
 <div class="math-title">Parametric Performance Fee Invariant</div>
 <div class="math-formula">\\text{Fee}_{\\text{protocol}} = \\text{bps}_{\\text{fee}} \\times (D_{\\text{total}} \\times L_{\\text{penalty}}) = 0.10 \\times (D_{\\text{total}} \\times 0.10)</div>
 <table class="math-legend">
 <tr><td>D_{\\text{total}}</td><td>Total borrowed debt in the protected vault</td><td>Base units</td></tr>
 <tr><td>L_{\\text{penalty}}</td><td>Avoided liquidation surcharge (e.g., 10%)</td><td>Dimensionless ratio</td></tr>
 <tr><td>\\text{bps}_{\\text{fee}}</td><td>Protocol performance fee (1,000 bps = 10%)</td><td>Constant (AegisFeeCollector)</td></tr>
 </table>
 </div>

 <div class="math-card">
 <div class="math-title">Ascend Buyback & Permanent Burn Allocation</div>
 <div class="math-formula">\\text{Fee}_{\\text{burn}} = 0.50 \\times \\text{Fee}_{\\text{protocol}} \\implies \\text{swap}(\\text{Debt}, \\text{\$AEGIS}) \\longrightarrow 0x000...\\text{dEaD}</div>
 <div class="math-formula">\\text{Fee}_{\\text{yield}} = 0.50 \\times \\text{Fee}_{\\text{protocol}} \\implies \\text{distribute}(\\text{Debt}) \\longrightarrow \\text{Stakers}</div>
 <table class="math-legend">
 <tr><td>\\text{Fee}_{\\text{burn}}</td><td>50% routed to Ascend Closed Hook Pool</td><td>Burned permanently</td></tr>
 <tr><td>\\text{Fee}_{\\text{yield}}</td><td>50% routed to Staking Vault</td><td>Real cash-flow yield</td></tr>
 <tr><td>INV-4</td><td>Strict fee conservation (Fee_total = Fee_burn + Fee_yield)</td><td>Formally verified</td></tr>
 </table>
 </div>

 <h2>10. Protocol Governance Administration</h2>
 <p>$AEGIS holders participate in decentralized governance across protocol risk parameters:</p>
 <ul>
 <li><strong>Liquidation Threshold Multipliers ($T$)</strong>: Adjusting margin safety buffers across collateral types.</li>
 <li><strong>Supported HyperCore Perpetual Markets</strong>: Approving new perpetual contract indices on HyperCore for hedging.</li>
 <li><strong>Sentinel Slashing Boundaries</strong>: Tuning maximum slash percentages (bounded &le; 10%) and uptime SLA standards.</li>
 <li><strong>Ascend Hook Pool Parameters</strong>: Adjusting liquidity distribution parameters and fee recycling ratios.</li>
 </ul>
 </div>
 `
 },

 // PART VI: SENTINEL NODE OPERATIONS & SECURITY
 {
 id: 'sentinel-operator-guide',
 category: 'Operations & Security',
 tag: 'NODE',
 title: 'Sentinel Node Operator Guide',
 subtitle: 'Requirements, bonding protocol, latency SLAs, and operational runbook for autonomous Sentinel keepers.',
 prev: { id: 'tokenomics', title: '$AEGIS Tokenomics & Economy' },
 next: { id: 'security-invariants', title: 'Formal Security Model & Verification' },
 content: `
 <div class="docs-section">
 <h2>1. Operator Overview & Responsibilities</h2>
 <p>Sentinel nodes form the decentralized execution backbone of AEGIS. Nodes continuously monitor registered vaults on Elysium L2, evaluate trigger conditions, calculate required hedge sizes, and submit trade intents directly to HyperCore.</p>

 <h2>2. Node Operator Requirements</h2>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead><tr><th>Requirement</th><th>Specification</th><th>Rationale</th></tr></thead>
 <tbody>
 <tr>
 <td><strong>Bond Stake</strong></td>
 <td>25,000 $AEGIS</td>
 <td>Economic slashable collateral deposited in <code>AegisSentinelRegistry.sol</code>.</td>
 </tr>
 <tr>
 <td><strong>Compute Specs</strong></td>
 <td>8 vCPU, 32GB RAM, NVMe SSD</td>
 <td>Required to evaluate thousands of health factor curves per 100ms block.</td>
 </tr>
 <tr>
 <td><strong>Network Latency</strong></td>
 <td>&lt; 50ms to Elysium Validator Mesh</td>
 <td>Guarantees order intent dispatch within the 3-block SLA.</td>
 </tr>
 <tr>
 <td><strong>Software Daemon</strong></td>
 <td><code>@aegis/sentinel</code> (Node 20+)</td>
 <td>Official open-source TypeScript daemon runtime.</td>
 </tr>
 </tbody>
 </table>
 </div>

 <h2>3. Service Level Agreement (SLA) & Slashing Conditions</h2>
 <p>Under invariant <code>INV-2</code>, Sentinel nodes operate under strict economic penalties:</p>
 <ul>
 <li><strong>Lateness SLA Breach</strong>: If a vault breaches its trigger threshold and an assigned Sentinel fails to emit an order intent within <strong>3 Elysium blocks (~450ms)</strong>, 10% of their 25,000 $AEGIS bond (2,500 $AEGIS) is slashed.</li>
 <li><strong>Slippage Breach</strong>: If an intent executes on HyperCore with slippage exceeding the user's <code>maxSlippageBps</code> setting, the Sentinel is slashed and the funds are redirected to compensate the user.</li>
 </ul>
 </div>
 `
 },
 {
 id: 'security-invariants',
 category: 'Operations & Security',
 tag: 'SEC',
 title: 'Formal Security Model & Verification',
 subtitle: 'Cryptographic boundaries, trust assumptions, threat vector analysis, and protocol limitations.',
 prev: { id: 'sentinel-operator-guide', title: 'Sentinel Node Operator Guide' },
 next: { id: 'developer-quickstart', title: 'Developer Integration Quickstart' },
 content: `
 <div class="docs-section">
 <h2>1. Threat Vector & Attack Surface Analysis</h2>
 <p>A rigorous DeFi protocol must explicitly articulate its adversarial models and mitigations:</p>

 <div class="table-wrapper">
 <table class="tech-table">
 <thead><tr><th>Attack Vector</th><th>Potential Impact</th><th>AEGIS Architectural Mitigation</th></tr></thead>
 <tbody>
 <tr>
 <td><strong>Rogue Sentinel Key Theft</strong></td>
 <td>Attacker attempts to drain user collateral</td>
 <td><strong>INV-1</strong>: Session keys possess zero withdrawal bytecode. Only limit orders via <code>0x0802</code> are callable.</td>
 </tr>
 <tr>
 <td><strong>Oracle Manipulation / Flash Crash</strong></td>
 <td>False triggers causing unnecessary hedging</td>
 <td>Precompile <code>0x0801</code> reads multi-depth CLOB order books rather than single-tick AMM spot prices.</td>
 </tr>
 <tr>
 <td><strong>CLOB Liquidity Exhaustion</strong></td>
 <td>Hedge orders fail to fill or suffer slippage</td>
 <td>Partial coverage scaling ($\gamma$) and user-defined <code>maxSlippageBps</code> abort executions exceeding depth.</td>
 </tr>
 <tr>
 <td><strong>Replay Attacks Across Blocks</strong></td>
 <td>Duplicate trade orders draining margin</td>
 <td><strong>INV-5</strong>: Monotonic sequential nonces enforced on-chain per vault position.</td>
 </tr>
 </tbody>
 </table>
 </div>

 <h2>2. Residual Market Risks & Limitations</h2>
 <p>Documentation must disclose true protocol boundaries. AEGIS does not eliminate market risk; it mitigates directional liquidation:</p>
 <ul>
 <li><strong>Funding Rate Drag</strong>: Holding short perpetuals during extended bull markets incurs funding rate charges payable to long traders.</li>
 <li><strong>Severe Gap Risk</strong>: In sudden protocol insolvencies (e.g. underlying collateral token exploit), prices may drop 90% without resting bids, rendering short hedges impossible to fill.</li>
 </ul>
 </div>
 `
 },

 // PART VIII: DEVELOPER INTEGRATION
 {
 id: 'developer-quickstart',
 category: 'Developer Integration',
 tag: 'DEV',
 title: 'Developer Integration Quickstart',
 subtitle: 'Code walkthroughs, SDK examples, and Ethers.js/Viem patterns for integrating AEGIS.',
 prev: { id: 'security-invariants', title: 'Formal Security Model & Verification' },
 next: { id: 'brand-kit', title: 'AEGIS Brand Kit & Design System' },
 content: `
 <div class="docs-section">
 <h2>1. Connecting to Elysium L2</h2>
 <p>Developers can interact with AEGIS contracts on Elysium using standard Web3 libraries:</p>

 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title"><span>[CODE]</span> TypeScript SDK Quickstart</div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Code</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-kw">import</span> { ethers } <span class="tok-kw">from</span> <span class="tok-str">"ethers"</span>;

<span class="tok-cmt">// Elysium L2 Configuration</span>
<span class="tok-kw">const</span> ELYSIUM_RPC = <span class="tok-str">"https://rpc.elysium.network"</span>;
<span class="tok-kw">const</span> VAULT_ADDRESS = <span class="tok-str">"0x1234567890123456789012345678901234567890"</span>;

<span class="tok-kw">async function</span> <span class="tok-fn">checkVaultHealth</span>(userAddress: <span class="tok-typ">string</span>) {
 <span class="tok-kw">const</span> provider = <span class="tok-kw">new</span> ethers.JsonRpcProvider(ELYSIUM_RPC);
 <span class="tok-kw">const</span> vaultAbi = [
 <span class="tok-str">"function getHealthFactor(address user) view returns (uint256)"</span>,
 <span class="tok-str">"function manualOverride() external"</span>
 ];
 
 <span class="tok-kw">const</span> vault = <span class="tok-kw">new</span> ethers.Contract(VAULT_ADDRESS, vaultAbi, provider);
 <span class="tok-kw">const</span> rawHealth = <span class="tok-kw">await</span> vault.getHealthFactor(userAddress);
 
 <span class="tok-cmt">// Health factor is scaled 1e4 (e.g. 11000 = 1.10)</span>
 <span class="tok-kw">const</span> healthFactor = Number(rawHealth) / 10000;
 console.log(<span class="tok-str">\`User \${userAddress} Health Factor: \${healthFactor}\`</span>);

 <span class="tok-kw">if</span> (healthFactor &lt; 1.05) {
 console.warn(<span class="tok-str">"CRITICAL: Position approaching liquidation threshold!"</span>);
 }
}</code></pre>
 </div>
 </div>

 <h2>2. Delegating Session Keys via Contract Call</h2>
 <div class="code-block-container">
 <div class="code-header">
 <div class="code-title"><span>[AUTH]</span> Delegating Ephemeral Session Key</div>
 <button class="copy-btn" onclick="copyCode(this)">Copy Code</button>
 </div>
 <div class="code-body">
 <pre><code><span class="tok-kw">async function</span> <span class="tok-fn">delegateSessionKey</span>(signer: ethers.<span class="tok-typ">Signer</span>) {
 <span class="tok-cmt">// Generate ephemeral trade-only keypair</span>
 <span class="tok-kw">const</span> sessionWallet = ethers.Wallet.createRandom();
 <span class="tok-kw">const</span> durationSeconds = 86400 * 30; <span class="tok-cmt">// 30 days</span>

 <span class="tok-kw">const</span> vault = <span class="tok-kw">new</span> ethers.Contract(
 VAULT_ADDRESS,
 [<span class="tok-str">"function delegateSessionKey(address key, uint64 duration) external"</span>],
 signer
 );

 <span class="tok-kw">const</span> tx = <span class="tok-kw">await</span> vault.delegateSessionKey(sessionWallet.address, durationSeconds);
 <span class="tok-kw">await</span> tx.wait();

 console.log(<span class="tok-str">\`Session key delegated successfully: \${sessionWallet.address}\`</span>);
 <span class="tok-kw">return</span> sessionWallet;
}</code></pre>
 </div>
 </div>
 </div>
 `
 },

 // PART VII: BRAND SYSTEM & DESIGN STANDARDS
 {
 id: 'brand-kit',
 category: 'Brand System',
 tag: 'BRAND',
 title: 'AEGIS Brand Kit & Design System',
 subtitle: 'Authoritative visual identity standards, master mark geometry, CSS color tokens, typography scale, and component guidelines.',
 prev: { id: 'developer-quickstart', title: 'Developer Integration Quickstart' },
 next: null,
 content: `
 <div class="docs-section">
 <h2>1. Master Mark & Visual Identity</h2>
 <p>The AEGIS mark embodies three razor blades rising from a single baseline. Each blade symbolizes an interlocking layer of defense: position monitoring, sub-second hedging, and trailing recovery. The mark must always be rendered from the official SVG geometry and never redrawn or distorted.</p>

 <div class="logo-display-box">
 <svg viewBox="0 0 40 40" style="width: 72px; height: 72px;" aria-hidden="true">
 <polygon points="13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38" fill="url(#mk-dark)"/>
 <polygon points="21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38" fill="url(#mk-dark)"/>
 <polygon points="30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38" fill="url(#mk-dark)"/>
 </svg>
 <div style="font-family: var(--display); font-size: 28px; color: var(--ink);">Aegis</div>
 <div style="font-size: 13px; color: var(--ink-2); text-align: center; max-width: 48ch;">
 Primary Lockup: Mark centered or left-aligned with wordmark in Marcellus. The canonical 154° gradient runs from #1F0E4C at 0% to #087E6D at 100%.
 </div>
 </div>

 <div class="callout callout-important">
 <div class="callout-icon">[MATH]</div>
 <div class="callout-body">
 <div class="callout-title">Mark Clear Space & Minimum Sizing Rules</div>
 Maintain at least one blade width (x) of clear margin on every side. Minimum display size on digital screens is 24px tall for the standalone mark, and 120px wide for the complete lockup. Glow effects are strictly permitted only on dark grounds and forbidden on light grounds.
 </div>
 </div>

 <h2>2. Authoritative CSS Color Tokens</h2>
 <p>All user interfaces must import <code>brand/kit/tokens.css</code> and reference colors exclusively through CSS variables. Hardcoding hexadecimal or RGB literals is strictly prohibited by <code>AGENTS.md</code>.</p>

 <div class="blade-band-demo" title="135° Blade Ground Gradient"></div>
 <p style="font-size: 12.5px; color: var(--ink-2); margin-top: -8px; margin-bottom: 24px;">The Blade gradient (<code>--bg-base</code>) runs diagonally at 135° and serves as the global backdrop in both themes.</p>

 <div class="swatches-grid">
 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--ground); color: var(--ink);">Ground</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--ground</dd>
 <dt>Dark</dt><dd>#1C2238</dd>
 <dt>Light</dt><dd>#F7F1FA</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Page base surface</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--raised); color: var(--ink);">Raised</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--raised</dd>
 <dt>Dark</dt><dd>#22403F</dd>
 <dt>Light</dt><dd>#FFFFFF</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Cards and panels</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--ink); color: var(--ground);">Ink</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--ink</dd>
 <dt>Dark</dt><dd>#E8ECF8</dd>
 <dt>Light</dt><dd>#161230</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Headlines & body</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--ink-2); color: var(--ground);">Ink 2</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--ink-2</dd>
 <dt>Dark</dt><dd>#A7AFCB</dd>
 <dt>Light</dt><dd>#5C5778</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Supporting copy</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--accent); color: var(--on-accent);">Accent</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--accent</dd>
 <dt>Dark</dt><dd>#5FD9BE</dd>
 <dt>Light</dt><dd>#07705F</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Live, primary action</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--hedge); color: var(--ink);">Hedge</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--hedge</dd>
 <dt>Dark</dt><dd>#FFBE7A</dd>
 <dt>Light</dt><dd>#A34A08</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Hedge active state</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--danger); color: var(--ink);">Danger</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--danger</dd>
 <dt>Dark</dt><dd>#FF8A9A</dd>
 <dt>Light</dt><dd>#B8254F</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Liquidation risk</dd>
 </dl>
 </div>

 <div class="swatch-card">
 <div class="swatch-chip" style="background: var(--violet); color: var(--ink);">Violet</div>
 <dl class="swatch-details">
 <dt>Token</dt><dd>--violet</dd>
 <dt>Dark</dt><dd>#C9A6FF</dd>
 <dt>Light</dt><dd>#6930EA</dd>
 <dt>Role</dt><dd style="font-family: inherit;">Mark & graphics only</dd>
 </dl>
 </div>
 </div>

 <h2>3. Measured Contrast Ratios (WCAG AA Compliance)</h2>
 <div class="table-wrapper">
 <table class="tech-table">
 <thead>
 <tr><th>Pairing</th><th>Theme Mode</th><th>Contrast Ratio</th><th>WCAG Standard</th></tr>
 </thead>
 <tbody>
 <tr><td>Ink on Blade Ground</td><td>Dark Mode</td><td class="num">13.3 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AAA)</td></tr>
 <tr><td>Ink 2 on Raised Panel</td><td>Dark Mode</td><td class="num">5.1 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Accent on Raised Panel</td><td>Dark Mode</td><td class="num">6.5 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Hedge on Raised Panel</td><td>Dark Mode</td><td class="num">6.9 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Danger on Raised Panel</td><td>Dark Mode</td><td class="num">5.0 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Ink on Paper Surface</td><td>Light Mode</td><td class="num">18.1 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AAA)</td></tr>
 <tr><td>Ink 2 on Paper Surface</td><td>Light Mode</td><td class="num">6.1 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Accent on White Panel</td><td>Light Mode</td><td class="num">6.0 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Hedge on White Panel</td><td>Light Mode</td><td class="num">5.9 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 <tr><td>Danger on White Panel</td><td>Light Mode</td><td class="num">6.1 : 1</td><td style="color:var(--accent);font-weight:600;">Pass (AA)</td></tr>
 </tbody>
 </table>
 </div>

 <h2>4. Typography Guidelines</h2>
 <p>The AEGIS design system mandates exactly two typeface families:</p>
 <ul>
 <li><strong>Display (<code>--display</code>)</strong>: <code>Marcellus</code> (Georgia fallback). Used for headlines, hero metrics, and the official wordmark. Display headings use balanced line breaking (<code>text-wrap: balance</code>).</li>
 <li><strong>Text & UI (<code>--text</code>)</strong>: <code>Inter</code> (system-ui fallback). Light 300 for display lines, 400 for running body text, 500 for labels, and 600 for semibold emphasis.</li>
 <li><strong>Numerical Data</strong>: All dynamic numerals, liquidation ratios, and prices enforce tabular figures (<code>font-variant-numeric: tabular-nums</code>).</li>
 </ul>

 <h2>5. Surfaces, Layout & Component Standards</h2>
 <ul>
 <li><strong>Panels & Bento Surfaces</strong>: Flat cards with a <code>16px</code> border radius, a hairline <code>1px solid var(--rule)</code> border, and <code>var(--raised)</code> background. Elevation is communicated through border contrast, not decorative drop shadows.</li>
 <li><strong>Action Buttons</strong>: Primary buttons use fully rounded pill shapes (<code>border-radius: 999px</code>), solid <code>var(--accent)</code> background, and <code>var(--on-accent)</code> text. Secondary actions use ghost buttons with rule borders.</li>
 <li><strong>Status Badges</strong>: Outlined pill badges color-coded by state: teal for Healthy, amber for Hedge Active, rose for Liquidation Risk.</li>
 </ul>

 <h2>6. Brand Voice & Editorial Tone</h2>
 <div class="callout callout-note">
 <div class="callout-icon">[NOTE]</div>
 <div class="callout-body">
 <div class="callout-title">Calm Under Pressure</div>
 AEGIS deals with capital defense and liquidation risk. Communications must remain calm, exact, and unemotional. Use active voice and sentence case. Provide exact figures with units ($22,000, 12.40 ETH, 1.20). Strictly avoid exclamation points, rocket emojis, or hype-laden marketing jargon.
 </div>
 </div>

 <h2>7. Open Brand Items</h2>
 <p>In accordance with <code>AGENTS.md</code>, two open items remain subject to core community resolution:</p>
 <ol>
 <li><strong>Wordmark Case</strong>: The web properties write "Aegis" in sentence case Marcellus, while social headers use tracked all-caps "AEGIS". Developers must not unilaterally resolve this; follow the kit as written.</li>
 <li><strong>Navy on White</strong>: The navy color token (<code>#1C2238</code>) on light backgrounds is under review for final tinting.</li>
 </ol>

 <h2>8. Authoritative Standalone Brand Kit</h2>
 <p>For interactive colorway inspectors, download links for master vector marks (<code>brand/logo/aegis-mark.svg</code>), and official avatar/banner files for social platforms, open the dedicated standalone brand kit:</p>
 <div style="margin-top: 16px;">
 <a href="../brand/kit/aegis-brand-kit.html" class="header-action-btn" target="_blank" rel="noopener">Open Interactive Aegis Brand Kit ↗</a>
 </div>
 </div>
 `
 }
 ];

 // --- 2. APPLICATION STATE ---
 let activePageId = 'welcome';
 let isSearchOpen = false;

 // --- 3. DOM ELEMENT CACHE ---
 const el = {
 root: document.documentElement,
 themeBtn: document.getElementById('themeBtn'),
 themeLabel: document.getElementById('themeLabel'),
 navToggleBtn: document.getElementById('navToggleBtn'),
 sidebar: document.getElementById('docsSidebar'),
 sidebarBackdrop: document.getElementById('sidebarBackdrop'),
 breadcrumbsNav: document.getElementById('breadcrumbsNav'),
 pageTitle: document.getElementById('pageTitle'),
 pageSubtitle: document.getElementById('pageSubtitle'),
 pageCategoryPill: document.getElementById('pageCategoryPill'),
 pageStatusPill: document.getElementById('pageStatusPill'),
 contentArea: document.getElementById('docsContentArea'),
 pageNavWrapper: document.getElementById('docsPageNavWrapper'),
 tocList: document.getElementById('tocList'),
 searchTrigger: document.getElementById('searchTriggerBtn'),
 mobileSearch: document.getElementById('mobileSearchBtn'),
 searchBackdrop: document.getElementById('searchModalBackdrop'),
 searchInput: document.getElementById('searchModalInput'),
 searchResults: document.getElementById('searchResultsList')
 };

 // --- 4. ROUTER & PAGE RENDERER ---
 function getPage(id) {
 return DOCS_DATA.find(p => p.id === id) || DOCS_DATA[0];
 }

 function renderPage(pageId, scrollToHash) {
 const page = getPage(pageId);
 activePageId = page.id;

 // Update document title
 document.title = `${page.title} — AEGIS Protocol Documentation`;

 // Update Header & Breadcrumbs
 el.breadcrumbsNav.innerHTML = `
 <a href="#welcome">Docs</a>
 <span class="breadcrumb-separator">/</span>
 <span>${page.category}</span>
 <span class="breadcrumb-separator">/</span>
 <span style="color:var(--ink);">${page.title}</span>
 `;

 el.pageTitle.textContent = page.title;
 el.pageSubtitle.textContent = page.subtitle;
 el.pageCategoryPill.textContent = page.category;
 el.pageStatusPill.textContent = page.tag === 'DEV' ? 'Code Sample' : (page.tag === 'SOL' ? 'Contract Spec' : 'Live Spec');

 // Render Body Content
 el.contentArea.innerHTML = page.content;

 // Render Previous / Next Pagination Cards
 let navHtml = '';
 if (page.prev) {
 navHtml += `
 <a class="nav-card nav-prev" href="#${page.prev.id}">
 <span class="nav-card-label">← Previous</span>
 <span class="nav-card-title">${page.prev.title}</span>
 </a>
 `;
 } else {
 navHtml += '<div></div>';
 }

 if (page.next) {
 navHtml += `
 <a class="nav-card nav-next" href="#${page.next.id}">
 <span class="nav-card-label">Next →</span>
 <span class="nav-card-title">${page.next.title}</span>
 </a>
 `;
 } else {
 navHtml += '<div></div>';
 }
 el.pageNavWrapper.innerHTML = navHtml;

 // Update Sidebar Active Class
 document.querySelectorAll('.sidebar-nav-item').forEach(item => {
 const link = item.querySelector('a');
 if (link && link.getAttribute('href') === `#${page.id}`) {
 item.classList.add('active');
 } else {
 item.classList.remove('active');
 }
 });

 // Build Table of Contents
 buildTableOfContents();

 // Scroll to Top or Section Anchor
 if (scrollToHash) {
 const targetElem = document.getElementById(scrollToHash);
 if (targetElem) {
 targetElem.scrollIntoView({ behavior: 'smooth' });
 return;
 }
 }
 window.scrollTo({ top: 0, behavior: 'instant' });

 // Close Mobile Drawer if open
 closeMobileDrawer();
 }

 // --- 5. TABLE OF CONTENTS & SCROLL-SPY ---
 function buildTableOfContents() {
 el.tocList.innerHTML = '';
 const headings = el.contentArea.querySelectorAll('h2, h3');
 
 if (headings.length === 0) {
 el.tocList.innerHTML = '<li class="toc-item"><span style="color:var(--ink-2);font-size:12px;">No subheadings</span></li>';
 return;
 }

 headings.forEach((h, index) => {
 if (!h.id) {
 h.id = 'heading-' + index + '-' + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
 }

 const li = document.createElement('li');
 li.className = 'toc-item' + (h.tagName === 'H3' ? ' level-3' : '');
 li.innerHTML = `<a href="#${activePageId}" data-target="${h.id}">${h.textContent.replace(/^[0-9.]+\s*/, '')}</a>`;
 
 li.querySelector('a').addEventListener('click', (e) => {
 e.preventDefault();
 h.scrollIntoView({ behavior: 'smooth' });
 updateActiveToc(h.id);
 });

 el.tocList.appendChild(li);
 });

 setupScrollSpy();
 }

 function updateActiveToc(headingId) {
 el.tocList.querySelectorAll('.toc-item').forEach(item => {
 const a = item.querySelector('a');
 if (a && a.getAttribute('data-target') === headingId) {
 item.classList.add('active');
 } else {
 item.classList.remove('active');
 }
 });
 }

 let scrollSpyObserver = null;
 function setupScrollSpy() {
 if (scrollSpyObserver) scrollSpyObserver.disconnect();

 const headings = el.contentArea.querySelectorAll('h2, h3');
 if (headings.length === 0) return;

 scrollSpyObserver = new IntersectionObserver((entries) => {
 entries.forEach(entry => {
 if (entry.isIntersecting) {
 updateActiveToc(entry.target.id);
 }
 });
 }, {
 rootMargin: '-80px 0px -70% 0px',
 threshold: 0
 });

 headings.forEach(h => scrollSpyObserver.observe(h));
 }

 // --- 6. INSTANT SEARCH ENGINE ---
 function initSearch() {
 el.searchTrigger.addEventListener('click', openSearchModal);
 if (el.mobileSearch) el.mobileSearch.addEventListener('click', openSearchModal);
 
 document.addEventListener('keydown', (e) => {
 if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
 e.preventDefault();
 openSearchModal();
 } else if (e.key === 'Escape' && isSearchOpen) {
 closeSearchModal();
 } else if (e.key === '/' && !isSearchOpen && document.activeElement.tagName !== 'INPUT') {
 e.preventDefault();
 openSearchModal();
 }
 });

 el.searchBackdrop.addEventListener('click', (e) => {
 if (e.target === el.searchBackdrop) closeSearchModal();
 });

 el.searchInput.addEventListener('input', (e) => {
 executeSearch(e.target.value.trim());
 });
 }

 function openSearchModal() {
 isSearchOpen = true;
 el.searchBackdrop.classList.add('open');
 el.searchInput.value = '';
 executeSearch('');
 setTimeout(() => el.searchInput.focus(), 50);
 }

 function closeSearchModal() {
 isSearchOpen = false;
 el.searchBackdrop.classList.remove('open');
 }

 function executeSearch(query) {
 if (!query) {
 // Default view: Show major sections
 el.searchResults.innerHTML = DOCS_DATA.slice(0, 6).map((page, idx) => `
 <li class="search-result-item ${idx === 0 ? 'selected' : ''}">
 <a href="#${page.id}" onclick="window.aegisCloseSearch()">
 <div class="search-result-meta">${page.category} · ${page.tag}</div>
 <div class="search-result-title">${page.title}</div>
 <div class="search-result-excerpt">${page.subtitle}</div>
 </a>
 </li>
 `).join('');
 return;
 }

 const q = query.toLowerCase();
 const hits = [];

 DOCS_DATA.forEach(page => {
 const titleMatch = page.title.toLowerCase().includes(q);
 const subMatch = page.subtitle.toLowerCase().includes(q);
 const categoryMatch = page.category.toLowerCase().includes(q);
 
 // Plaintext content extraction for snippet
 const tempDiv = document.createElement('div');
 tempDiv.innerHTML = page.content;
 const text = tempDiv.textContent || tempDiv.innerText || '';
 const textIdx = text.toLowerCase().indexOf(q);

 if (titleMatch || subMatch || categoryMatch || textIdx !== -1) {
 let excerpt = page.subtitle;
 if (textIdx !== -1) {
 const start = Math.max(0, textIdx - 40);
 const end = Math.min(text.length, textIdx + 100);
 excerpt = '...' + text.slice(start, end).replace(new RegExp(q, 'gi'), match => `<span class="search-highlight">${match}</span>`) + '...';
 }

 hits.push({
 page,
 excerpt,
 score: (titleMatch ? 10 : 0) + (subMatch ? 5 : 0) + (textIdx !== -1 ? 2 : 0)
 });
 }
 });

 hits.sort((a, b) => b.score - a.score);

 if (hits.length === 0) {
 el.searchResults.innerHTML = `
 <li style="padding: 24px; text-align: center; color: var(--ink-2); font-size: 14px;">
 No documentation matches found for "<strong>${escapeHtml(query)}</strong>"
 </li>
 `;
 return;
 }

 el.searchResults.innerHTML = hits.map((hit, idx) => `
 <li class="search-result-item ${idx === 0 ? 'selected' : ''}">
 <a href="#${hit.page.id}" onclick="window.aegisCloseSearch()">
 <div class="search-result-meta">${hit.page.category} · ${hit.page.tag}</div>
 <div class="search-result-title">${highlightQuery(hit.page.title, query)}</div>
 <div class="search-result-excerpt">${hit.excerpt}</div>
 </a>
 </li>
 `).join('');
 }

 function highlightQuery(text, query) {
 if (!query) return escapeHtml(text);
 return escapeHtml(text).replace(new RegExp(query, 'gi'), match => `<span class="search-highlight">${match}</span>`);
 }

 function escapeHtml(str) {
 return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
 }

 window.aegisCloseSearch = closeSearchModal;

 // --- 7. THEME MANAGER ---
 function initTheme() {
 function getTheme() {
 const stored = localStorage.getItem('aegis-theme');
 if (stored) return stored;
 return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
 }

 function applyTheme(theme) {
 el.root.setAttribute('data-theme', theme);
 el.themeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
 el.themeBtn.setAttribute('aria-pressed', String(theme === 'light'));
 try { localStorage.setItem('aegis-theme', theme); } catch (e) {}
 }

 el.themeBtn.addEventListener('click', () => {
 const current = el.root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
 applyTheme(current === 'light' ? 'dark' : 'light');
 });

 window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
 if (!localStorage.getItem('aegis-theme')) {
 applyTheme(e.matches ? 'light' : 'dark');
 }
 });

 applyTheme(getTheme());
 }

 // --- 8. MOBILE DRAWER NAVIGATION ---
 function initMobileDrawer() {
 el.navToggleBtn.addEventListener('click', () => {
 el.sidebar.classList.toggle('drawer-open');
 el.sidebarBackdrop.classList.toggle('drawer-open');
 });

 el.sidebarBackdrop.addEventListener('click', closeMobileDrawer);
 }

 function closeMobileDrawer() {
 el.sidebar.classList.remove('drawer-open');
 el.sidebarBackdrop.classList.remove('drawer-open');
 }

 // --- 9. CLIPBOARD UTILITY ---
 window.copyCode = function (btn) {
 const codeBlock = btn.closest('.code-block-container').querySelector('code');
 if (!codeBlock) return;

 navigator.clipboard.writeText(codeBlock.innerText).then(() => {
 const origText = btn.textContent;
 btn.textContent = 'Copied!';
 btn.style.borderColor = 'var(--accent)';
 btn.style.color = 'var(--accent)';
 setTimeout(() => {
 btn.textContent = origText;
 btn.style.borderColor = '';
 btn.style.color = '';
 }, 2000);
 }).catch(err => {
 console.error('Copy failed', err);
 });
 };

 // --- 10. HASH ROUTING ---
 function handleHashChange() {
 const rawHash = window.location.hash.replace(/^#/, '');
 if (!rawHash) {
 renderPage('welcome');
 return;
 }

 // Check if hash matches a known page ID
 const matchedPage = DOCS_DATA.find(p => p.id === rawHash);
 if (matchedPage) {
 renderPage(matchedPage.id);
 } else {
 // Fallback: check if hash is an anchor on the current page
 renderPage(activePageId, rawHash);
 }
 }

 window.addEventListener('hashchange', handleHashChange);

 // --- 11. INITIALIZATION ---
 document.addEventListener('DOMContentLoaded', () => {
 initTheme();
 initSearch();
 initMobileDrawer();
 handleHashChange();
 });

})();
