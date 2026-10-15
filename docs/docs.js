/**
 * AEGIS Documentation Platform — Client-Side Engine
 * Search, Router, Scroll-Spy, Table of Contents, Theme Synchronization
 */

(function () {
 'use strict';

 // --- 1. DOCUMENTATION REGISTRY & CONTENT DATABASE ---
 const DOCS_DATA = [
  {
    "id": "welcome",
    "category": "Introduction",
    "tag": "CORE",
    "title": "Welcome to AEGIS",
    "subtitle": "The non-custodial risk engine and collateral protection protocol for Elysium L2 and HyperCore.",
    "prev": null,
    "next": {
      "id": "introducing-aegis",
      "title": "Official Introduction: AEGIS Protocol"
    },
    "content": "\n      <div class=\"docs-section\">\n        <div class=\"callout callout-important\">\n          <div class=\"callout-icon\">🛡️</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Production Verification Scorecard — 157 / 157 Automated Tests Passing</div>\n            AEGIS smart contracts, formal invariants, Sentinel keeper daemon, and live RPC truthfulness suites are 100% verified on the <code>main</code> branch.\n            Includes 115 Foundry tests across 14 suites (160,000+ fuzz runs), 29 Jest Keeper tests, and 13 live RPC truthfulness verifications.\n          </div>\n        </div>\n\n        <h2>1. Mission & Philosophy</h2>\n        <p>AEGIS is a decentralized risk engine designed to insulate leveraged traders, collateralized borrowers, and liquidity providers from the destructive consequences of forced liquidation. The core operational mantra of the protocol is simple and uncompromising:</p>\n        <div class=\"callout callout-important\">\n          <div class=\"callout-icon\">[INFO]</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Core Protocol Axiom: \"Hold the Line\"</div>\n            Traditional lending protocols enforce solvency through abrupt, irreversible collateral auctions that strip users of assets at fire-sale discounts. AEGIS introduces an autonomous synthetic hedging barrier that dynamically stabilizes positions <em>before</em> liquidation thresholds are breached.\n          </div>\n        </div>\n        <p>Rather than liquidating and selling underlying spot collateral into thin order books, AEGIS relies on high-speed autonomous Sentinel nodes to open counterbalancing short perpetual futures contracts on <strong>HyperCore</strong> (Hyperliquid's L1 high-frequency matching engine). Net directional delta exposure is neutralized while the borrower's collateral remains locked inside their primary vault under zero-custody delegation.</p>\n\n        <h2>2. Live Elysium Testnet Deployment</h2>\n        <p>AEGIS is live and operational on <strong>Elysium Orbit L2 Testnet (Chain ID <code>99801</code>)</strong>. To ensure zero reverts on stock Arbitrum Nitro ArbOS (prior to the upcoming validator precompile hardfork), AEGIS operates on a <strong>Modular Dual-Mode Architecture</strong>:</p>\n        <ul>\n          <li><strong>Modular Oracle Adapter (<code>RelayedOracleAdapter.sol</code>)</strong>: Provides mark price telemetry with strict 120s/300s staleness checks, hot-swapping to native precompile <code>0x0801</code> post-hardfork.</li>\n          <li><strong>Modular Dispatch Adapter (<code>AgentDispatchAdapter.sol</code>)</strong>: Dispatches trade intents to off-chain Sentinel keeper daemons via EVM events, hot-swapping to native predeploy <code>0x0802</code> post-hardfork.</li>\n          <li><strong>Canonical Testnet Tokens</strong>: Bound to canonical testnet USDC (<code>0x7D29d8047B905000459c0E80c34a26CeedcB47b2</code>) and WHYPE (<code>0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234</code>).</li>\n          <li><strong>Phase 1C Deferred Fee Debt</strong>: Unwinds are never blocked if liquid fee payment fails; debt is deterministically tracked in <code>feeDebts[user]</code> for non-blocking settlement.</li>\n        </ul>\n\n        <h2>3. How to Read This Documentation</h2>\n        <p>This technical knowledge base is organized progressively from foundational DeFi mechanics through advanced financial engineering, smart contract interfaces, node operations, formal verification proofs, and independent audit reports:</p>\n        <ul>\n          <li><strong>Part I: Introduction</strong> — High-level problem definition, official introduction article, economic motivation, protocol architecture overview, core glossary, and frequently asked questions.</li>\n          <li><strong>Part II: Core Concepts</strong> — Deep dive into collateral dynamics, directional delta risk, liquidation buffers, session keys, and the 14-stage hedge lifecycle.</li>\n          <li><strong>Part III: Protocol Mechanics</strong> — Concrete operational flow from synchronous 100ms market monitoring to sub-second intent execution and trailing profit unwinds.</li>\n          <li><strong>Part IV: Mathematical Specifications</strong> — Rigorous formal definitions of Health Factor ($H$), coverage ratio (\\\\gamma), trailing unwind parameter (\\\\tau), and worked numerical quant models.</li>\n          <li><strong>Part V: Smart Contract Architecture</strong> — Specifications and interface definitions for <code>AegisVault.sol</code>, <code>RelayedOracleAdapter.sol</code>, <code>AgentDispatchAdapter.sol</code>, <code>AegisSentinelRegistry.sol</code>, <code>AegisFeeCollector.sol</code>, and Precompiles.</li>\n          <li><strong>Part VI: Operations & Security</strong> — Sentinel node operator specifications, bonding requirements, formal verification invariants (INV-1 to INV-5), the <strong>Technical Fact-Check Dossier</strong>, and <strong>Audit History</strong>.</li>\n          <li><strong>Part VII: Developer Integration</strong> — Step-by-step code samples using Ethers.js and Viem for querying health factors, delegating session keys, and dispatching orders.</li>\n          <li><strong>Part VIII: Brand & Design System</strong> — Strict compliance guidelines referencing <code>brand/kit/tokens.css</code> and <code>AGENTS.md</code>.</li>\n        </ul>\n\n        <div class=\"callout callout-note\">\n          <div class=\"callout-icon\">ℹ️</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Brand and Specification Integrity Note</div>\n            In accordance with <code>AGENTS.md</code> and the authoritative AEGIS brand kit (<code>brand/kit/tokens.css</code>), this documentation maintains strict dual-theme accessibility (Light and Dark modes) and relies solely on vetted tokens. Open brand decisions (wordmark capitalization \"Aegis\" vs \"AEGIS\" and navy token nuances) remain active items subject to community governance.\n          </div>\n        </div>\n      </div>\n    "
  },
  {
    "id": "introducing-aegis",
    "category": "Introduction",
    "tag": "READ",
    "title": "Official Introduction: AEGIS Protocol",
    "subtitle": "The definitive technical introduction to AEGIS non-custodial risk engine, architecture, and HyperCore integration.",
    "prev": {
      "id": "welcome",
      "title": "Welcome to AEGIS"
    },
    "next": {
      "id": "problem-forced-liquidation",
      "title": "The Problem: Forced Liquidation"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. Executive Vision: The Liquidation Crisis in DeFi</h2>\n        <p>In debt-based decentralized financial systems, solvency is maintained by a blunt mechanism: forced liquidation. When volatile collateral depreciates, protocols deploy third-party liquidators who seize collateral at steep discounts (5% to 10% surcharges) and dump it onto automated market makers at the exact bottom of market crashes. For borrowers, this permanently destroys equity. For ecosystems, it triggers systemic cascading liquidations and MEV sandwiching.</p>\n\n        <p><strong>AEGIS introduces an autonomous synthetic hedging barrier that dynamically stabilizes positions before liquidation thresholds are breached.</strong> Rather than selling collateral, AEGIS opens counterbalancing short perpetual futures contracts on <strong>HyperCore</strong> (Hyperliquid's L1 high-frequency orderbook). Net directional delta exposure is neutralized while 100% of the collateral remains locked inside the user vault.</p>\n\n        <div class=\"callout callout-important\">\n          <div class=\"callout-icon\">⚡</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Architectural Highlights</div>\n            <ul>\n              <li><strong>Zero Custody Loss (Invariant INV-1)</strong>: Delegated session keys have strictly trade-only permissions. They possess zero transfer, withdrawal, or balance encumbrance capabilities.</li>\n              <li><strong>Modular Dual-Mode Architecture</strong>: Seamlessly bridges stock Arbitrum Orbit L2 (Elysium Testnet 99801) today via <code>RelayedOracleAdapter.sol</code> and <code>AgentDispatchAdapter.sol</code>, hot-swapping to native precompiles <code>0x0801</code> and <code>0x0802</code> post-hardfork.</li>\n              <li><strong>Phase 1C Deferred Fee Debt</strong>: Unwinds are non-blocking. If liquid USDC fee deduction fails, fee debts are tracked deterministically on-chain in <code>feeDebts[user]</code>, allowing position protection to proceed unconditionally.</li>\n              <li><strong>157 Passing Automated Tests</strong>: 115 Foundry unit & invariant fuzz tests (160,000+ runs), 29 Sentinel Keeper tests, and 13 live RPC truthfulness checks.</li>\n            </ul>\n          </div>\n        </div>\n\n        <h2>2. Protocol Lifecycle Overview</h2>\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead>\n              <tr><th>Stage</th><th>Mechanism</th><th>Latency / Threshold</th></tr>\n            </thead>\n            <tbody>\n              <tr>\n                <td><strong>1. Real-Time Telemetry</strong></td>\n                <td>Sentinels monitor vault Health Factor ($H$) via Multicall3 batch reads</td>\n                <td>Sub-100ms continuous loop</td>\n              </tr>\n              <tr>\n                <td><strong>2. Autonomous Hedge Trigger</strong></td>\n                <td>$H$ drops below trigger threshold ($H \\le H_{\\\\text{trigger}} = 1.15$)</td>\n                <td>Deterministic EVM evaluation</td>\n              </tr>\n              <tr>\n                <td><strong>3. Sub-Second Dispatch</strong></td>\n                <td>Sentinel signs EIP-712 trade intent routed to HyperCore CLOB</td>\n                <td>Sub-78ms match latency</td>\n              </tr>\n              <tr>\n                <td><strong>4. Trailing Take-Profit Unwind</strong></td>\n                <td>Market rebounds; short hedge is closed; cash profits repay debt</td>\n                <td>Trailing offset $\\\\tau = 1.5\\\\%$</td>\n              </tr>\n              <tr>\n                <td><strong>5. Fee Settlement & Deflation</strong></td>\n                <td>10% fee split: 50% Ascend buyback-and-burn, 50% Sentinel yield</td>\n                <td>Phase 1C non-blocking debt tracking</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>3. Public Testnet Onboarding</h2>\n        <p>AEGIS is fully testable on Elysium Orbit L2 Testnet without financial risk:</p>\n        <ol>\n          <li>Claim 0.10 testnet HYPE from the <a href=\"https://elysium.kinetiq.xyz/testnet-faucet\" target=\"_blank\" rel=\"noopener\">Official Elysium Faucet</a>.</li>\n          <li>Launch the terminal and connect your Web3 wallet.</li>\n          <li>Select one of the calibrated faucet test chips (<strong>0.02 HYPE</strong>, <strong>0.05 HYPE</strong>, or <strong>0.08 HYPE</strong>).</li>\n          <li>Trigger the interactive <strong>-18% Flash Crash Simulation</strong> to witness autonomous delta-hedging and trailing take-profit recovery live on-chain.</li>\n        </ol>\n      </div>\n    "
  },
  {
    "id": "problem-forced-liquidation",
    "category": "Introduction",
    "tag": "CORE",
    "title": "The Problem: Forced Liquidation",
    "subtitle": "Why traditional liquidation auctions destroy user capital and trigger catastrophic cascade failures in DeFi.",
    "prev": {
      "id": "introducing-aegis",
      "title": "Official Introduction: AEGIS Protocol"
    },
    "next": {
      "id": "aegis-approach",
      "title": "The AEGIS Approach"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Mechanics of Liquidation Risk</h2>\n <p>In debt-based decentralized financial systems (such as collateralized debt positions, lending pools, and margin venues), a borrower deposits volatile crypto assets $C$ to borrow a stable asset $D$ (typically USDC). Because crypto assets undergo extreme short-term drawdowns, protocols require overcollateralization:</p>\n <div class=\"math-card\">\n <div class=\"math-title\">Standard Loan-to-Value (LTV) Invariant</div>\n <div class=\"math-formula\">LTV = \\frac{D_{\\text{debt}}}{Q_{\\text{collateral}} \\times P_{\\text{collateral}}} \\le LTV_{\\text{max}}</div>\n </div>\n <p>When market drawdowns compress collateral value $P_{\\text{collateral}}$, the Loan-to-Value ratio escalates. Once it crosses the protocol's <strong>Liquidation Threshold ($T_{\\text{liq}}$)</strong>, the loan enters an under-margined state.</p>\n\n <h2>2. The Destruction of Collateral via Liquidations</h2>\n <p>When an existing protocol liquidates a borrower, it invokes a third-party liquidation keeper to eliminate the bad debt. This process creates severe negative externalities for the borrower:</p>\n <ul>\n <li><strong>Penalties (5% to 10% Surcharge)</strong>: The liquidator receives an immediate bonus penalty deducted directly from user collateral. For a $100,000 position, a 10% penalty instantly destroys $10,000 of equity.</li>\n <li><strong>Market Dumping at Market Bottoms</strong>: Liquidators immediately sell seized spot collateral onto Automated Market Makers (AMMs) or centralized books, realizing permanent losses precisely when the asset is undervalued.</li>\n <li><strong>MEV and Liquidation Cascades</strong>: MEV searchers bribe validators to extract arbitrage from collateral liquidation transactions, creating systemic cascade cascades that trigger secondary liquidations across the network.</li>\n </ul>\n\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr>\n <th>Mechanic</th>\n <th>Traditional Liquidation</th>\n <th>AEGIS Delta-Hedging</th>\n </tr>\n </thead>\n <tbody>\n <tr>\n <td><strong>Collateral Disposition</strong></td>\n <td>Forcibly sold/dumped on market</td>\n <td>100% retained inside user vault</td>\n </tr>\n <tr>\n <td><strong>Penalty Loss</strong></td>\n <td>5% to 10% direct penalty loss</td>\n <td>0% liquidation penalty incurred</td>\n </tr>\n <tr>\n <td><strong>Execution Venue</strong></td>\n <td>Spot DEX / AMM swap</td>\n <td>HyperCore Perpetual Futures CLOB</td>\n </tr>\n <tr>\n <td><strong>Custody Model</strong></td>\n <td>Full custody transfer to liquidator</td>\n <td>Non-custodial trade-only session key</td>\n </tr>\n <tr>\n <td><strong>Rebound Participation</strong></td>\n <td>0% (collateral is permanently gone)</td>\n <td>High (hedge unwinds, restoring upside)</td>\n </tr>\n </tbody>\n </table>\n </div>\n </div>\n "
  },
  {
    "id": "aegis-approach",
    "category": "Introduction",
    "tag": "CORE",
    "title": "The AEGIS Approach",
    "subtitle": "Dynamic perpetual delta-hedging to neutralize downside exposure without liquidating collateral.",
    "prev": {
      "id": "problem-forced-liquidation",
      "title": "The Problem: Forced Liquidation"
    },
    "next": {
      "id": "core-principles",
      "title": "Core Principles & Security Invariants"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Synthetic Downside Neutralization</h2>\n <p>AEGIS replaces destructive spot liquidation auctions with automated derivative hedging. When an open position approaches distress, an autonomous Sentinel node programmatically executes a short perpetual contract on HyperCore matching the exact asset and delta coverage ratio desired by the borrower.</p>\n \n <div class=\"diagram-container\">\n <div class=\"diagram-header\">\n <div class=\"diagram-title\">System Execution Topology</div>\n <div class=\"diagram-desc\">Synchronous precompile state reads on Elysium coupled with sub-second trade intent execution on HyperCore.</div>\n </div>\n <div class=\"diagram-svg-wrap\">\n <svg viewBox=\"0 0 760 220\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <!-- User Vault -->\n <rect x=\"20\" y=\"30\" width=\"180\" height=\"160\" rx=\"12\" fill=\"var(--raised)\" stroke=\"var(--rule)\" stroke-width=\"1.5\"/>\n <text x=\"110\" y=\"65\" text-anchor=\"middle\" fill=\"var(--ink)\" font-family=\"var(--display)\" font-size=\"16\">User Vault</text>\n <text x=\"110\" y=\"90\" text-anchor=\"middle\" fill=\"var(--ink-2)\" font-size=\"12\">Collateral: 1,000 HYPE</text>\n <text x=\"110\" y=\"110\" text-anchor=\"middle\" fill=\"var(--ink-2)\" font-size=\"12\">Debt: $32,000 USDC</text>\n <rect x=\"40\" y=\"130\" width=\"140\" height=\"32\" rx=\"6\" fill=\"var(--ground)\" stroke=\"var(--rule)\"/>\n <text x=\"110\" y=\"151\" text-anchor=\"middle\" fill=\"var(--accent)\" font-weight=\"600\" font-size=\"11\">Session Key Delegated</text>\n\n <!-- Arrow to Elysium -->\n <path d=\"M200 110 H270\" stroke=\"var(--rule)\" stroke-width=\"2\" stroke-dasharray=\"4 4\"/>\n <polygon points=\"270,106 278,110 270,114\" fill=\"var(--rule)\"/>\n\n <!-- Elysium L2 -->\n <rect x=\"280\" y=\"30\" width=\"200\" height=\"160\" rx=\"12\" fill=\"var(--raised)\" stroke=\"var(--rule)\" stroke-width=\"1.5\"/>\n <text x=\"380\" y=\"65\" text-anchor=\"middle\" fill=\"var(--ink)\" font-family=\"var(--display)\" font-size=\"16\">Elysium L2</text>\n <text x=\"380\" y=\"88\" text-anchor=\"middle\" fill=\"var(--ink-2)\" font-size=\"12\">100–200ms Block Time</text>\n <rect x=\"295\" y=\"105\" width=\"170\" height=\"32\" rx=\"6\" fill=\"var(--ground)\" stroke=\"var(--rule)\"/>\n <text x=\"380\" y=\"125\" text-anchor=\"middle\" fill=\"var(--accent)\" font-family=\"monospace\" font-size=\"11\">0x0801 Precompile Read</text>\n <rect x=\"295\" y=\"145\" width=\"170\" height=\"32\" rx=\"6\" fill=\"var(--ground)\" stroke=\"var(--rule)\"/>\n <text x=\"380\" y=\"165\" text-anchor=\"middle\" fill=\"var(--hedge)\" font-family=\"monospace\" font-size=\"11\">0x0802 Predeploy Intent</text>\n\n <!-- Arrow to HyperCore -->\n <path d=\"M480 110 H550\" stroke=\"var(--rule)\" stroke-width=\"2\"/>\n <polygon points=\"550,106 558,110 550,114\" fill=\"var(--accent)\"/>\n\n <!-- HyperCore Engine -->\n <rect x=\"560\" y=\"30\" width=\"180\" height=\"160\" rx=\"12\" fill=\"var(--raised)\" stroke=\"var(--accent)\" stroke-width=\"1.5\"/>\n <text x=\"650\" y=\"65\" text-anchor=\"middle\" fill=\"var(--accent)\" font-family=\"var(--display)\" font-size=\"16\">HyperCore L1</text>\n <text x=\"650\" y=\"88\" text-anchor=\"middle\" fill=\"var(--ink-2)\" font-size=\"12\">High-Throughput CLOB</text>\n <rect x=\"580\" y=\"110\" width=\"140\" height=\"60\" rx=\"8\" fill=\"var(--ground)\" stroke=\"var(--rule)\"/>\n <text x=\"650\" y=\"135\" text-anchor=\"middle\" fill=\"var(--hedge)\" font-weight=\"600\" font-size=\"11\">Active Short Hedge</text>\n <text x=\"650\" y=\"155\" text-anchor=\"middle\" fill=\"var(--ink)\" font-size=\"12\">500 HYPE Short</text>\n </svg>\n </div>\n </div>\n\n <h2>2. Offsetting PnL Equilibrium</h2>\n <p>Consider a portfolio holding 1,000 units of HYPE at $45.00 ($45,000 total collateral) with $32,000 borrowed debt. If HYPE drops to $42.00:</p>\n <ul>\n <li><strong>Spot Collateral Loss</strong>: Spot value falls by -$3,000 to $42,000.</li>\n <li><strong>Short Hedge Gain</strong>: If a 100% hedge was opened at $45.00, the 1,000-unit short generates an unrealized cash gain of +$3,000.</li>\n <li><strong>Net Portfolio Equity</strong>: The net balance remains flat at $13,000 ($45,000 - $32,000 = $13,000). The liquidation trigger is averted.</li>\n </ul>\n\n <div class=\"callout callout-warning\">\n <div class=\"callout-icon\">[ALERT]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">Important Technical Reality: Hedging is Not Free of Risk</div>\n Hedging drastically reduces directional delta exposure, but it does not magically eliminate all risks. Perpetuals carry funding rate costs, basis risk (divergence between spot index and perp mark prices), order book execution slippage, and exchange counterparty exposure. The platform guarantees risk mitigation, not absolute risk immunity.\n </div>\n </div>\n </div>\n "
  },
  {
    "id": "core-principles",
    "category": "Introduction",
    "tag": "CORE",
    "title": "Core Principles & Security Invariants",
    "subtitle": "Non-negotiable architectural axioms governing funds custody, operator boundaries, and execution.",
    "prev": {
      "id": "aegis-approach",
      "title": "The AEGIS Approach"
    },
    "next": {
      "id": "key-terminology",
      "title": "Key Terminology & Glossary"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. The Five System Invariants</h2>\n <p>The AEGIS protocol architecture is bounded by five formal system invariants specified in <code>DESIGN.md</code> §7 and enforced on-chain via smart contracts and execution precompiles:</p>\n\n <div class=\"lifecycle-flow\">\n <div class=\"flow-step\">\n <div class=\"step-num\">INV-1</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Non-Custodial Session Key Invariant</div>\n <div class=\"step-desc\">Delegated trade-only session keys issued to <code>AegisVault.sol</code> can exclusively dispatch <code>placeLimitOrder()</code> and <code>cancelOrder()</code> via the <code>0x0802</code> ElysiumCoreWriter. Neither smart contract code, administrative multi-sigs, nor Sentinel node daemons possess bytecode or authorization to transfer, withdraw, or seize underlying user collateral.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">INV-2</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Slashing Bound Invariant</div>\n <div class=\"step-desc\">Penalty slash amounts assessed against negligent or delinquent node operators cannot exceed the active bonded stake deposited in <code>AegisSentinelRegistry.sol</code> (minimum 25,000 $AEGIS).</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">INV-3</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Instant Manual Override Invariant</div>\n <div class=\"step-desc\">Invoking <code>manualOverride()</code> on <code>AegisVault.sol</code> immediately deactivates all automated Sentinel execution rights, atomically cancels resting hedge orders, and restores 100% manual control to the user's primary wallet in a single transaction.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">INV-4</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Fee Conservation Invariant</div>\n <div class=\"step-desc\">Performance fees collected on averted liquidation penalties (10%) are strictly allocated 50% to market buy-and-burn via Ascend Closed Hook Pools and 50% to real yield distributions in USDC/HYPE to governance stakers. Zero unallocated fee leakage is permitted.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">INV-5</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Monotonic Nonce Ordering</div>\n <div class=\"step-desc\">All order intents emitted to predeploy <code>0x0802</code> enforce strictly increasing nonces per position, preventing cross-block replay and front-running attacks.</div>\n </div>\n </div>\n </div>\n </div>\n "
  },
  {
    "id": "key-terminology",
    "category": "Introduction",
    "tag": "CORE",
    "title": "Key Terminology & Glossary",
    "subtitle": "Standardized nomenclature for financial models, contract interfaces, and execution lanes.",
    "prev": {
      "id": "core-principles",
      "title": "Core Principles & Security Invariants"
    },
    "next": {
      "id": "faq",
      "title": "Frequently Asked Questions"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>Glossary of Terms</h2>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr>\n <th>Term</th>\n <th>Symbol</th>\n <th>Definition</th>\n </tr>\n </thead>\n <tbody>\n <tr>\n <td><strong>Health Factor</strong></td>\n <td><code>H</code></td>\n <td>The ratio of discounted collateral value to total borrowed debt liability. When $H le 1.00$, the position is subject to immediate third-party liquidation.</td>\n </tr>\n <tr>\n <td><strong>Delta Coverage Ratio</strong></td>\n <td><code>&gamma;</code></td>\n <td>The fraction of total position delta hedged via perpetual contracts, ranging from 0.10 (10% partial hedge) to 1.00 (100% delta-neutral lock).</td>\n </tr>\n <tr>\n <td><strong>Trailing Tolerance</strong></td>\n <td><code>&tau;</code></td>\n <td>The percentage bounce threshold above the lowest wick ($P_{\\text{lowest}}$) required to trigger the trailing profit-taking unwind order.</td>\n </tr>\n <tr>\n <td><strong>Sentinel Node</strong></td>\n <td>&mdash;</td>\n <td>An autonomous off-chain validator node bonded with 25,000 $AEGIS that continuously evaluates vault health and dispatches trade intents.</td>\n </tr>\n <tr>\n <td><strong>Session Key</strong></td>\n <td>&mdash;</td>\n <td>An ephemeral cryptographic keypair authorized strictly to sign order intents on HyperCore, mathematically barred from withdrawing collateral.</td>\n </tr>\n <tr>\n <td><strong>Precompile 0x0801</strong></td>\n <td>&mdash;</td>\n <td>A zero-gas, synchronous EVM precompile on Elysium L2 that exposes live spot/perp order book depth and mark prices from HyperCore in ~70ms.</td>\n </tr>\n <tr>\n <td><strong>Predeploy 0x0802</strong></td>\n <td>&mdash;</td>\n <td><code>ElysiumCoreWriter</code>: A privileged predeploy contract on Elysium emitting signed trade orders executed by HyperCore matching engines.</td>\n </tr>\n <tr>\n <td><strong>Manual Override</strong></td>\n <td>&mdash;</td>\n <td>An emergency transaction callable by the vault owner to instantly kill Sentinel authority and close open derivative positions.</td>\n </tr>\n </tbody>\n </table>\n </div>\n </div>\n "
  },
  {
    "id": "faq",
    "category": "Introduction",
    "tag": "CORE",
    "title": "Frequently Asked Questions",
    "subtitle": "Answers to essential questions regarding security, custody, performance, and fees.",
    "prev": {
      "id": "key-terminology",
      "title": "Key Terminology & Glossary"
    },
    "next": {
      "id": "health-factor",
      "title": "Understanding Position Health & Math"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>Common Inquiries</h2>\n \n <h3>Does AEGIS guarantee that I will never be liquidated under any circumstance?</h3>\n <p><strong>No protocol can make unconditional guarantees in adversarial market conditions.</strong> While AEGIS is engineered to prevent liquidations by opening short hedges well in advance of the liquidation threshold, extreme black swan events (such as total market illiquidity, multi-block oracle outages, or instantaneous flash crashes exceeding 50% in a single block) could delay hedge execution. AEGIS substantially reduces liquidation probability under standard and volatile market regimes.</p>\n\n <h3>Can a Sentinel node steal or withdraw my deposited collateral?</h3>\n <p><strong>No.</strong> Under invariant <code>INV-1</code>, Sentinel nodes operate exclusively using delegated session keys scoped to order placement on HyperCore. The underlying collateral remains locked inside <code>AegisVault.sol</code>, whose bytecode possesses no method for external address transfers except back to the authenticated vault owner.</p>\n\n <h3>What happens if the price rebounds immediately after a hedge is opened?</h3>\n <p>When the price rebounds, the <strong>Trailing Unwind Engine</strong> automatically detects that the asset has bounced by the user's trailing tolerance $\\tau$ (e.g. 1.5%) off the lowest wick. It purchases to close the short perpetual hedge, locks in the realized hedge cash gain into the vault balance, and leaves the spot collateral intact to participate in further upside.</p>\n\n <h3>How does AEGIS charge fees?</h3>\n <p>AEGIS charges a <strong>10% performance fee exclusively on averted liquidation penalties</strong>. If a user was protected from a 10% liquidation penalty ($10,000 on a $100k vault), AEGIS captures 10% of that saved amount ($1,000). If no hedge is triggered, zero management fees are levied. Captured fees are split 50/50 between $AEGIS token buyback-and-burn and staking yield.</p>\n </div>\n "
  },
  {
    "id": "health-factor",
    "category": "Core Concepts",
    "tag": "MATH",
    "title": "Understanding Position Health & Math",
    "subtitle": "Formal mathematical formulation of Health Factor (H), threshold boundaries, and solvency ratios.",
    "prev": {
      "id": "faq",
      "title": "Frequently Asked Questions"
    },
    "next": {
      "id": "hedge-lifecycle",
      "title": "The Complete 14-Stage Hedge Lifecycle"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Formal Health Factor Formulation</h2>\n <p>Solvency across all collateralized positions in AEGIS is measured by the continuous dimensionless scalar <strong>Health Factor ($H$)</strong>. For a multi-asset collateral vault backing debt $D_{\\text{total}}$:</p>\n\n <div class=\"math-card\">\n <div class=\"math-title\">Health Factor Formal Equation</div>\n <div class=\"math-formula\">H = \\frac{\\sum_{i=1}^{n} \\big( Q_i \\times P_i \\times T_i \\big)}{D_{\\text{total}}}</div>\n </div>\n\n <table class=\"math-legend\">\n <thead>\n <tr><th>Variable</th><th>Definition</th><th>Measurement Unit</th></tr>\n </thead>\n <tbody>\n <tr>\n <td>Q_i</td>\n <td>Total quantity of collateral token $i$ deposited in the vault.</td>\n <td>Base token units (e.g. ETH, HYPE)</td>\n </tr>\n <tr>\n <td>P_i</td>\n <td>Mark price of collateral token $i$ queried synchronously via precompile <code>0x0801</code>.</td>\n <td>USD (scaled 1e8 fixed-point)</td>\n </tr>\n <tr>\n <td>T_i</td>\n <td>Liquidation threshold ratio established for asset $i$ (e.g. 0.80 for 80% maximum LTV).</td>\n <td>Dimensionless scalar $\\in (0, 1.00)$</td>\n </tr>\n <tr>\n <td>D_{\\text{total}}</td>\n <td>Cumulative borrowed debt liabilities plus accrued interest.</td>\n <td>USDC (scaled 1e6 fixed-point)</td>\n </tr>\n </tbody>\n </table>\n\n <h2>2. Threshold Regime Mapping</h2>\n <p>The health factor determines the state machine transitions of the vault:</p>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr>\n <th>Health Factor Range</th>\n <th>Protocol State</th>\n <th>Sentinel Action</th>\n </tr>\n </thead>\n <tbody>\n <tr>\n <td><code>H &gt; 1.30</code></td>\n <td><strong>Healthy / Safe</strong></td>\n <td>Passive monitoring via precompile 0x0801 every 100ms.</td>\n </tr>\n <tr>\n <td><code>1.10 &lt; H &le; 1.30</code></td>\n <td><strong>Caution / Standby</strong></td>\n <td>Orderbook depth verification; Sentinel arms execution payload.</td>\n </tr>\n <tr>\n <td><code>H &le; H_trigger (e.g. 1.10)</code></td>\n <td><strong>Triggered / Hedging Active</strong></td>\n <td>Short perpetual orders dispatched immediately via <code>0x0802</code>.</td>\n </tr>\n <tr>\n <td><code>H &le; 1.00</code></td>\n <td><strong>Insolvency / Liquidation Horizon</strong></td>\n <td>Position subject to immediate external protocol liquidation if unhedged.</td>\n </tr>\n </tbody>\n </table>\n </div>\n\n <h2>3. Distance to Liquidation Equation</h2>\n <p>Traders and algorithms calculate the absolute dollar buffer ($Delta P$) and percentage distance ($d_{%}$) to liquidation as follows:</p>\n <div class=\"math-card\">\n <div class=\"math-title\">Liquidation Price & Distance Formulas</div>\n <div class=\"math-formula\">P_{\\text{liq}} = \\frac{D_{\\text{total}}}{Q_{\\text{collateral}} \\times T} \\qquad d_{\\%} = \\frac{P_{\\text{current}} - P_{\\text{liq}}}{P_{\\text{current}}} \\times 100</div>\n </div>\n <p>For example, with 1,000 HYPE ($Q=1000$), $T=0.80$, and debt of $32,000 USDC ($D=32000$):</p>\n <div class=\"math-card\">\n <div class=\"math-formula\">P_{\\text{liq}} = \\frac{32,000}{1,000 \\times 0.80} = \\frac{32,000}{800} = \\$40.00</div>\n </div>\n <p>If the current mark price $P_{\\text{current}} = \\$48.50$, the percentage distance is $(48.50 - 40.00) / 48.50 \\times 100 = 17.53\\%$.</p>\n </div>\n "
  },
  {
    "id": "hedge-lifecycle",
    "category": "Core Concepts",
    "tag": "CORE",
    "title": "The Complete 14-Stage Hedge Lifecycle",
    "subtitle": "End-to-end operational state machine governing positions from configuration to final settlement.",
    "prev": {
      "id": "health-factor",
      "title": "Understanding Position Health & Math"
    },
    "next": {
      "id": "hedge-sizing-math",
      "title": "Hedge Sizing & Trailing Unwind Math"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>The 14 Discrete Stages of Collateral Protection</h2>\n <p>AEGIS enforces a deterministic state machine through every phase of position lifetime:</p>\n\n <div class=\"lifecycle-flow\">\n <div class=\"flow-step\">\n <div class=\"step-num\">1</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Position Configuration</div>\n <div class=\"step-desc\">Trader deposits collateral into <code>AegisVault.sol</code>, specifies trigger mode (Hybrid, Price, or Health Factor), sets hedge ratio ($gamma$), and defines trailing tolerance ($\tau$).</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">2</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Session Key Delegation</div>\n <div class=\"step-desc\">Trader cryptographically delegates a trade-only session key to <code>AegisVault.sol</code>, granting permission strictly to submit order intents.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">3</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Continuous Sentinel Monitoring</div>\n <div class=\"step-desc\">Bonded Sentinel nodes query Elysium precompile <code>0x0801</code> synchronously every 100ms block at zero gas cost.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">4</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Risk Detection & Boundary Breaches</div>\n <div class=\"step-desc\">Market price experiences a sudden drawdown; the computed health factor breaches the configured threshold: $(H le H_{\text{trigger}}) lor (P le P_{\text{trigger}})$.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">5</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Hedge Sizing Computation</div>\n <div class=\"step-desc\">The Sentinel calculates required short perpetual size $Q_{\text{hedge}}$ using coverage ratio $gamma$ and current HyperCore order book depth.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">6</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Execution Authorization Verification</div>\n <div class=\"step-desc\">The node constructs the trade intent, signs it with the user's delegated session key, and verifies slippage bounds against <code>maxSlippageBps</code>.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">7</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Intent Submission via 0x0802</div>\n <div class=\"step-desc\">The intent is written to predeploy <code>0x0802</code> (ElysiumCoreWriter), emitting the canonical event <code>OrderIntentEmitted</code>.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">8</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Atomic CLOB Execution on HyperCore</div>\n <div class=\"step-desc\">HyperCore perpetual matching engine executes the short perpetual order on the L1 CLOB within sub-100ms latency.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">9</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Health Stabilization Reassessment</div>\n <div class=\"step-desc\">Short perpetual profits counterbalance spot collateral drops. Net health factor stabilizes above liquidation threshold.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">10</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Active Hedge Tracking & Wick Recording</div>\n <div class=\"step-desc\">Sentinel tracks the position, updating the lowest market wick price $P_{\text{lowest}}$ and computing trailing exit target $P_{\text{exit}} = P_{\text{lowest}} \times (1 + \tau)$.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">11</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Trailing Profit Unwind Trigger</div>\n <div class=\"step-desc\">Market bounces off the low, crossing $P_{\text{exit}}$. The Sentinel submits a buy-to-close intent via <code>0x0802</code>.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">12</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Profit Capture & Fee Distribution</div>\n <div class=\"step-desc\">Short hedge realized profit is credited to the user's vault. <code>AegisFeeCollector.sol</code> splits the 10% performance fee 50/50 to buyback-and-burn and stakers.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">13</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Emergency Override Protocol (INV-3)</div>\n <div class=\"step-desc\">If the user calls <code>manualOverride()</code> at any point, Sentinel permissions are immediately revoked and resting orders are canceled.</div>\n </div>\n </div>\n <div class=\"flow-step\">\n <div class=\"step-num\">14</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Failure Handling & Slashing</div>\n <div class=\"step-desc\">If an assigned Sentinel node fails to execute within 3 blocks or exceeds slippage limits, <code>AegisSentinelRegistry.sol</code> slashes 10% of their 25,000 $AEGIS bond.</div>\n </div>\n </div>\n </div>\n </div>\n "
  },
  {
    "id": "hedge-sizing-math",
    "category": "Mathematical Specs",
    "tag": "MATH",
    "title": "Hedge Sizing & Trailing Unwind Math",
    "subtitle": "Exact mathematical equations for calculating perpetual position sizes and trailing profit thresholds.",
    "prev": {
      "id": "hedge-lifecycle",
      "title": "The Complete 14-Stage Hedge Lifecycle"
    },
    "next": {
      "id": "worked-examples",
      "title": "Worked Numerical Quant Models"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Hedge Sizing Algorithm (Coverage Ratio $\\gamma$)</h2>\n <p>The short perpetual hedge size $Q_{\\text{hedge}}$ is scaled by the trader's chosen coverage parameter $\\gamma \\in [0.10, 1.00]$:</p>\n\n <div class=\"math-card\">\n <div class=\"math-title\">General Hedge Sizing Equation</div>\n <div class=\"math-formula\">Q_{\\text{hedge}} = \\gamma \\times \\frac{D_{\\text{total}} - \\big(Q_{\\text{collateral}} \\times P_{\\text{current}} \\times T\\big)}{P_{\\text{perp}} \\times (1 - T)}</div>\n </div>\n\n <p>Two primary institutional configurations exist:</p>\n <ul>\n <li><strong>Full Delta-Neutral Lock ($gamma = 1.00$)</strong>:\n <div class=\"math-card\">\n <div class=\"math-formula\">Q_{\\text{hedge}} = Q_{\\text{collateral}}</div>\n </div>\n The short perpetual size identically matches the collateral quantity, completely locking the USD value of equity.\n </li>\n <li><strong>Surgical Buffer Hedging ($gamma = 0.25 - 0.50$)</strong>:\n The Sentinel opens only the minimum hedge required to maintain $H ge 1.15$, preserving maximum upside if the asset bounces quickly while paying minimal trading fees.\n </li>\n </ul>\n\n <h2>2. Trailing Profit-Take and Unwind Mathematics</h2>\n <p>While the short hedge is active, the Sentinel records the absolute lowest market wick price ($P_{\\text{lowest}}$). The trailing exit price $P_{\\text{exit}}$ is defined dynamically:</p>\n\n <div class=\"math-card\">\n <div class=\"math-title\">Trailing Exit Formula</div>\n <div class=\"math-formula\">P_{\\text{exit}} = P_{\\text{lowest}} \\times (1 + \\tau)</div>\n </div>\n\n <table class=\"math-legend\">\n <thead><tr><th>Parameter</th><th>Description</th><th>Typical Value</th></tr></thead>\n <tbody>\n <tr>\n <td>P_{\\text{lowest}}</td>\n <td>Lowest mark price recorded on HyperCore since hedge initiation.</td>\n <td>USD mark price</td>\n </tr>\n <tr>\n <td>\\tau</td>\n <td>User-configured trailing tolerance ratio.</td>\n <td>0.015 (1.5%) &mdash; allowed range: 0.005 to 0.05</td>\n </tr>\n <tr>\n <td>P_{\\text{exit}}</td>\n <td>Threshold where Sentinel submits buy-to-close market order.</td>\n <td>USD exit trigger</td>\n </tr>\n </tbody>\n </table>\n </div>\n "
  },
  {
    "id": "worked-examples",
    "category": "Mathematical Specs",
    "tag": "MATH",
    "title": "Worked Numerical Quant Models",
    "subtitle": "Step-by-step mathematical walkthroughs of market drawdowns, hedge openings, and trailing unwinds.",
    "prev": {
      "id": "hedge-sizing-math",
      "title": "Hedge Sizing & Trailing Unwind Math"
    },
    "next": {
      "id": "contract-architecture",
      "title": "Smart Contract Architecture & Interfaces"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>Case Study: 1,000 HYPE Position Drawdown & Recovery</h2>\n <p>To demonstrate the mathematical mechanics under live market conditions, examine this complete scenario with concrete figures:</p>\n\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead><tr><th>Parameter</th><th>Value</th><th>Notes</th></tr></thead>\n <tbody>\n <tr><td>Collateral Asset</td><td>1,000 HYPE</td><td>Deposited in <code>AegisVault.sol</code></td></tr>\n <tr><td>Borrowed Debt</td><td>$32,000 USDC</td><td>Borrowed against collateral</td></tr>\n <tr><td>Liquidation Threshold ($T$)</td><td>0.80 (80%)</td><td>Standard Elysium market parameter</td></tr>\n <tr><td>Initial Mark Price ($P_0$)</td><td>$48.50</td><td>Initial Collateral Value: $48,500</td></tr>\n <tr><td>Initial Health Factor ($H_0$)</td><td>1.2125</td><td>$(1,000 \times 48.50 \times 0.80) / 32,000$</td></tr>\n <tr><td>Trigger Health Factor ($H_{\\text{trig}}$)</td><td>1.10</td><td>Hedge triggers when $P le $44.00$</td></tr>\n <tr><td>Coverage Ratio ($gamma$)</td><td>0.50 (50%)</td><td>Surgical partial hedge = 500 HYPE Short</td></tr>\n <tr><td>Trailing Tolerance ($\tau$)</td><td>0.015 (1.5%)</td><td>User setting</td></tr>\n </tbody>\n </table>\n </div>\n\n <h3>Phase A: Market Drawdown & Trigger Breach</h3>\n <p>The price crashes from $48.50 down to $43.50. At $43.50, the unhedged health factor evaluates to:</p>\n <div class=\"math-card\">\n <div class=\"math-formula\">H = \\frac{1,000 \\times 43.50 \\times 0.80}{32,000} = \\frac{34,800}{32,000} = 1.0875 &lt; 1.10</div>\n </div>\n <p>Because $1.0875 le 1.10$, the Sentinel fires immediately. It opens a <strong>500 HYPE short perpetual</strong> on HyperCore at an average fill price of <strong>$43.50</strong>.</p>\n\n <h3>Phase B: Continued Drawdown to Lowest Wick</h3>\n <p>The market sells off further, touching a local bottom wick of <strong>$40.20</strong> ($P_{\\text{lowest}} = 40.20$).</p>\n <ul>\n <li>Unhedged Collateral Value: $1,000 \times 40.20 = $40,200$.</li>\n <li>Unrealized Short Hedge PnL: $500 \times (43.50 - 40.20) = 500 \times 3.30 = +$1,650$.</li>\n <li>Net Position Equity: $$40,200 - $32,000 + $1,650 = $9,850$.</li>\n <li>Effective Health Factor with Hedge: $(32,160 + 1,650) / 32,000 = 1.0565$. <em>The position survived without liquidation!</em></li>\n </ul>\n\n <h3>Phase C: Market Bounce & Trailing Unwind</h3>\n <p>The market begins to recover. The trailing exit threshold is computed:</p>\n <div class=\"math-card\">\n <div class=\"math-formula\">P_{\\text{exit}} = 40.20 \\times (1 + 0.015) = 40.20 \\times 1.015 = \\$40.803</div>\n </div>\n <p>When the price crosses $40.81, the Sentinel buys to close the 500 HYPE short at $40.81:</p>\n <ul>\n <li>Realized Short Profit: $500 \times (43.50 - 40.81) = 500 \times 2.69 = +$1,345.00$.</li>\n <li>Averted Liquidation Penalty (10% of $32k): $3,200.00.</li>\n <li>AEGIS 10% Performance Fee: $10% \times $3,200 = $320.00$ ($160 to buyback-burn, $160 to stakers).</li>\n <li>Net Retained Cash Profit Deposited into Vault: $$1,345.00 - $320.00 = +$1,025.00$.</li>\n <li><strong>Outcome</strong>: 1,000 HYPE collateral remains 100% intact, vault cash increased by $1,025, and zero liquidation occurred.</li>\n </ul>\n </div>\n "
  },
  {
    "id": "contract-architecture",
    "category": "Smart Contracts",
    "tag": "SOL",
    "title": "Smart Contracts & Testnet Deployment",
    "subtitle": "Production Solidity contracts, testnet addresses, state storage schemas, and Foundry verification proofs.",
    "prev": {
      "id": "worked-examples",
      "title": "Worked Numerical Quant Models"
    },
    "next": {
      "id": "precompiles",
      "title": "Modular Dual-Mode & Precompiles"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. Verified On-Chain Deployments (Elysium Testnet 99801)</h2>\n        <p>AEGIS smart contracts are deployed and verified on the live <strong>Elysium Orbit L2 Testnet (Chain ID <code>99801</code>)</strong>. All contracts are verified with 115 Foundry tests across 14 test suites:</p>\n        \n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Contract Name</th><th>Testnet Address</th><th>Role & Verification Proof</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>AegisVault (Phase 1C)</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e\" target=\"_blank\" rel=\"noopener\">0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e</a></code></td>\n                <td>Non-custodial collateral custody, EIP-712 nonces, and non-blocking <code>feeDebts</code> tracking.</td>\n              </tr>\n              <tr>\n                <td><strong>RelayedOracleAdapter</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0\" target=\"_blank\" rel=\"noopener\">0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</a></code></td>\n                <td>Modular oracle bridge with 120s/300s staleness checks; bypasses precompile 0x0801 on stock ArbOS.</td>\n              </tr>\n              <tr>\n                <td><strong>AgentDispatchAdapter</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6\" target=\"_blank\" rel=\"noopener\">0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6</a></code></td>\n                <td>Modular keeper trade dispatcher via EVM events; bypasses predeploy 0x0802 revert on stock ArbOS.</td>\n              </tr>\n              <tr>\n                <td><strong>AegisFeeCollector</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x8A791620dd6260079BF849Dc5567aDC3F2FdC318\" target=\"_blank\" rel=\"noopener\">0x8A791620dd6260079BF849Dc5567aDC3F2FdC318</a></code></td>\n                <td>Enforces strict 50/50 fee conservation between Ascend buyback-burn and Sentinel node yield.</td>\n              </tr>\n              <tr>\n                <td><strong>AegisSentinelRegistry</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x610178dA211FEF7D417bC0e6FeD39F05609AD788\" target=\"_blank\" rel=\"noopener\">0x610178dA211FEF7D417bC0e6FeD39F05609AD788</a></code></td>\n                <td>Enforces 25,000 $AEGIS node bonding, 10% maximum slashing cap, and 7-day unbonding cooldown.</td>\n              </tr>\n              <tr>\n                <td><strong>Canonical Testnet USDC</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x7D29d8047B905000459c0E80c34a26CeedcB47b2\" target=\"_blank\" rel=\"noopener\">0x7D29d8047B905000459c0E80c34a26CeedcB47b2</a></code></td>\n                <td>Standard 6-decimal testnet debt token verified via <code>decimals() == 6</code>.</td>\n              </tr>\n              <tr>\n                <td><strong>Canonical Testnet WHYPE</strong></td>\n                <td><code><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234\" target=\"_blank\" rel=\"noopener\">0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234</a></code></td>\n                <td>Standard 18-decimal wrapped gas collateral token verified via <code>decimals() == 18</code>.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>2. AegisVault.sol Specification & Phase 1C Fee Debts</h2>\n        <p><code>AegisVault.sol</code> guarantees zero-custody delegation and non-blocking unwinds via deferred fee debt accounting:</p>\n        <div class=\"code-block-container\">\n          <div class=\"code-header\">\n            <div class=\"code-title\"><span>[SOL]</span> AegisVault.sol (Modular Interfaces & Phase 1C Debt)</div>\n            <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Interface</button>\n          </div>\n          <div class=\"code-body\">\n            <pre><code><span class=\"tok-cmt\">// SPDX-License-Identifier: MIT</span>\n<span class=\"tok-kw\">pragma solidity</span> ^0.8.24;\n\n<span class=\"tok-kw\">interface</span> <span class=\"tok-typ\">IAegisVault</span> {\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">PositionConfigured</span>(<span class=\"tok-typ\">address indexed</span> user, <span class=\"tok-typ\">uint256</span> collateral, <span class=\"tok-typ\">uint256</span> debt);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">SessionKeyDelegated</span>(<span class=\"tok-typ\">address indexed</span> user, <span class=\"tok-typ\">address indexed</span> sessionKey, <span class=\"tok-typ\">uint64</span> expiry);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">HedgeExecuted</span>(<span class=\"tok-typ\">address indexed</span> user, <span class=\"tok-typ\">uint256</span> size, <span class=\"tok-typ\">uint256</span> price);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">FeeDebtRecorded</span>(<span class=\"tok-typ\">address indexed</span> user, <span class=\"tok-typ\">uint256</span> debtAmount);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">FeeDebtRepaid</span>(<span class=\"tok-typ\">address indexed</span> user, <span class=\"tok-typ\">uint256</span> repaidAmount);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">ManualOverrideTriggered</span>(<span class=\"tok-typ\">address indexed</span> user);\n\n    <span class=\"tok-cmt\">/// @notice Emergency killswitch revoking permissions and closing hedges</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">manualOverride</span>() <span class=\"tok-kw\">external</span>;\n\n    <span class=\"tok-cmt\">/// @notice Query deferred fee debt for borrower</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">feeDebts</span>(<span class=\"tok-typ\">address</span> user) <span class=\"tok-kw\">external view returns</span> (<span class=\"tok-typ\">uint256</span>);\n\n    <span class=\"tok-cmt\">/// @notice Voluntary or settle-time repayment of deferred fee debt</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">repayFeeDebt</span>(<span class=\"tok-typ\">uint256</span> amount) <span class=\"tok-kw\">external</span>;\n\n    <span class=\"tok-cmt\">/// @notice Hot-swap oracle adapter (RelayedOracleAdapter -> 0x0801 Native)</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">setOracleAdapter</span>(<span class=\"tok-typ\">address</span> newOracle) <span class=\"tok-kw\">external</span>;\n\n    <span class=\"tok-cmt\">/// @notice Hot-swap dispatch adapter (AgentDispatchAdapter -> 0x0802 Predeploy)</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">setDispatchAdapter</span>(<span class=\"tok-typ\">address</span> newDispatcher) <span class=\"tok-kw\">external</span>;\n}</code></pre>\n          </div>\n        </div>\n\n        <h2>3. Modular Adapter Interfaces (IOracleAdapter & IDispatchAdapter)</h2>\n        <div class=\"code-block-container\">\n          <div class=\"code-header\">\n            <div class=\"code-title\"><span>[SOL]</span> Adapter Interfaces for Zero-Downtime Migration</div>\n            <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Interface</button>\n          </div>\n          <div class=\"code-body\">\n            <pre><code><span class=\"tok-cmt\">// SPDX-License-Identifier: MIT</span>\n<span class=\"tok-kw\">pragma solidity</span> ^0.8.24;\n\n<span class=\"tok-kw\">interface</span> <span class=\"tok-typ\">IOracleAdapter</span> {\n    <span class=\"tok-cmt\">/// @notice Returns current mark price, staleness status, and timestamp</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">getMarkPrice</span>(<span class=\"tok-typ\">uint32</span> perpIndex) <span class=\"tok-kw\">external view returns</span> (\n        <span class=\"tok-typ\">uint256</span> price,\n        <span class=\"tok-typ\">uint256</span> updatedAt,\n        <span class=\"tok-typ\">bool</span> isStale\n    );\n}\n\n<span class=\"tok-kw\">interface</span> <span class=\"tok-typ\">IDispatchAdapter</span> {\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">AgentHedgeDispatched</span>(<span class=\"tok-typ\">address indexed</span> vault, <span class=\"tok-typ\">uint32</span> perpIndex, <span class=\"tok-typ\">uint256</span> size, <span class=\"tok-typ\">uint256</span> limitPrice);\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">AgentUnwindDispatched</span>(<span class=\"tok-typ\">address indexed</span> vault, <span class=\"tok-typ\">uint32</span> perpIndex, <span class=\"tok-typ\">uint256</span> size, <span class=\"tok-typ\">uint256</span> limitPrice);\n\n    <span class=\"tok-cmt\">/// @notice Dispatches order intent via EVM log emission or native call</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">dispatchHedge</span>(<span class=\"tok-typ\">address</span> vault, <span class=\"tok-typ\">uint32</span> perpIndex, <span class=\"tok-typ\">uint256</span> size, <span class=\"tok-typ\">uint256</span> limitPrice) <span class=\"tok-kw\">external</span>;\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">dispatchUnwind</span>(<span class=\"tok-typ\">address</span> vault, <span class=\"tok-typ\">uint32</span> perpIndex, <span class=\"tok-typ\">uint256</span> size, <span class=\"tok-typ\">uint256</span> limitPrice) <span class=\"tok-kw\">external</span>;\n}</code></pre>\n          </div>\n        </div>\n      </div>\n    "
  },
  {
    "id": "precompiles",
    "category": "Smart Contracts",
    "tag": "EVM",
    "title": "Modular Dual-Mode Stack & Precompiles",
    "subtitle": "Bridging stock ArbOS testnet via modular adapters and preparing zero-downtime hot-swap to native 0x0801/0x0802.",
    "prev": {
      "id": "contract-architecture",
      "title": "Smart Contract Architecture & Interfaces"
    },
    "next": {
      "id": "tokenomics",
      "title": "$AEGIS Tokenomics & Economy"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. The ArbOS Testnet Reality & The Dual-Mode Solution</h2>\n        <p>Elysium Orbit L2 Testnet currently executes standard Arbitrum Nitro ArbOS. Under stock ArbOS, calling an unmapped address like <code>0x0801</code> returns <code>0x</code> (empty bytes) and calling <code>0x0802</code> reverts. Rather than blocking protocol testing, AEGIS engineered the <strong>Modular Dual-Mode Architecture</strong>:</p>\n\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead>\n              <tr><th>Component</th><th>Mode 1: Stock ArbOS (Active Today)</th><th>Mode 2: Native Precompiles (Post-Hardfork)</th></tr>\n            </thead>\n            <tbody>\n              <tr>\n                <td><strong>Oracle Telemetry</strong></td>\n                <td><code>RelayedOracleAdapter.sol</code>: Verified relay with 120s/300s staleness checks.</td>\n                <td><code>0x0801</code> Precompile: Direct EVM memory read of HyperCore state (&lt;70ms latency).</td>\n              </tr>\n              <tr>\n                <td><strong>Intent Dispatch</strong></td>\n                <td><code>AgentDispatchAdapter.sol</code>: Emits EVM events observed by off-chain Sentinels.</td>\n                <td><code>0x0802</code> Predeploy: Direct state-transition intent bridge into HyperCore CLOB.</td>\n              </tr>\n              <tr>\n                <td><strong>User Vaults</strong></td>\n                <td>Identical <code>AegisVault.sol</code> contract.</td>\n                <td>Identical <code>AegisVault.sol</code> contract (zero vault migration required).</td>\n              </tr>\n              <tr>\n                <td><strong>Migration Effort</strong></td>\n                <td>Live on Elysium Testnet (99801).</td>\n                <td>Single governance call to <code>setOracleAdapter()</code> and <code>setDispatchAdapter()</code>.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <div class=\"callout callout-important\">\n          <div class=\"callout-icon\">⚡</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Zero-Downtime Hot-Swap Guarantee</div>\n            When Elysium validators activate the custom ArbOS hardfork exposing <code>0x0801</code> and <code>0x0802</code>, protocol governance updates the adapter pointers. User collateral, positions, and session key delegations remain 100% intact with zero downtime and zero user transactions required.\n          </div>\n        </div>\n\n        <h2>2. Precompile 0x0801 ABI (HyperCore Market Data Reader)</h2>\n        <div class=\"code-block-container\">\n          <div class=\"code-header\">\n            <div class=\"code-title\"><span>[ABI]</span> Precompile 0x0801 Specification</div>\n            <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Interface</button>\n          </div>\n          <div class=\"code-body\">\n            <pre><code><span class=\"tok-kw\">interface</span> <span class=\"tok-typ\">IHyperCoreReadPrecompile</span> {\n    <span class=\"tok-cmt\">/// @notice Returns current mark price, funding rate, and open interest</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">getPerpMarket</span>(<span class=\"tok-typ\">uint32</span> perpIndex) <span class=\"tok-kw\">external view returns</span> (\n        <span class=\"tok-typ\">uint64</span> markPriceScaled,   <span class=\"tok-cmt\">// 1e8 fixed point</span>\n        <span class=\"tok-typ\">int64</span> fundingRateScaled,  <span class=\"tok-cmt\">// 1e8 hourly funding rate</span>\n        <span class=\"tok-typ\">uint128</span> openInterest      <span class=\"tok-cmt\">// Total open contracts</span>\n    );\n}</code></pre>\n          </div>\n        </div>\n\n        <h2>3. Predeploy 0x0802 ABI (ElysiumCoreWriter Intent Dispatcher)</h2>\n        <div class=\"code-block-container\">\n          <div class=\"code-header\">\n            <div class=\"code-title\"><span>[ABI]</span> Predeploy 0x0802 Specification</div>\n            <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Interface</button>\n          </div>\n          <div class=\"code-body\">\n            <pre><code><span class=\"tok-kw\">interface</span> <span class=\"tok-typ\">IElysiumCoreWriter</span> {\n    <span class=\"tok-kw\">event</span> <span class=\"tok-fn\">OrderIntentEmitted</span>(\n        <span class=\"tok-typ\">address indexed</span> vault,\n        <span class=\"tok-typ\">uint32 indexed</span> perpIndex,\n        <span class=\"tok-typ\">bool</span> isShort,\n        <span class=\"tok-typ\">uint64</span> size,\n        <span class=\"tok-typ\">uint64</span> limitPrice,\n        <span class=\"tok-typ\">uint64</span> nonce\n    );\n\n    <span class=\"tok-cmt\">/// @notice Dispatches trade intent using delegated session key</span>\n    <span class=\"tok-kw\">function</span> <span class=\"tok-fn\">dispatchOrderIntent</span>(\n        <span class=\"tok-typ\">address</span> userVault,\n        <span class=\"tok-typ\">uint32</span> perpIndex,\n        <span class=\"tok-typ\">bool</span> isShort,\n        <span class=\"tok-typ\">uint64</span> size,\n        <span class=\"tok-typ\">uint64</span> limitPrice,\n        <span class=\"tok-typ\">bytes calldata</span> sessionKeySignature\n    ) <span class=\"tok-kw\">external</span>;\n}</code></pre>\n          </div>\n        </div>\n      </div>\n    "
  },
  {
    "id": "tokenomics",
    "category": "Tokenomics",
    "tag": "ECON",
    "title": "$AEGIS Tokenomics & Economy",
    "subtitle": "Hard-capped 700M supply allocation, Ascend ecosystem synergy, counter-cyclical burning, and strict 24-month team lock.",
    "prev": {
      "id": "precompiles",
      "title": "Precompile 0x0801 & Predeploy 0x0802"
    },
    "next": {
      "id": "sentinel-operator-guide",
      "title": "Sentinel Node Operator Guide"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Executive Overview & Non-Monetary Disclaimer</h2>\n <p>The <strong>$AEGIS</strong> token is the native governance, bonding, and fee-capture asset of the AEGIS protocol, deployed natively on Elysium L2 (Chain ID <code>99801</code>) with a strict, immutable hard cap of <strong>700,000,000 $AEGIS</strong> tokens. The protocol incorporates zero inflationary minting functions, enforcing a mathematically fixed total supply.</p>\n\n <div class=\"callout callout-important\">\n <div class=\"callout-icon\">[RULE]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">Non-Monetary Valuation Notice</div>\n $AEGIS currently possesses zero established monetary value, secondary market pricing, or fiat exchange rate. All quantitative allocations, performance fee splits, and economic mechanisms detailed throughout this documentation represent programmatic token quantities, basis points (bps), and deterministic on-chain state transitions, not speculative financial forecasts.\n </div>\n </div>\n\n <p>Unlike standard DeFi models that rely on inflationary emissions to subsidize temporary liquidity, AEGIS implements a <strong>counter-cyclical deflationary flywheel</strong>. During market crashes—when traditional protocols suffer liquidation cascades—AEGIS executes autonomous delta-hedges. The resulting 10% performance fee on averted liquidation losses generates programmatic open-market buy pressure through <strong>Ascend Closed Hook Pools</strong>, permanently destroying tokens at the <code>0x000...dEaD</code> address while distributing real cash-flow yield to governance stakers in native debt tokens.</p>\n\n <h2>2. Key Token Metrics at a Glance</h2>\n <div class=\"tokenomics-stats-grid\">\n <div class=\"stat-metric-card\">\n <div class=\"stat-metric-label\">Total Fixed Supply</div>\n <div class=\"stat-metric-value\">700,000,000</div>\n <div class=\"stat-metric-sub\">Hard-capped $AEGIS tokens. Zero inflationary minting capability in smart contracts.</div>\n <span class=\"stat-metric-badge stat-badge-teal\">Fixed Hard Cap</span>\n </div>\n\n <div class=\"stat-metric-card\">\n <div class=\"stat-metric-label\">Initial Day-1 Float (TGE)</div>\n <div class=\"stat-metric-value\">118,300,000</div>\n <div class=\"stat-metric-sub\">16.9% total float (91M Ascend Fair Launch + Initial Ascend/Keeper float).</div>\n <span class=\"stat-metric-badge stat-badge-teal\">Controlled Initial Float</span>\n </div>\n\n <div class=\"stat-metric-card\">\n <div class=\"stat-metric-label\">Core Contributor Lock</div>\n <div class=\"stat-metric-value\">24-Month Cliff</div>\n <div class=\"stat-metric-sub\">0% at TGE. Zero tokens for 2 full years, followed by 48-month linear vesting.</div>\n <span class=\"stat-metric-badge stat-badge-violet\">6-Year Alignment</span>\n </div>\n\n <div class=\"stat-metric-card\">\n <div class=\"stat-metric-label\">Direct Ascend Alignment</div>\n <div class=\"stat-metric-value\">39.0%</div>\n <div class=\"stat-metric-sub\">273,000,000 $AEGIS total (182M Ecosystem & Community + 91M Fair Launch).</div>\n <span class=\"stat-metric-badge stat-badge-hedge\">Ascend Ecosystem Focus</span>\n </div>\n </div>\n\n <h2>3. Visual Token Allocation (700M Cap)</h2>\n <div class=\"allocation-bar-wrap\">\n <div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;\">\n <span style=\"font-weight:600; font-size:13px; color:var(--ink);\">Supply Distribution Across Strategic Pillars</span>\n <span style=\"font-family:monospace; font-size:12px; color:var(--ink-2);\">700,000,000 $AEGIS (100.0%)</span>\n </div>\n \n <div class=\"allocation-progress-bar\">\n <div class=\"alloc-segment\" style=\"width:26%; background:var(--accent);\" title=\"Ascend Ecosystem & Community: 26.0% (182M)\"></div>\n <div class=\"alloc-segment\" style=\"width:26%; background:var(--violet);\" title=\"Sentinel & Community Incentives: 26.0% (182M)\"></div>\n <div class=\"alloc-segment\" style=\"width:15%; background:var(--hedge);\" title=\"Protocol Security & Insurance: 15.0% (105M)\"></div>\n <div class=\"alloc-segment\" style=\"width:13%; background:var(--accent);\" title=\"Ascend Fair Launch (TGE): 13.0% (91M)\"></div>\n <div class=\"alloc-segment\" style=\"width:12%; background:var(--ink-2);\" title=\"Core Contributors & Team: 12.0% (84M)\"></div>\n <div class=\"alloc-segment\" style=\"width:8%; background:var(--danger);\" title=\"Strategic Partners & Foundation: 8.0% (56M)\"></div>\n </div>\n\n <div class=\"alloc-legend-grid\">\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--accent);\"></span>\n <span><strong>26.0%</strong> — Ascend Ecosystem (182M)</span>\n </div>\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--violet);\"></span>\n <span><strong>26.0%</strong> — Sentinel & Community (182M)</span>\n </div>\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--hedge);\"></span>\n <span><strong>15.0%</strong> — Protocol Security (105M)</span>\n </div>\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--accent);\"></span>\n <span><strong>13.0%</strong> — Ascend Fair Launch (91M)</span>\n </div>\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--ink-2);\"></span>\n <span><strong>12.0%</strong> — Core Contributors (84M)</span>\n </div>\n <div class=\"alloc-legend-item\">\n <span class=\"alloc-legend-dot\" style=\"background:var(--danger);\"></span>\n <span><strong>8.0%</strong> — Strategic & Foundation (56M)</span>\n </div>\n </div>\n </div>\n\n <h2>4. Deep Ascend Ecosystem Symbiosis</h2>\n <p>The tokenomics of AEGIS are architected to directly empower and expand the <strong>Ascend ecosystem</strong> on Elysium L2 and Kinetiq:</p>\n \n <div class=\"callout callout-note\">\n <div class=\"callout-icon\">[FAST]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">Ascend's Architectural Alignment</div>\n Ascend operates without a native token of its own, prioritizing value capture in <strong>HYPE</strong>, <strong>kHYPE</strong> (Kinetiq liquid-staked HYPE), and <strong>KNTQ</strong>. AEGIS's fee routing and staking integration directly fuel Ascend's core volume and buyback loops.\n </div>\n </div>\n\n <ul>\n <li><strong>Exclusive Buyback Routing on Ascend Closed Hook Pools</strong>: <code>AegisFeeCollector.sol</code> routes 100% of all market buybacks exclusively through <code>IAscendHookPool.sol</code>. Every time AEGIS averts liquidations during market drawdowns, programmatic buy volume flows directly into Ascend pools, boosting trading volume and liquidity provider fees.</li>\n <li><strong>Automatic HYPE & KNTQ Protocol Buybacks</strong>: Ascend captures a 1% platform transaction fee on trading activity within its pools. A substantial portion of this revenue is routed into Ascend's native 50:50 buyback split of HYPE and KNTQ (with 60% of purchased KNTQ permanently burned). Thus, AEGIS fee volume automatically drives deflationary pressure across the broader Kinetiq ecosystem.</li>\n <li><strong>kHYPE Staker Liquidity Distribution (70,000,000 $AEGIS)</strong>: Dedicated allocation integrated with Ascend's kHYPE yield mechanism. Users who stake native HYPE to receive kHYPE on Kinetiq receive periodic $AEGIS distributions without needing to sell their primary assets.</li>\n <li><strong>Protocol-Owned Liquidity (POL) on Ascend (63,000,000 $AEGIS)</strong>: Permanently paired with USDC/HYPE in an Ascend Closed Hook Pool to anchor unbreakable, slippage-resistant day-1 liquidity.</li>\n <li><strong>The Ascension Graduation Pipeline</strong>: Meeting Ascend's volume, liquidity, and Sentinel decentralization milestones triggers protocol graduation across the Mirror Bridge to HyperEVM, leading to native CLOB listing on HyperCore spot and HIP-3 perpetual markets on Kinetiq.</li>\n </ul>\n\n <h2>5. Comprehensive Token Allocation Matrix</h2>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr>\n <th>Allocation Category</th>\n <th>Share (%)</th>\n <th>Token Amount</th>\n <th>TGE Unlock</th>\n <th>Cliff</th>\n <th>Vesting Schedule</th>\n <th>Operational Role</th>\n </tr>\n </thead>\n <tbody>\n <tr>\n <td><strong>Ascend Ecosystem & Community</strong></td>\n <td><code>26.0%</code></td>\n <td>182,000,000</td>\n <td>10.0% (18.2M)</td>\n <td>0 mos</td>\n <td>24 mos linear</td>\n <td>kHYPE stakers, Ascend LP incentives, and community rewards</td>\n </tr>\n <tr>\n <td><strong>Community & Sentinel Incentives</strong></td>\n <td><code>26.0%</code></td>\n <td>182,000,000</td>\n <td>5.0% (9.1M)</td>\n <td>0 mos</td>\n <td>36 mos linear</td>\n <td>Sentinel 24/7 node uptime, telemetry relays, bug bounties</td>\n </tr>\n <tr>\n <td><strong>Ascend Launchpad Fair Launch</strong></td>\n <td><code>13.0%</code></td>\n <td>91,000,000</td>\n <td>100.0% (91M)</td>\n <td>0 mos</td>\n <td>Instant (100%)</td>\n <td>Day-1 public liquidity via Ascend Closed Hook Pool</td>\n </tr>\n <tr>\n <td><strong>Protocol Security & Insurance</strong></td>\n <td><code>15.0%</code></td>\n <td>105,000,000</td>\n <td>0.0%</td>\n <td>12 mos</td>\n <td>36 mos linear</td>\n <td>DAO multi-sig emergency backstop reserve for black swan events</td>\n </tr>\n <tr>\n <td><strong>Core Contributors & Team</strong></td>\n <td><code>12.0%</code></td>\n <td>84,000,000</td>\n <td>0.0%</td>\n <td>24 mos</td>\n <td>48 mos linear</td>\n <td>Strict 2-year hard cliff; zero tokens until Month 25 (6-year horizon)</td>\n </tr>\n <tr>\n <td><strong>Strategic Partners & Foundation</strong></td>\n <td><code>8.0%</code></td>\n <td>56,000,000</td>\n <td>0.0%</td>\n <td>18 mos</td>\n <td>36 mos linear</td>\n <td>Audits, legal structuring, institutional risk models</td>\n </tr>\n </tbody>\n </table>\n </div>\n\n <h2>6. Ultra-Strict Core Contributor Lockup</h2>\n <p>To demonstrate absolute institutional commitment and eliminate any possibility of mercenary team dumping, Core Contributor tokens adhere to an industry-leading vesting standard:</p>\n \n <div class=\"callout callout-warning\">\n <div class=\"callout-icon\">[SEC]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">The 24-Month Hard Cliff Guarantee</div>\n Core contributors receive <strong>0 tokens at TGE</strong> and <strong>0 tokens throughout the entire first 24 months</strong>. Not a single team token enters circulation until the protocol has been operational in production for two full years.\n </div>\n </div>\n\n <ul>\n <li><strong>Cliff Duration</strong>: 24 months (Months 1–24: 0 tokens unlocked).</li>\n <li><strong>Vesting Schedule</strong>: 48 months linear block-by-block progression from Month 25 through Month 72.</li>\n <li><strong>Monthly Emission</strong>: Exactly 1,750,000 $AEGIS per month (~0.25% of total supply).</li>\n <li><strong>Full Maturity</strong>: Month 72 (6 years post-TGE).</li>\n </ul>\n\n <h2>7. The Four Core Value Accrual Pillars</h2>\n <p>Every tokenomic mechanic is implemented directly in smart contract bytecode on Elysium L2:</p>\n\n <div class=\"lifecycle-flow\">\n <div class=\"flow-step\">\n <div class=\"step-num\">1</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Sentinel Node Operator Bonding (PoS / Bonded Keepers)</div>\n <div class=\"step-desc\">\n Under <code>AegisSentinelRegistry.sol</code>, node operators must bond at least <strong>25,000 $AEGIS</strong> (<code>MIN_BOND</code>) to run an active keeper daemon. Slashed penalties (enforced strictly &le; 10% by Invariant <strong>INV-2</strong>) route directly to victim vault restitution. 400 active sentinel nodes permanently lock <strong>10,000,000 $AEGIS</strong> out of circulation.\n </div>\n </div>\n </div>\n\n <div class=\"flow-step\">\n <div class=\"step-num\">2</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Counter-Cyclical Market Buyback & Permanent Burn</div>\n <div class=\"step-desc\">\n Under <code>AegisFeeCollector.sol</code>, every averted liquidation triggers a 10% performance fee on the saved penalty. Exactly 50% of this fee routes to the Ascend Closed Hook Pool to market-buy $AEGIS and permanently destroy it at <code>0x000000000000000000000000000000000000dEaD</code> (Invariant <strong>INV-4</strong>).\n </div>\n </div>\n </div>\n\n <div class=\"flow-step\">\n <div class=\"step-num\">3</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Real Yield Staker Cash Flow (Zero Inflation)</div>\n <div class=\"step-desc\">\n The remaining 50% of captured performance fees is distributed directly in <strong>USDC and native debt assets</strong> to governance stakers. Stakers earn sustainable cash flow without inflationary token dilution or mercenary farming mechanics.\n </div>\n </div>\n </div>\n\n <div class=\"flow-step\">\n <div class=\"step-num\">4</div>\n <div class=\"step-content\">\n <div class=\"step-title\">Institutional TVL Protection Quotas</div>\n <div class=\"step-desc\">\n Under <code>AegisVault.sol</code>, institutional traders lock $AEGIS at a 1:50 ratio (1 $AEGIS locked per 50 units of protected debt) to access sub-second execution lanes, customized trailing take-profit parameters (&tau;), and reduced fee tiers.\n </div>\n </div>\n </div>\n </div>\n\n <h2>8. Circulating Supply Emission Milestones</h2>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr>\n <th>Milestone Timeline</th>\n <th>Gross Circulating Supply</th>\n <th>% of 700M Hard Cap</th>\n <th>Unlocking Components & Tranches</th>\n </tr>\n </thead>\n <tbody>\n <tr>\n <td><strong>TGE (Day 1)</strong></td>\n <td>118,300,000</td>\n <td><code>16.9%</code></td>\n <td>91M Ascend Fair Launch + 18.2M Ascend initial float + 9.1M Keeper float</td>\n </tr>\n <tr>\n <td><strong>Month 6</strong></td>\n <td>155,700,000</td>\n <td><code>22.2%</code></td>\n <td>Linear community emissions; zero team/investor unlocks</td>\n </tr>\n <tr>\n <td><strong>Month 12</strong></td>\n <td>201,100,000</td>\n <td><code>28.7%</code></td>\n <td>Protocol Security Reserve cliff begins (governed by DAO multi-sig)</td>\n </tr>\n <tr>\n <td><strong>Month 18</strong></td>\n <td>254,500,000</td>\n <td><code>36.4%</code></td>\n <td>Strategic Partner & Foundation cliff ends (1.55M/mo linear)</td>\n </tr>\n <tr>\n <td><strong>Month 24</strong></td>\n <td>308,000,000</td>\n <td><code>44.0%</code></td>\n <td><strong>Core Team 24-Month Cliff ends</strong>; linear vesting begins</td>\n </tr>\n <tr>\n <td><strong>Month 36</strong></td>\n <td>472,000,000</td>\n <td><code>67.4%</code></td>\n <td>Ascend community pool (24m) and Sentinel pool (36m) conclude</td>\n </tr>\n <tr>\n <td><strong>Month 48</strong></td>\n <td>586,000,000</td>\n <td><code>83.7%</code></td>\n <td>Foundation pool fully vested; only team tail vesting remains</td>\n </tr>\n <tr>\n <td><strong>Month 72 (Year 6)</strong></td>\n <td>700,000,000</td>\n <td><code>100.0%</code></td>\n <td>Core Team 48-month linear vesting complete; 100% supply fully issued</td>\n </tr>\n </tbody>\n </table>\n </div>\n <p><em>Notice: Gross circulating supply indicates theoretical maximums. Because <code>AegisFeeCollector.sol</code> continuously routes 50% of protocol performance fees to permanent burning at <code>0x...dEaD</code>, the net circulating supply will diverge progressively below these figures as adoption expands.</em></p>\n\n <h2>9. Parametric Quant Lifecycle (Non-Monetary Model)</h2>\n <p>The mathematical lifecycle of a risk event operates strictly across quantitative units and state variables:</p>\n\n <div class=\"math-card\">\n <div class=\"math-title\">Parametric Performance Fee Invariant</div>\n <div class=\"math-formula\">\\text{Fee}_{\\text{protocol}} = \\text{bps}_{\\text{fee}} \\times (D_{\\text{total}} \\times L_{\\text{penalty}}) = 0.10 \\times (D_{\\text{total}} \\times 0.10)</div>\n <table class=\"math-legend\">\n <tr><td>D_{\\text{total}}</td><td>Total borrowed debt in the protected vault</td><td>Base units</td></tr>\n <tr><td>L_{\\text{penalty}}</td><td>Avoided liquidation surcharge (e.g., 10%)</td><td>Dimensionless ratio</td></tr>\n <tr><td>\\text{bps}_{\\text{fee}}</td><td>Protocol performance fee (1,000 bps = 10%)</td><td>Constant (AegisFeeCollector)</td></tr>\n </table>\n </div>\n\n <div class=\"math-card\">\n <div class=\"math-title\">Ascend Buyback & Permanent Burn Allocation</div>\n <div class=\"math-formula\">\\text{Fee}_{\\text{burn}} = 0.50 \\times \\text{Fee}_{\\text{protocol}} \\implies \\text{swap}(\\text{Debt}, \\text{$AEGIS}) \\longrightarrow 0x000...\\text{dEaD}</div>\n <div class=\"math-formula\">\\text{Fee}_{\\text{yield}} = 0.50 \\times \\text{Fee}_{\\text{protocol}} \\implies \\text{distribute}(\\text{Debt}) \\longrightarrow \\text{Stakers}</div>\n <table class=\"math-legend\">\n <tr><td>\\text{Fee}_{\\text{burn}}</td><td>50% routed to Ascend Closed Hook Pool</td><td>Burned permanently</td></tr>\n <tr><td>\\text{Fee}_{\\text{yield}}</td><td>50% routed to Staking Vault</td><td>Real cash-flow yield</td></tr>\n <tr><td>INV-4</td><td>Strict fee conservation (Fee_total = Fee_burn + Fee_yield)</td><td>Formally verified</td></tr>\n </table>\n </div>\n\n <h2>10. Protocol Governance Administration</h2>\n <p>$AEGIS holders participate in decentralized governance across protocol risk parameters:</p>\n <ul>\n <li><strong>Liquidation Threshold Multipliers ($T$)</strong>: Adjusting margin safety buffers across collateral types.</li>\n <li><strong>Supported HyperCore Perpetual Markets</strong>: Approving new perpetual contract indices on HyperCore for hedging.</li>\n <li><strong>Sentinel Slashing Boundaries</strong>: Tuning maximum slash percentages (bounded &le; 10%) and uptime SLA standards.</li>\n <li><strong>Ascend Hook Pool Parameters</strong>: Adjusting liquidity distribution parameters and fee recycling ratios.</li>\n </ul>\n </div>\n "
  },
  {
    "id": "sentinel-operator-guide",
    "category": "Operations & Security",
    "tag": "NODE",
    "title": "Sentinel Node Operator Guide",
    "subtitle": "Requirements, bonding protocol, latency SLAs, and operational runbook for autonomous Sentinel keepers.",
    "prev": {
      "id": "tokenomics",
      "title": "$AEGIS Tokenomics & Economy"
    },
    "next": {
      "id": "security-invariants",
      "title": "Formal Security Model & Verification"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Operator Overview & Responsibilities</h2>\n <p>Sentinel nodes form the decentralized execution backbone of AEGIS. Nodes continuously monitor registered vaults on Elysium L2, evaluate trigger conditions, calculate required hedge sizes, and submit trade intents directly to HyperCore.</p>\n\n <h2>2. Node Operator Requirements</h2>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead><tr><th>Requirement</th><th>Specification</th><th>Rationale</th></tr></thead>\n <tbody>\n <tr>\n <td><strong>Bond Stake</strong></td>\n <td>25,000 $AEGIS</td>\n <td>Economic slashable collateral deposited in <code>AegisSentinelRegistry.sol</code>.</td>\n </tr>\n <tr>\n <td><strong>Compute Specs</strong></td>\n <td>8 vCPU, 32GB RAM, NVMe SSD</td>\n <td>Required to evaluate thousands of health factor curves per 100ms block.</td>\n </tr>\n <tr>\n <td><strong>Network Latency</strong></td>\n <td>&lt; 50ms to Elysium Validator Mesh</td>\n <td>Guarantees order intent dispatch within the 3-block SLA.</td>\n </tr>\n <tr>\n <td><strong>Software Daemon</strong></td>\n <td><code>@aegis/sentinel</code> (Node 20+)</td>\n <td>Official open-source TypeScript daemon runtime.</td>\n </tr>\n </tbody>\n </table>\n </div>\n\n <h2>3. Service Level Agreement (SLA) & Slashing Conditions</h2>\n <p>Under invariant <code>INV-2</code>, Sentinel nodes operate under strict economic penalties:</p>\n <ul>\n <li><strong>Lateness SLA Breach</strong>: If a vault breaches its trigger threshold and an assigned Sentinel fails to emit an order intent within <strong>3 Elysium blocks (~450ms)</strong>, 10% of their 25,000 $AEGIS bond (2,500 $AEGIS) is slashed.</li>\n <li><strong>Slippage Breach</strong>: If an intent executes on HyperCore with slippage exceeding the user's <code>maxSlippageBps</code> setting, the Sentinel is slashed and the funds are redirected to compensate the user.</li>\n </ul>\n </div>\n "
  },
  {
    "id": "security-invariants",
    "category": "Operations & Security",
    "tag": "SEC",
    "title": "Security Model & Formal Invariants",
    "subtitle": "Mathematical invariants INV-1 through INV-5, Phase 1C deferred fee debt, and formal verification proofs.",
    "prev": {
      "id": "sentinel-operator-guide",
      "title": "Sentinel Node Operator Guide"
    },
    "next": {
      "id": "verification-dossier",
      "title": "Technical Fact-Check & Verification Dossier"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. Formal Mathematical Invariants (INV-1 through INV-5)</h2>\n        <p>AEGIS protocol security is anchored in five mathematically proven invariants fuzzed across 160,000+ Foundry runs with zero violations:</p>\n\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Invariant</th><th>Mathematical Definition</th><th>Solidity Enforcement & Proof</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>INV-1: Non-Custodial Bounds</strong></td>\n                <td>$\\\\Delta Q_{\\\\text{vault}} = 0$ for all delegated calls</td>\n                <td>Session keys only dispatch trades via adapter; zero <code>transfer</code> or <code>approve</code> reachable.</td>\n              </tr>\n              <tr>\n                <td><strong>INV-2: Monotonic Health Restoration</strong></td>\n                <td>$H_{\\\\text{post}} > H_{\\\\text{pre}}$ upon take-profit unwind</td>\n                <td>Unwinds only occur at profitable trailing take-profit levels; profits pay down debt.</td>\n              </tr>\n              <tr>\n                <td><strong>INV-3: Emergency Killswitch</strong></td>\n                <td>$K_{\\\\text{session}} \\\\to \\\\emptyset$ in 1 transaction</td>\n                <td><code>manualOverride()</code> unilaterally resets delegated key to <code>address(0)</code> without affecting collateral.</td>\n              </tr>\n              <tr>\n                <td><strong>INV-4: Strict Fee Conservation</strong></td>\n                <td>$\\\\sum \\\\text{Fee} = \\\\text{Burn}_{50\\\\%} + \\\\text{Yield}_{50\\\\%}$</td>\n                <td><code>AegisFeeCollector.sol</code> splits 100% of collected fees evenly: 50% Ascend burn, 50% Sentinel yield.</td>\n              </tr>\n              <tr>\n                <td><strong>INV-5: Monotonic Sequential Nonces</strong></td>\n                <td>$\\\\text{Nonce}_{t+1} = \\\\text{Nonce}_t + 1$</td>\n                <td>EIP-712 structured order intents enforce monotonic nonce increments per user vault; zero replays possible.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>2. Phase 1C Deferred Fee Debt Guarantee</h2>\n        <p>In extreme market volatility, if a borrower has zero liquid USDC in their vault when a profitable hedge unwinds, standard protocols revert—blocking the emergency unwind and leaving the user exposed. AEGIS implements <strong>Phase 1C Deferred Fee Debt</strong>:</p>\n        <div class=\"callout callout-important\">\n          <div class=\"callout-icon\">🛡️</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Non-Blocking Unwind Invariant</div>\n            If fee payment fails, <code>AegisVault.sol</code> records the fee into <code>feeDebts[user] += protocolFee</code> and emits <code>FeeDebtRecorded</code>. The unwind transaction succeeds unconditionally, preserving user solvency. Fee debt is settled later via <code>repayFeeDebt()</code> or at collateral withdrawal.\n          </div>\n        </div>\n\n        <h2>3. Threat Vector & Adversarial Mitigations</h2>\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Attack Vector</th><th>Potential Threat</th><th>Architectural Defense</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>Rogue Sentinel Compromise</strong></td>\n                <td>Attacker gains Sentinel private key</td>\n                <td><strong>INV-1</strong>: Key cannot withdraw, drain, or transfer collateral. Can only submit trade intents.</td>\n              </tr>\n              <tr>\n                <td><strong>Stale Price Feed Relay</strong></td>\n                <td>Sentinel attempts to trigger hedge on old data</td>\n                <td><code>RelayedOracleAdapter.sol</code> enforces strict 120s staleness checks and 300s absolute expiration.</td>\n              </tr>\n              <tr>\n                <td><strong>Front-Running / MEV Sandwiches</strong></td>\n                <td>Searcher intercepts intent</td>\n                <td><strong>INV-5</strong>: Cryptographic EIP-712 session signatures and private HyperCore API lanes prevent public mempool extraction.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>4. Reproducing All 157 Test Verifications Locally</h2>\n        <p>Anyone can verify 100% of AEGIS smart contracts, formal invariants, and keeper loops locally in under 2 minutes:</p>\n        <div class=\"code-block-container\">\n          <div class=\"code-header\">\n            <div class=\"code-title\"><span>[BASH]</span> Local Test Suite Reproduction Commands</div>\n            <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Commands</button>\n          </div>\n          <div class=\"code-body\">\n            <pre><code><span class=\"tok-cmt\"># 1. Run Foundry contract & invariant fuzz suites (115 tests)</span>\nforge test\n\n<span class=\"tok-cmt\"># 2. Run Sentinel Keeper daemon test suite (29 tests)</span>\ncd keeper && npm test && cd ..\n\n<span class=\"tok-cmt\"># 3. Run Frontend Truthfulness & Live Elysium RPC check (13 tests)</span>\nnode test/test_frontend_truthfulness.js\n\n<span class=\"tok-cmt\"># Expected Result: 157 PASSED (100% Pass Rate across 25 suites)</span></code></pre>\n          </div>\n        </div>\n      </div>\n    "
  },
  {
    "id": "verification-dossier",
    "category": "Operations & Security",
    "tag": "PROOF",
    "title": "Technical Fact-Check & Verification Dossier",
    "subtitle": "Verified on-chain contracts, explorer links, invariant proofs, and reproducible test commands.",
    "prev": {
      "id": "security-invariants",
      "title": "Security Model & Formal Invariants"
    },
    "next": {
      "id": "audit-reports",
      "title": "Audit History & Verification Reports"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. Official Ecosystem Reference Links</h2>\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Resource</th><th>Official URL</th><th>Fact-Checked Topic</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>Elysium Testnet Explorer</strong></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer\" target=\"_blank\" rel=\"noopener\">elysium.kinetiq.xyz/testnet-explorer</a></td>\n                <td>Block heights (>9.2M), gas price (~0.20 gwei), contract bytecode, and event logs.</td>\n              </tr>\n              <tr>\n                <td><strong>Elysium Chain Specs</strong></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/docs/chain-specifications\" target=\"_blank\" rel=\"noopener\">elysium.kinetiq.xyz/docs/chain-specifications</a></td>\n                <td>Chain ID <code>99801</code>, Arbitrum Orbit rollup framework, sub-second block times.</td>\n              </tr>\n              <tr>\n                <td><strong>Elysium Testnet Faucet</strong></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-faucet\" target=\"_blank\" rel=\"noopener\">elysium.kinetiq.xyz/testnet-faucet</a></td>\n                <td>Public testnet gas distribution (0.10 HYPE drip cap per request).</td>\n              </tr>\n              <tr>\n                <td><strong>Ascend Launchpad Docs</strong></td>\n                <td><a href=\"https://ascendlaunch.gitbook.io/docs\" target=\"_blank\" rel=\"noopener\">ascendlaunch.gitbook.io/docs</a></td>\n                <td>Ecosystem token launchpad, liquidity structures, and hook pool AMM designs.</td>\n              </tr>\n              <tr>\n                <td><strong>Hyperliquid Docs</strong></td>\n                <td><a href=\"https://hyperliquid.gitbook.io/hyperliquid-docs\" target=\"_blank\" rel=\"noopener\">hyperliquid.gitbook.io/hyperliquid-docs</a></td>\n                <td>L1 consensus, sub-78ms Central Limit Order Book (CLOB), and trade-only API lane.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS GitHub</strong></td>\n                <td><a href=\"https://github.com/youngcrypton/Aegis\" target=\"_blank\" rel=\"noopener\">github.com/youngcrypton/Aegis</a></td>\n                <td>Open-source smart contracts, invariant test suites, keeper daemon, and brand kit.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>2. Canonical Testnet Contract Addresses</h2>\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Contract / Token</th><th>Testnet Address</th><th>Explorer Verification Link</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>Canonical Testnet USDC</strong></td>\n                <td><code>0x7D29d8047B905000459c0E80c34a26CeedcB47b2</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x7D29d8047B905000459c0E80c34a26CeedcB47b2\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>Canonical Testnet WHYPE</strong></td>\n                <td><code>0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>Canonical Multicall3</strong></td>\n                <td><code>0xcA11bde05977b3631167028862bE2a173976CA11</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0xcA11bde05977b3631167028862bE2a173976CA11\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>RelayedOracleAdapter</strong></td>\n                <td><code>0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>AgentDispatchAdapter</strong></td>\n                <td><code>0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>AegisFeeCollector</strong></td>\n                <td><code>0x8A791620dd6260079BF849Dc5567aDC3F2FdC318</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x8A791620dd6260079BF849Dc5567aDC3F2FdC318\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>AegisSentinelRegistry</strong></td>\n                <td><code>0x610178dA211FEF7D417bC0e6FeD39F05609AD788</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0x610178dA211FEF7D417bC0e6FeD39F05609AD788\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n              <tr>\n                <td><strong>AegisVault (Phase 1C)</strong></td>\n                <td><code>0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e</code></td>\n                <td><a href=\"https://elysium.kinetiq.xyz/testnet-explorer/address/0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e\" target=\"_blank\" rel=\"noopener\">View on Explorer ↗</a></td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n\n        <h2>3. Transparent Technical Nuances & Governance Status</h2>\n        <div class=\"callout callout-note\">\n          <div class=\"callout-icon\">💡</div>\n          <div class=\"callout-body\">\n            <div class=\"callout-title\">Radical Technical Honesty</div>\n            <ul>\n              <li><strong>Precompiles 0x0801 / 0x0802</strong>: Elysium Testnet runs stock ArbOS today. Precompiles will activate in the upcoming L2 hardfork. AEGIS bridges seamlessly today via <code>RelayedOracleAdapter.sol</code> and <code>AgentDispatchAdapter.sol</code> with zero vault migration.</li>\n              <li><strong>Ascend Hook Pools</strong>: Upstream closed hook pool contracts are in active development. AEGIS uses a modular <code>IAscendHookPool</code> interface that points directly to production pools upon mainnet deployment.</li>\n              <li><strong>Token Supply Allocations</strong>: Smart contract mechanisms (25,000 $AEGIS bonding, 10% max slash, 50/50 fee conservation, buyback-and-burn) are fully codified. Numerical supply figures (e.g. 700M cap) represent draft governance proposals subject to community ratification.</li>\n            </ul>\n          </div>\n        </div>\n      </div>\n    "
  },
  {
    "id": "audit-reports",
    "category": "Operations & Security",
    "tag": "AUDIT",
    "title": "Audit History & Verification Reports",
    "subtitle": "Chronological archive of internal security reports, independent reviews, and formal verification milestones.",
    "prev": {
      "id": "verification-dossier",
      "title": "Technical Fact-Check & Verification Dossier"
    },
    "next": {
      "id": "developer-quickstart",
      "title": "Developer Integration Quickstart"
    },
    "content": "\n      <div class=\"docs-section\">\n        <h2>1. Verification Scorecard</h2>\n        <div class=\"tokenomics-stats-grid\">\n          <div class=\"stat-metric-card\">\n            <div class=\"stat-metric-label\">Foundry Unit & Fuzz Tests</div>\n            <div class=\"stat-metric-value\">115 / 115</div>\n            <div class=\"stat-metric-sub\">14 suites, 160,000+ fuzz runs, 0 reverts, 100% pass rate.</div>\n            <span class=\"stat-metric-badge stat-badge-teal\">Solidity Verified</span>\n          </div>\n          <div class=\"stat-metric-card\">\n            <div class=\"stat-metric-label\">Sentinel Keeper Tests</div>\n            <div class=\"stat-metric-value\">29 / 29</div>\n            <div class=\"stat-metric-sub\">5 Jest suites covering telemetry, signing, and dual-mode dispatch.</div>\n            <span class=\"stat-metric-badge stat-badge-teal\">Daemon Verified</span>\n          </div>\n          <div class=\"stat-metric-card\">\n            <div class=\"stat-metric-label\">Frontend & RPC Truth</div>\n            <div class=\"stat-metric-value\">13 / 13</div>\n            <div class=\"stat-metric-sub\">Live Elysium testnet RPC connectivity and UI claim truthfulness.</div>\n            <span class=\"stat-metric-badge stat-badge-teal\">RPC Verified</span>\n          </div>\n          <div class=\"stat-metric-card\">\n            <div class=\"stat-metric-label\">Total Automated Tests</div>\n            <div class=\"stat-metric-value\">157 PASSED</div>\n            <div class=\"stat-metric-sub\">Continuous CI pipeline on every push to GitHub main branch.</div>\n            <span class=\"stat-metric-badge stat-badge-violet\">Zero Failures</span>\n          </div>\n        </div>\n\n        <h2>2. Audit Document Archive (docs/audits/)</h2>\n        <p>The AEGIS repository maintains an open, unedited archive of all formal engineering reports, independent architecture reviews, and security audits:</p>\n\n        <div class=\"table-wrapper\">\n          <table class=\"tech-table\">\n            <thead><tr><th>Audit Document</th><th>Key Focus Area</th><th>Verification Verdict</th></tr></thead>\n            <tbody>\n              <tr>\n                <td><strong>AEGIS_PHASE1C_DEFERRED_FEE_DEBT_REPORT.md</strong></td>\n                <td>Phase 1C non-blocking fee debt accounting during emergency unwinds</td>\n                <td>100% Passed. Non-blocking fee debt invariant verified.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_PHASE1C1_INDEPENDENT_FEE_DEBT_REVIEW.md</strong></td>\n                <td>Independent adversarial audit of fee debt griefing and reentrancy vectors</td>\n                <td>Clean verdict. Zero high/critical vulnerabilities found.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_PHASE23_UPSTREAM_AND_MIGRATION_RECONCILIATION_REPORT.md</strong></td>\n                <td>Precompile 0x0801/0x0802 stock ArbOS bridging and hot-swap readiness</td>\n                <td>Dual-mode architecture verified. Zero vault migration required.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_PHASE21_FRONTEND_TRUTHFULNESS_REPORT.md</strong></td>\n                <td>Automated audit ensuring UI metrics match on-chain truth with zero mock claims</td>\n                <td>13/13 tests passing against live Elysium testnet RPC.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_PHASE1B_SECURITY_REPORT.md</strong></td>\n                <td>Core invariant fuzzing across Invariants INV-1 through INV-5</td>\n                <td>160,000+ fuzz runs passing with zero invariant breaches.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_PHASE1B2_SENTINEL_LIFECYCLE_REPORT.md</strong></td>\n                <td>Sentinel bonding, telemetry polling, and 14-stage hedge lifecycle</td>\n                <td>Sub-78ms signing verified; 25k bond and 10% slash enforced.</td>\n              </tr>\n              <tr>\n                <td><strong>AEGIS_TESTNET_TO_MAINNET_READINESS_PLAN.md</strong></td>\n                <td>Comprehensive 4-stage readiness roadmap from Testnet to Mainnet Genesis</td>\n                <td>Milestone tracking for audit sign-off and precompile activation.</td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    "
  },
  {
    "id": "developer-quickstart",
    "category": "Developer Integration",
    "tag": "DEV",
    "title": "Developer Integration Quickstart",
    "subtitle": "Code walkthroughs, SDK examples, and Ethers.js/Viem patterns for integrating AEGIS.",
    "prev": {
      "id": "audit-reports",
      "title": "Audit History & Verification Reports"
    },
    "next": {
      "id": "brand-kit",
      "title": "AEGIS Brand Kit & Design System"
    },
    "content": "\n <div class=\"docs-section\">\n <h2>1. Connecting to Elysium L2</h2>\n <p>Developers can interact with AEGIS contracts on Elysium using standard Web3 libraries:</p>\n\n <div class=\"code-block-container\">\n <div class=\"code-header\">\n <div class=\"code-title\"><span>[CODE]</span> TypeScript SDK Quickstart</div>\n <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Code</button>\n </div>\n <div class=\"code-body\">\n <pre><code><span class=\"tok-kw\">import</span> { ethers } <span class=\"tok-kw\">from</span> <span class=\"tok-str\">\"ethers\"</span>;\n\n<span class=\"tok-cmt\">// Elysium L2 Configuration</span>\n<span class=\"tok-kw\">const</span> ELYSIUM_RPC = <span class=\"tok-str\">\"https://rpc.elysium.network\"</span>;\n<span class=\"tok-kw\">const</span> VAULT_ADDRESS = <span class=\"tok-str\">\"0x1234567890123456789012345678901234567890\"</span>;\n\n<span class=\"tok-kw\">async function</span> <span class=\"tok-fn\">checkVaultHealth</span>(userAddress: <span class=\"tok-typ\">string</span>) {\n <span class=\"tok-kw\">const</span> provider = <span class=\"tok-kw\">new</span> ethers.JsonRpcProvider(ELYSIUM_RPC);\n <span class=\"tok-kw\">const</span> vaultAbi = [\n <span class=\"tok-str\">\"function getHealthFactor(address user) view returns (uint256)\"</span>,\n <span class=\"tok-str\">\"function manualOverride() external\"</span>\n ];\n \n <span class=\"tok-kw\">const</span> vault = <span class=\"tok-kw\">new</span> ethers.Contract(VAULT_ADDRESS, vaultAbi, provider);\n <span class=\"tok-kw\">const</span> rawHealth = <span class=\"tok-kw\">await</span> vault.getHealthFactor(userAddress);\n \n <span class=\"tok-cmt\">// Health factor is scaled 1e4 (e.g. 11000 = 1.10)</span>\n <span class=\"tok-kw\">const</span> healthFactor = Number(rawHealth) / 10000;\n console.log(<span class=\"tok-str\">`User ${userAddress} Health Factor: ${healthFactor}`</span>);\n\n <span class=\"tok-kw\">if</span> (healthFactor &lt; 1.05) {\n console.warn(<span class=\"tok-str\">\"CRITICAL: Position approaching liquidation threshold!\"</span>);\n }\n}</code></pre>\n </div>\n </div>\n\n <h2>2. Delegating Session Keys via Contract Call</h2>\n <div class=\"code-block-container\">\n <div class=\"code-header\">\n <div class=\"code-title\"><span>[AUTH]</span> Delegating Ephemeral Session Key</div>\n <button class=\"copy-btn\" onclick=\"copyCode(this)\">Copy Code</button>\n </div>\n <div class=\"code-body\">\n <pre><code><span class=\"tok-kw\">async function</span> <span class=\"tok-fn\">delegateSessionKey</span>(signer: ethers.<span class=\"tok-typ\">Signer</span>) {\n <span class=\"tok-cmt\">// Generate ephemeral trade-only keypair</span>\n <span class=\"tok-kw\">const</span> sessionWallet = ethers.Wallet.createRandom();\n <span class=\"tok-kw\">const</span> durationSeconds = 86400 * 30; <span class=\"tok-cmt\">// 30 days</span>\n\n <span class=\"tok-kw\">const</span> vault = <span class=\"tok-kw\">new</span> ethers.Contract(\n VAULT_ADDRESS,\n [<span class=\"tok-str\">\"function delegateSessionKey(address key, uint64 duration) external\"</span>],\n signer\n );\n\n <span class=\"tok-kw\">const</span> tx = <span class=\"tok-kw\">await</span> vault.delegateSessionKey(sessionWallet.address, durationSeconds);\n <span class=\"tok-kw\">await</span> tx.wait();\n\n console.log(<span class=\"tok-str\">`Session key delegated successfully: ${sessionWallet.address}`</span>);\n <span class=\"tok-kw\">return</span> sessionWallet;\n}</code></pre>\n </div>\n </div>\n </div>\n "
  },
  {
    "id": "brand-kit",
    "category": "Brand System",
    "tag": "BRAND",
    "title": "AEGIS Brand Kit & Design System",
    "subtitle": "Authoritative visual identity standards, master mark geometry, CSS color tokens, typography scale, and component guidelines.",
    "prev": {
      "id": "developer-quickstart",
      "title": "Developer Integration Quickstart"
    },
    "next": null,
    "content": "\n <div class=\"docs-section\">\n <h2>1. Master Mark & Visual Identity</h2>\n <p>The AEGIS mark embodies three razor blades rising from a single baseline. Each blade symbolizes an interlocking layer of defense: position monitoring, sub-second hedging, and trailing recovery. The mark must always be rendered from the official SVG geometry and never redrawn or distorted.</p>\n\n <div class=\"logo-display-box\">\n <svg viewBox=\"0 0 40 40\" style=\"width: 72px; height: 72px;\" aria-hidden=\"true\">\n <polygon points=\"13.42,3.36 21.27,3.36 9.89,36.38 2.97,36.38\" fill=\"url(#mk-dark)\"/>\n <polygon points=\"21.95,12.72 29.26,12.72 20.83,36.38 14.05,36.38\" fill=\"url(#mk-dark)\"/>\n <polygon points=\"30.06,20.78 36.77,20.78 31.18,36.38 24.78,36.38\" fill=\"url(#mk-dark)\"/>\n </svg>\n <div style=\"font-family: var(--display); font-size: 28px; color: var(--ink);\">Aegis</div>\n <div style=\"font-size: 13px; color: var(--ink-2); text-align: center; max-width: 48ch;\">\n Primary Lockup: Mark centered or left-aligned with wordmark in Marcellus. The canonical 154° gradient runs from #1F0E4C at 0% to #087E6D at 100%.\n </div>\n </div>\n\n <div class=\"callout callout-important\">\n <div class=\"callout-icon\">[MATH]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">Mark Clear Space & Minimum Sizing Rules</div>\n Maintain at least one blade width (x) of clear margin on every side. Minimum display size on digital screens is 24px tall for the standalone mark, and 120px wide for the complete lockup. Glow effects are strictly permitted only on dark grounds and forbidden on light grounds.\n </div>\n </div>\n\n <h2>2. Authoritative CSS Color Tokens</h2>\n <p>All user interfaces must import <code>brand/kit/tokens.css</code> and reference colors exclusively through CSS variables. Hardcoding hexadecimal or RGB literals is strictly prohibited by <code>AGENTS.md</code>.</p>\n\n <div class=\"blade-band-demo\" title=\"135° Blade Ground Gradient\"></div>\n <p style=\"font-size: 12.5px; color: var(--ink-2); margin-top: -8px; margin-bottom: 24px;\">The Blade gradient (<code>--bg-base</code>) runs diagonally at 135° and serves as the global backdrop in both themes.</p>\n\n <div class=\"swatches-grid\">\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--ground); color: var(--ink);\">Ground</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--ground</dd>\n <dt>Dark</dt><dd>#1C2238</dd>\n <dt>Light</dt><dd>#F7F1FA</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Page base surface</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--raised); color: var(--ink);\">Raised</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--raised</dd>\n <dt>Dark</dt><dd>#22403F</dd>\n <dt>Light</dt><dd>#FFFFFF</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Cards and panels</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--ink); color: var(--ground);\">Ink</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--ink</dd>\n <dt>Dark</dt><dd>#E8ECF8</dd>\n <dt>Light</dt><dd>#161230</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Headlines & body</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--ink-2); color: var(--ground);\">Ink 2</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--ink-2</dd>\n <dt>Dark</dt><dd>#A7AFCB</dd>\n <dt>Light</dt><dd>#5C5778</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Supporting copy</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--accent); color: var(--on-accent);\">Accent</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--accent</dd>\n <dt>Dark</dt><dd>#5FD9BE</dd>\n <dt>Light</dt><dd>#07705F</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Live, primary action</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--hedge); color: var(--ink);\">Hedge</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--hedge</dd>\n <dt>Dark</dt><dd>#FFBE7A</dd>\n <dt>Light</dt><dd>#A34A08</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Hedge active state</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--danger); color: var(--ink);\">Danger</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--danger</dd>\n <dt>Dark</dt><dd>#FF8A9A</dd>\n <dt>Light</dt><dd>#B8254F</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Liquidation risk</dd>\n </dl>\n </div>\n\n <div class=\"swatch-card\">\n <div class=\"swatch-chip\" style=\"background: var(--violet); color: var(--ink);\">Violet</div>\n <dl class=\"swatch-details\">\n <dt>Token</dt><dd>--violet</dd>\n <dt>Dark</dt><dd>#C9A6FF</dd>\n <dt>Light</dt><dd>#6930EA</dd>\n <dt>Role</dt><dd style=\"font-family: inherit;\">Mark & graphics only</dd>\n </dl>\n </div>\n </div>\n\n <h2>3. Measured Contrast Ratios (WCAG AA Compliance)</h2>\n <div class=\"table-wrapper\">\n <table class=\"tech-table\">\n <thead>\n <tr><th>Pairing</th><th>Theme Mode</th><th>Contrast Ratio</th><th>WCAG Standard</th></tr>\n </thead>\n <tbody>\n <tr><td>Ink on Blade Ground</td><td>Dark Mode</td><td class=\"num\">13.3 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AAA)</td></tr>\n <tr><td>Ink 2 on Raised Panel</td><td>Dark Mode</td><td class=\"num\">5.1 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Accent on Raised Panel</td><td>Dark Mode</td><td class=\"num\">6.5 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Hedge on Raised Panel</td><td>Dark Mode</td><td class=\"num\">6.9 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Danger on Raised Panel</td><td>Dark Mode</td><td class=\"num\">5.0 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Ink on Paper Surface</td><td>Light Mode</td><td class=\"num\">18.1 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AAA)</td></tr>\n <tr><td>Ink 2 on Paper Surface</td><td>Light Mode</td><td class=\"num\">6.1 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Accent on White Panel</td><td>Light Mode</td><td class=\"num\">6.0 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Hedge on White Panel</td><td>Light Mode</td><td class=\"num\">5.9 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n <tr><td>Danger on White Panel</td><td>Light Mode</td><td class=\"num\">6.1 : 1</td><td style=\"color:var(--accent);font-weight:600;\">Pass (AA)</td></tr>\n </tbody>\n </table>\n </div>\n\n <h2>4. Typography Guidelines</h2>\n <p>The AEGIS design system mandates exactly two typeface families:</p>\n <ul>\n <li><strong>Display (<code>--display</code>)</strong>: <code>Marcellus</code> (Georgia fallback). Used for headlines, hero metrics, and the official wordmark. Display headings use balanced line breaking (<code>text-wrap: balance</code>).</li>\n <li><strong>Text & UI (<code>--text</code>)</strong>: <code>Inter</code> (system-ui fallback). Light 300 for display lines, 400 for running body text, 500 for labels, and 600 for semibold emphasis.</li>\n <li><strong>Numerical Data</strong>: All dynamic numerals, liquidation ratios, and prices enforce tabular figures (<code>font-variant-numeric: tabular-nums</code>).</li>\n </ul>\n\n <h2>5. Surfaces, Layout & Component Standards</h2>\n <ul>\n <li><strong>Panels & Bento Surfaces</strong>: Flat cards with a <code>16px</code> border radius, a hairline <code>1px solid var(--rule)</code> border, and <code>var(--raised)</code> background. Elevation is communicated through border contrast, not decorative drop shadows.</li>\n <li><strong>Action Buttons</strong>: Primary buttons use fully rounded pill shapes (<code>border-radius: 999px</code>), solid <code>var(--accent)</code> background, and <code>var(--on-accent)</code> text. Secondary actions use ghost buttons with rule borders.</li>\n <li><strong>Status Badges</strong>: Outlined pill badges color-coded by state: teal for Healthy, amber for Hedge Active, rose for Liquidation Risk.</li>\n </ul>\n\n <h2>6. Brand Voice & Editorial Tone</h2>\n <div class=\"callout callout-note\">\n <div class=\"callout-icon\">[NOTE]</div>\n <div class=\"callout-body\">\n <div class=\"callout-title\">Calm Under Pressure</div>\n AEGIS deals with capital defense and liquidation risk. Communications must remain calm, exact, and unemotional. Use active voice and sentence case. Provide exact figures with units ($22,000, 12.40 ETH, 1.20). Strictly avoid exclamation points, rocket emojis, or hype-laden marketing jargon.\n </div>\n </div>\n\n <h2>7. Open Brand Items</h2>\n <p>In accordance with <code>AGENTS.md</code>, two open items remain subject to core community resolution:</p>\n <ol>\n <li><strong>Wordmark Case</strong>: The web properties write \"Aegis\" in sentence case Marcellus, while social headers use tracked all-caps \"AEGIS\". Developers must not unilaterally resolve this; follow the kit as written.</li>\n <li><strong>Navy on White</strong>: The navy color token (<code>#1C2238</code>) on light backgrounds is under review for final tinting.</li>\n </ol>\n\n <h2>8. Authoritative Standalone Brand Kit</h2>\n <p>For interactive colorway inspectors, download links for master vector marks (<code>brand/logo/aegis-mark.svg</code>), and official avatar/banner files for social platforms, open the dedicated standalone brand kit:</p>\n <div style=\"margin-top: 16px;\">\n <a href=\"../brand/kit/aegis-brand-kit.html\" class=\"header-action-btn\" target=\"_blank\" rel=\"noopener\">Open Interactive Aegis Brand Kit ↗</a>\n </div>\n </div>\n "
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
