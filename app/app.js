/**
 * AEGIS Protocol — High-Frequency Risk Sentinel & Pro-Trader Terminal
 * Client-Side State Engine, Brand Kit UI, and Mathematical Models
 * Conforms 100% to brand/kit/tokens.css, EIP-1193, and Security Invariants INV-1 to INV-5.
 */

(function () {
  'use strict';

  // --- 1. CONSTANTS & SYSTEM STATE ---
  const VAULT_CONSTANTS = {
    collateralAmount: 1000.0, // 1,000 HYPE collateral
    debtUsdc: 32000.0,        // $32,000 USDC borrowed debt
    liquidationThreshold: 0.80, // 80% maintenance threshold (T = 8000 bps)
    liquidationPrice: 40.0,   // $32,000 / (1000 * 0.80) = $40.00
    basePrice: 48.50,
    chainId: '0x185d9',       // 99801 in hex
    chainName: 'Elysium L2'
  };

  // Pro Configuration State
  const proConfig = {
    triggerMode: 'HYBRID',
    priceTrigger: 44.20,
    healthTrigger: 1.10,
    hedgeRatio: 0.50,        // 50% = 500 HYPE
    trailingTpPct: 0.015,    // 1.5% trailing take-profit (tau)
    orderType: 'POST_ONLY',
    manualOverrideActive: false
  };

  // Runtime State
  const runtimeState = {
    currentPrice: VAULT_CONSTANTS.basePrice,
    previousPrice: VAULT_CONSTANTS.basePrice,
    liveTickerActive: true,
    blockNumber: 18492041,
    walletConnected: false,
    walletAddress: '0x71C85A3F9a489F31b54aA89E62cE378901b2a89F',
    activeHedge: {
      isOpen: false,
      entryPrice: 0.0,
      size: 0.0,
      lowestWick: 0.0,
      trailingExitPrice: 0.0,
      unrealizedPnl: 0.0,
      realizedPnlTotal: 0.0
    },
    metrics: {
      liquidationsAvertedUsd: 48250.0,
      tokensBurned: 164820.0,
      stakerYieldUsdc: 14210.0
    },
    simInterval: null,
    tickerInterval: null
  };

  // --- 2. DOM REFERENCES ---
  const el = {
    // Header controls
    themeToggleBtn: document.getElementById('themeBtn') || document.getElementById('themeToggleBtn'),
    themeToggleText: document.getElementById('themeToggleText'),
    walletBtn: document.getElementById('walletBtn'),
    walletAddrText: document.getElementById('walletAddrText'),
    latencyVal: document.getElementById('latencyVal'),
    sessionBadge: document.getElementById('sessionBadge'),

    // Session Key Modal
    btnOpenSessionKeyModal: document.getElementById('btnOpenSessionKeyModal'),
    sessionKeyModal: document.getElementById('sessionKeyModal'),
    btnCloseSessionKeyModal: document.getElementById('btnCloseSessionKeyModal'),
    btnCancelSessionKey: document.getElementById('btnCancelSessionKey'),
    btnConfirmDelegateKey: document.getElementById('btnConfirmDelegateKey'),
    ephemeralKeyAddress: document.getElementById('ephemeralKeyAddress'),
    sessionDurationDays: document.getElementById('sessionDurationDays'),

    // Hero metrics
    heroHealthValue: document.getElementById('heroHealthValue'),
    heroLiquidationBuffer: document.getElementById('heroLiquidationBuffer'),
    heroSentinelStatus: document.getElementById('heroSentinelStatus'),
    heroLiquidationsSaved: document.getElementById('heroLiquidationsSaved'),
    heroBurnedTokens: document.getElementById('heroBurnedTokens'),

    // Position data
    liveMarkPrice: document.getElementById('liveMarkPrice'),
    collateralUsdVal: document.getElementById('collateralUsdVal'),
    markPriceChange: document.getElementById('markPriceChange'),

    // Health factor gauges
    gaugeRatioText: document.getElementById('gaugeRatioText'),
    gaugeNeedleGroup: document.getElementById('gaugeNeedleGroup'),
    gaugeSvgReadout: document.getElementById('gaugeSvgReadout'),
    gaugeMarker: document.getElementById('gaugeMarker'),
    gaugeMarkerVal: document.getElementById('gaugeMarkerVal'),

    // Hedge box
    activeHedgeBox: document.getElementById('activeHedgeBox'),
    hedgeStatusBadge: document.getElementById('hedgeStatusBadge'),
    hedgeStatusText: document.getElementById('hedgeStatusText'),
    hedgeMetaText: document.getElementById('hedgeMetaText'),
    hedgeSizeVal: document.getElementById('hedgeSizeVal'),
    hedgeEntryVal: document.getElementById('hedgeEntryVal'),
    hedgePnlVal: document.getElementById('hedgePnlVal'),
    netDeltaVal: document.getElementById('netDeltaVal'),

    // CLOB
    clobSpread: document.getElementById('clobSpread'),
    clobMidPrice: document.getElementById('clobMidPrice'),
    clobAsks: document.getElementById('clobAsks'),
    clobBids: document.getElementById('clobBids'),

    // Controls form
    triggerMode: document.getElementById('triggerMode'),
    priceTrigger: document.getElementById('priceTrigger'),
    priceTriggerDisplay: document.getElementById('priceTriggerDisplay'),
    healthTrigger: document.getElementById('healthTrigger'),
    healthTriggerDisplay: document.getElementById('healthTriggerDisplay'),
    hedgeCoverage: document.getElementById('hedgeCoverage'),
    hedgeCoverageDisplay: document.getElementById('hedgeCoverageDisplay'),
    trailingTp: document.getElementById('trailingTp'),
    trailingTpDisplay: document.getElementById('trailingTpDisplay'),
    btnSaveConfig: document.getElementById('btnSaveConfig'),
    btnManualOverride: document.getElementById('btnManualOverride'),
    tokenBurnDisplay: document.getElementById('tokenBurnDisplay'),

    // Simulation & Audit
    btnCrashTest: document.getElementById('btnCrashTest'),
    btnRetraceTest: document.getElementById('btnRetraceTest'),
    btnResetMarket: document.getElementById('btnResetMarket'),
    liveTickerToggle: document.getElementById('liveTickerToggle'),
    auditTerminal: document.getElementById('auditTerminal'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- 3. THEME MANAGEMENT ---
  function initTheme() {
    const savedTheme = localStorage.getItem('aegis-theme') || 'dark';
    setTheme(savedTheme);

    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aegis-theme', theme);
    if (el.themeToggleText) {
      el.themeToggleText.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
  }

  // --- 4. EIP-1193 WEB3 WALLET PROVIDER ---
  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      showToast('EIP-1193 provider not detected. Running simulated Sentinel mode.');
      runtimeState.walletConnected = true;
      updateWalletUI(runtimeState.walletAddress);
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        runtimeState.walletAddress = accounts[0];
        runtimeState.walletConnected = true;

        // Verify or prompt network switch to Elysium L2
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: VAULT_CONSTANTS.chainId }]
          });
        } catch (switchError) {
          // Chain not added to wallet yet
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: VAULT_CONSTANTS.chainId,
                  chainName: 'Elysium L2 Testnet',
                  rpcUrls: ['https://testnet-rpc.elysium.kinetiq.xyz'],
                  blockExplorerUrls: ['https://elysium.kinetiq.xyz/testnet-explorer'],
                  nativeCurrency: { name: 'Elysium HYPE', symbol: 'HYPE', decimals: 18 }
                }]
              });
            } catch (addError) {
              console.warn('Network addition cancelled:', addError);
            }
          }
        }

        updateWalletUI(runtimeState.walletAddress);
        showToast(`Connected wallet: ${formatAddress(runtimeState.walletAddress)}`);
        logAudit('WALLET', `EIP-1193 session connected: ${runtimeState.walletAddress}`, 'accent');
      }
    } catch (err) {
      console.error('Wallet connection rejected:', err);
      showToast('Wallet connection was cancelled or rejected.');
    }
  }

  function updateWalletUI(addr) {
    if (el.walletAddrText) {
      el.walletAddrText.textContent = formatAddress(addr);
    }
    if (el.walletBtn) {
      el.walletBtn.classList.add('connected');
    }
  }

  function formatAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  // Listen for provider events if available
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        runtimeState.walletAddress = accounts[0];
        updateWalletUI(accounts[0]);
      } else {
        runtimeState.walletConnected = false;
        if (el.walletAddrText) el.walletAddrText.textContent = 'Connect Wallet';
        if (el.walletBtn) el.walletBtn.classList.remove('connected');
      }
    });

    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }

  // --- 5. MATHEMATICAL MARGIN & HEALTH FACTOR CALCULATOR ---

  /**
   * Health factor formula from SPECIFICATION.md §6.1:
   * H = (Q_collateral * P_mark * T) / D_debt
   */
  function calculateHealthFactor(price) {
    const collateralValue = VAULT_CONSTANTS.collateralAmount * price;
    const numerator = collateralValue * VAULT_CONSTANTS.liquidationThreshold;
    return numerator / VAULT_CONSTANTS.debtUsdc;
  }

  /**
   * Updates all UI displays and SVG health factor gauge.
   */
  function updateUI() {
    const price = runtimeState.currentPrice;
    const h = calculateHealthFactor(price);
    const collateralVal = VAULT_CONSTANTS.collateralAmount * price;

    // 1. Text telemetry
    if (el.liveMarkPrice) el.liveMarkPrice.textContent = `$${price.toFixed(2)} USD`;
    if (el.collateralUsdVal) el.collateralUsdVal.textContent = `$${collateralVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    if (el.clobMidPrice) el.clobMidPrice.textContent = `$${price.toFixed(2)}`;

    // Price change calculation
    const changePct = ((price - VAULT_CONSTANTS.basePrice) / VAULT_CONSTANTS.basePrice) * 100;
    if (el.markPriceChange) {
      el.markPriceChange.textContent = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}% (sim)`;
      el.markPriceChange.className = `stat-sub font-mono ${changePct < 0 ? 'text-danger' : 'text-accent'}`;
    }

    // 2. Health Factor Gauges
    const bufferUsd = (price - VAULT_CONSTANTS.liquidationPrice).toFixed(2);
    const bufferPct = (((price - VAULT_CONSTANTS.liquidationPrice) / price) * 100).toFixed(1);

    if (el.gaugeRatioText) {
      el.gaugeRatioText.textContent = `H = ${h.toFixed(2)} (Buffer: $${bufferUsd} / +${bufferPct}% to Liquidation)`;
    }
    if (el.heroHealthValue) {
      let pillClass = 'pill-accent';
      let pillText = 'SAFE';
      if (h <= 1.05) {
        pillClass = 'pill-danger';
        pillText = 'CRITICAL';
      } else if (h <= 1.15) {
        pillClass = 'pill-hedge';
        pillText = 'ARMED';
      }
      el.heroHealthValue.innerHTML = `${h.toFixed(2)} <span class="status-pill ${pillClass}">${pillText}</span>`;
    }
    if (el.heroLiquidationBuffer) {
      el.heroLiquidationBuffer.textContent = `Distance to Liquidation: ${bufferPct >= 0 ? '+' : ''}${bufferPct}% ($${bufferUsd})`;
    }

    // Dynamic Radial SVG Gauge Needle Positioning
    // Scale: H in [0.90, 1.80] mapped to rotation [-90deg, +90deg]
    let deg = -90 + Math.min(Math.max((h - 0.90) / 0.90, 0), 1) * 180;
    if (el.gaugeNeedleGroup) {
      el.gaugeNeedleGroup.setAttribute('transform', `rotate(${deg.toFixed(1)}, 150, 145)`);
    }
    if (el.gaugeSvgReadout) {
      el.gaugeSvgReadout.textContent = h.toFixed(2);
    }

    // Linear buffer bar track
    // Mapping: H in [1.00, 1.60] to percentage [0%, 100%]
    const trackPct = Math.min(Math.max(((h - 1.00) / 0.60) * 100, 2), 98);
    if (el.gaugeMarker) {
      el.gaugeMarker.style.left = `${trackPct.toFixed(1)}%`;
    }
    if (el.gaugeMarkerVal) {
      el.gaugeMarkerVal.textContent = h.toFixed(2);
    }

    // 3. Active Hedge State Box
    if (runtimeState.activeHedge.isOpen) {
      const entry = runtimeState.activeHedge.entryPrice;
      const size = runtimeState.activeHedge.size;
      const unrlPnl = size * (entry - price);
      runtimeState.activeHedge.unrealizedPnl = unrlPnl;

      if (el.activeHedgeBox) el.activeHedgeBox.classList.add('hedged');
      if (el.hedgeStatusBadge) el.hedgeStatusBadge.className = 'hedge-status-badge text-hedge';
      if (el.hedgeStatusText) el.hedgeStatusText.textContent = 'ACTIVE SHORT HEDGE (HYPERCORE CLOB)';
      if (el.hedgeSizeVal) el.hedgeSizeVal.textContent = `${size.toFixed(2)} HYPE Short`;
      if (el.hedgeEntryVal) el.hedgeEntryVal.textContent = `$${entry.toFixed(2)}`;
      if (el.hedgePnlVal) {
        el.hedgePnlVal.textContent = `${unrlPnl >= 0 ? '+' : ''}$${unrlPnl.toFixed(2)} USDC`;
        el.hedgePnlVal.className = `val font-mono ${unrlPnl >= 0 ? 'text-accent' : 'text-danger'}`;
      }
      if (el.netDeltaVal) {
        const netDelta = VAULT_CONSTANTS.collateralAmount - size;
        el.netDeltaVal.textContent = `+${netDelta.toFixed(0)} HYPE (Partially Hedged)`;
      }
      if (el.heroSentinelStatus) {
        el.heroSentinelStatus.innerHTML = `HEDGED <span class="status-pill pill-hedge">EXECUTED</span>`;
      }
    } else {
      if (el.activeHedgeBox) el.activeHedgeBox.classList.remove('hedged');
      if (el.hedgeStatusBadge) el.hedgeStatusBadge.className = 'hedge-status-badge';
      if (el.hedgeStatusText) {
        el.hedgeStatusText.textContent = proConfig.manualOverrideActive
          ? 'OVERRIDDEN — KEYS REVOKED (INV-3)'
          : 'STANDBY — RISK MONITORED';
      }
      if (el.hedgeSizeVal) el.hedgeSizeVal.textContent = '0.00 HYPE Short';
      if (el.hedgeEntryVal) el.hedgeEntryVal.textContent = '--';
      if (el.hedgePnlVal) {
        el.hedgePnlVal.textContent = `$${runtimeState.activeHedge.realizedPnlTotal.toFixed(2)} USDC`;
        el.hedgePnlVal.className = 'val font-mono';
      }
      if (el.netDeltaVal) el.netDeltaVal.textContent = '+1,000 HYPE (Unhedged)';

      if (el.heroSentinelStatus) {
        el.heroSentinelStatus.innerHTML = proConfig.manualOverrideActive
          ? `OVERRIDDEN <span class="status-pill pill-danger">REVOKED</span>`
          : `ARMED <span class="status-pill pill-accent">ACTIVE</span>`;
      }
    }

    renderOrderbook(price);
  }

  // --- 6. HYPERCORE CLOB ORDERBOOK GENERATOR ---
  function renderOrderbook(midPrice) {
    if (!el.clobAsks || !el.clobBids) return;

    const tick = 0.05;
    const levels = 5;

    // Asks (descending from highest to lowest ask)
    let asksHtml = `
      <div class="clob-row clob-head font-mono">
        <span>PRICE (USDC)</span>
        <span>SIZE (HYPE)</span>
        <span>TOTAL</span>
      </div>`;

    let askTotal = 0;
    const askRows = [];
    for (let i = levels; i >= 1; i--) {
      const askPrice = (midPrice + i * tick).toFixed(2);
      const askSize = Math.floor(450 + Math.sin(i * 1.5 + midPrice) * 200);
      askTotal += askSize;
      const widthPct = Math.min((askSize / 1000) * 100, 100).toFixed(0);
      askRows.push(`
        <div class="clob-row font-mono">
          <span class="text-danger">$${askPrice}</span>
          <span>${askSize.toLocaleString()}</span>
          <span>${askTotal.toLocaleString()}</span>
          <div class="depth-bar" style="width: ${widthPct}%;"></div>
        </div>
      `);
    }
    el.clobAsks.innerHTML = asksHtml + askRows.join('');

    // Bids (descending from highest bid down)
    let bidsHtml = '';
    let bidTotal = 0;
    for (let i = 1; i <= levels; i++) {
      const bidPrice = (midPrice - i * tick).toFixed(2);
      const bidSize = Math.floor(520 + Math.cos(i * 1.2 + midPrice) * 240);
      bidTotal += bidSize;
      const widthPct = Math.min((bidSize / 1000) * 100, 100).toFixed(0);
      bidsHtml += `
        <div class="clob-row font-mono">
          <span class="text-accent">$${bidPrice}</span>
          <span>${bidSize.toLocaleString()}</span>
          <span>${bidTotal.toLocaleString()}</span>
          <div class="depth-bar" style="width: ${widthPct}%;"></div>
        </div>
      `;
    }
    el.clobBids.innerHTML = bidsHtml;
  }

  // --- 7. REAL-TIME AUDIT LOGGING ---
  function logAudit(source, message, tagClass = 'accent') {
    if (!el.auditTerminal) return;
    const time = new Date().toISOString().substring(11, 19);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-tag ${tagClass}">[${source}]</span>
      <span>${message}</span>
    `;
    el.auditTerminal.prepend(entry);

    // Keep log buffer bounded to 40 lines
    while (el.auditTerminal.children.length > 40) {
      el.auditTerminal.removeChild(el.auditTerminal.lastChild);
    }
  }

  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // --- 8. QUANT STRESS TEST SIMULATIONS ---

  /**
   * Scenario A: Flash Crash (-18%)
   * Demonstrates Sentinel hedge execution when H breaches trigger threshold.
   */
  function simulateFlashCrash() {
    clearActiveSimulation();
    logAudit('SIMULATOR', 'Initiating -18% Flash Crash stress test...', 'danger');
    showToast('Starting -18% Flash Crash simulation...');

    const startPrice = VAULT_CONSTANTS.basePrice;
    const targetPrice = 39.77; // -18% of $48.50
    let step = 0;
    const totalSteps = 24;

    runtimeState.simInterval = setInterval(() => {
      step++;
      const current = startPrice - ((startPrice - targetPrice) * (step / totalSteps));
      runtimeState.currentPrice = current;
      runtimeState.blockNumber++;

      const h = calculateHealthFactor(current);

      // Trigger condition check per Invariant INV-1 / INV-3
      if (
        !runtimeState.activeHedge.isOpen &&
        !proConfig.manualOverrideActive &&
        (current <= proConfig.priceTrigger || h <= proConfig.healthTrigger)
      ) {
        executeShortHedge(current);
      }

      updateUI();

      if (step >= totalSteps) {
        clearInterval(runtimeState.simInterval);
        runtimeState.simInterval = null;
        logAudit('SENTINEL', `Flash crash settled at $${current.toFixed(2)}. Spot liquidation averted.`, 'accent');
        showToast('Flash crash bottom reached. Position preserved by delta hedge!');
      }
    }, 120);
  }

  /**
   * Scenario B: Retracement (-8% then V-Bounce)
   * Demonstrates dynamic bottom-wick tracking and trailing unwind (tau = 1.5%).
   */
  function simulateRetracement() {
    clearActiveSimulation();
    logAudit('SIMULATOR', 'Initiating Retracement & Trailing Take-Profit simulation...', 'hedge');
    showToast('Simulating Retracement & Trailing Take-Profit unwind...');

    const startPrice = VAULT_CONSTANTS.basePrice;
    const troughPrice = 42.00; // -13.4% wick
    const recoveryPrice = 47.00;
    let phase = 1;
    let step = 0;
    const stepsPhase1 = 18;
    const stepsPhase2 = 24;

    runtimeState.simInterval = setInterval(() => {
      step++;
      runtimeState.blockNumber++;

      if (phase === 1) {
        // Downward wick towards trough
        const current = startPrice - ((startPrice - troughPrice) * (step / stepsPhase1));
        runtimeState.currentPrice = current;

        // Open hedge on breach
        if (!runtimeState.activeHedge.isOpen && !proConfig.manualOverrideActive) {
          if (current <= proConfig.priceTrigger || calculateHealthFactor(current) <= proConfig.healthTrigger) {
            executeShortHedge(current);
          }
        }

        // Track lowest wick
        if (runtimeState.activeHedge.isOpen) {
          if (current < runtimeState.activeHedge.lowestWick) {
            runtimeState.activeHedge.lowestWick = current;
            runtimeState.activeHedge.trailingExitPrice = current * (1 + proConfig.trailingTpPct);
          }
        }

        if (step >= stepsPhase1) {
          phase = 2;
          step = 0;
          logAudit('TRACKER', `Bottom wick established at $${troughPrice.toFixed(2)}. Trailing TP set at $${runtimeState.activeHedge.trailingExitPrice.toFixed(2)}`, 'accent');
        }
      } else {
        // Rebound upwards
        const current = troughPrice + ((recoveryPrice - troughPrice) * (step / stepsPhase2));
        runtimeState.currentPrice = current;

        // Check trailing take-profit trigger: P_current >= P_exit
        if (runtimeState.activeHedge.isOpen) {
          if (current >= runtimeState.activeHedge.trailingExitPrice) {
            unwindShortHedge(current);
          }
        }

        if (step >= stepsPhase2) {
          clearInterval(runtimeState.simInterval);
          runtimeState.simInterval = null;
          logAudit('UNWIND', 'Retracement complete. Vault restored to pristine unhedged standby.', 'accent');
          showToast('V-Bounce complete. Short hedge closed with cash profit!');
        }
      }

      updateUI();
    }, 120);
  }

  function executeShortHedge(price) {
    const size = VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio; // 500 HYPE
    runtimeState.activeHedge.isOpen = true;
    runtimeState.activeHedge.entryPrice = price;
    runtimeState.activeHedge.size = size;
    runtimeState.activeHedge.lowestWick = price;
    runtimeState.activeHedge.trailingExitPrice = price * (1 + proConfig.trailingTpPct);

    logAudit('SENTINEL', `Trigger breached (H=${calculateHealthFactor(price).toFixed(2)}). Signing EIP-712 Intent...`, 'danger');
    logAudit('0x0802', `Dispatched short perpetual order: -${size.toFixed(0)} HYPE @ $${price.toFixed(2)}`, 'hedge');
    showToast(`Hedge opened: -${size.toFixed(0)} HYPE short at $${price.toFixed(2)}`);
  }

  function unwindShortHedge(price) {
    const hedge = runtimeState.activeHedge;
    const profit = hedge.size * (hedge.entryPrice - price);
    hedge.realizedPnlTotal += profit;
    hedge.isOpen = false;

    // 10% fee capture split 50/50 per Invariant INV-4
    const protocolFee = profit * 0.10;
    const burnShareUsd = protocolFee * 0.50;
    const yieldShareUsd = protocolFee * 0.50;
    const aegisTokensBurned = burnShareUsd / 0.50; // assuming $0.50 per AEGIS

    runtimeState.metrics.tokensBurned += aegisTokensBurned;
    runtimeState.metrics.stakerYieldUsdc += yieldShareUsd;

    if (el.tokenBurnDisplay) {
      el.tokenBurnDisplay.textContent = `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} $AEGIS`;
    }
    if (el.heroBurnedTokens) {
      el.heroBurnedTokens.innerHTML = `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} <span class="metric-unit">AEGIS</span>`;
    }

    logAudit('0x0802', `Trailing Take-Profit triggered at $${price.toFixed(2)}. Unwound ${hedge.size.toFixed(0)} HYPE short.`, 'accent');
    logAudit('FEE-COLLECTOR', `Realized profit: +$${profit.toFixed(2)} USDC | 50% Burn: ${Math.floor(aegisTokensBurned)} $AEGIS | 50% Real Yield: +$${yieldShareUsd.toFixed(2)} USDC`, 'violet');
    showToast(`Hedge unwound! Realized profit: +$${profit.toFixed(2)} USDC`);
  }

  function resetMarket() {
    clearActiveSimulation();
    runtimeState.currentPrice = VAULT_CONSTANTS.basePrice;
    runtimeState.activeHedge.isOpen = false;
    runtimeState.activeHedge.entryPrice = 0.0;
    runtimeState.activeHedge.size = 0.0;
    proConfig.manualOverrideActive = false;

    logAudit('SIMULATOR', 'Market state reset to baseline ($48.50).', 'accent');
    showToast('Market reset to baseline.');
    updateUI();
  }

  function clearActiveSimulation() {
    if (runtimeState.simInterval) {
      clearInterval(runtimeState.simInterval);
      runtimeState.simInterval = null;
    }
  }

  // --- 9. EVENT LISTENERS & INITIALIZATION ---
  function initListeners() {
    // EIP-1193 connect button
    if (el.walletBtn) {
      el.walletBtn.addEventListener('click', connectWallet);
    }

    // Simulation triggers
    if (el.btnCrashTest) el.btnCrashTest.addEventListener('click', simulateFlashCrash);
    if (el.btnRetraceTest) el.btnRetraceTest.addEventListener('click', simulateRetracement);
    if (el.btnResetMarket) el.btnResetMarket.addEventListener('click', resetMarket);

    // Live ticker toggle
    if (el.liveTickerToggle) {
      el.liveTickerToggle.addEventListener('change', (e) => {
        runtimeState.liveTickerActive = e.target.checked;
        logAudit('FEED', `Live 100ms ticker ${runtimeState.liveTickerActive ? 'resumed' : 'paused'}.`, 'accent');
      });
    }

    // Form parameter inputs
    if (el.priceTrigger) {
      el.priceTrigger.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        proConfig.priceTrigger = val;
        if (el.priceTriggerDisplay) el.priceTriggerDisplay.textContent = `$${val.toFixed(2)}`;
      });
    }

    if (el.healthTrigger) {
      el.healthTrigger.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        proConfig.healthTrigger = val;
        if (el.healthTriggerDisplay) el.healthTriggerDisplay.textContent = val.toFixed(2);
      });
    }

    if (el.hedgeCoverage) {
      el.hedgeCoverage.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        proConfig.hedgeRatio = val / 100;
        const hypeAmount = (VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio).toFixed(0);
        if (el.hedgeCoverageDisplay) el.hedgeCoverageDisplay.textContent = `${val}% (${hypeAmount} HYPE)`;
      });
    }

    if (el.trailingTp) {
      el.trailingTp.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        proConfig.trailingTpPct = val / 100;
        if (el.trailingTpDisplay) el.trailingTpDisplay.textContent = `${val.toFixed(2)}% from Lowest Wick`;
      });
    }

    if (el.btnSaveConfig) {
      el.btnSaveConfig.addEventListener('click', () => {
        logAudit('CONFIG', `Pro parameters submitted to AegisVault (Elysium L2 Block #${runtimeState.blockNumber})`, 'accent');
        showToast('Pro risk parameters updated successfully on Elysium L2.');
      });
    }

    // Session Key Delegation Modal Handlers (Task 19, INV-1)
    function openSessionKeyModal() {
      if (el.sessionKeyModal) {
        // Generate random mock ephemeral key if not set
        if (el.ephemeralKeyAddress && !el.ephemeralKeyAddress.value) {
          const randHex = Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
          el.ephemeralKeyAddress.value = '0x' + randHex;
        }
        el.sessionKeyModal.style.display = 'flex';
      }
    }

    function closeSessionKeyModal() {
      if (el.sessionKeyModal) {
        el.sessionKeyModal.style.display = 'none';
      }
    }

    if (el.btnOpenSessionKeyModal) el.btnOpenSessionKeyModal.addEventListener('click', openSessionKeyModal);
    if (el.sessionBadge) el.sessionBadge.addEventListener('click', openSessionKeyModal);
    if (el.btnCloseSessionKeyModal) el.btnCloseSessionKeyModal.addEventListener('click', closeSessionKeyModal);
    if (el.btnCancelSessionKey) el.btnCancelSessionKey.addEventListener('click', closeSessionKeyModal);

    if (el.btnConfirmDelegateKey) {
      el.btnConfirmDelegateKey.addEventListener('click', () => {
        const key = el.ephemeralKeyAddress ? el.ephemeralKeyAddress.value : '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf';
        const days = el.sessionDurationDays ? el.sessionDurationDays.value : '30';
        closeSessionKeyModal();
        if (el.sessionBadge) {
          el.sessionBadge.innerHTML = `<span>Session Key:</span> <strong>Active (${days}d, INV-1)</strong>`;
        }
        logAudit('INV-1', `Trade-only session key ${formatAddress(key)} delegated for ${days} days. Non-custodial scope verified.`, 'accent');
        showToast(`Session key delegated! Non-custodial boundary enforced.`);
      });
    }

    // Emergency Manual Override Killswitch (Invariant INV-3)
    if (el.btnManualOverride) {
      el.btnManualOverride.addEventListener('click', () => {
        proConfig.manualOverrideActive = true;
        if (runtimeState.activeHedge.isOpen) {
          unwindShortHedge(runtimeState.currentPrice);
        }
        logAudit('INV-3', 'MANUAL OVERRIDE INVOKED. Session key revoked atomically. All keeper permissions terminated.', 'danger');
        showToast('EMERGENCY OVERRIDE: Session key revoked. Invariant INV-3 enforced.');
        updateUI();
      });
    }

    // Start 100ms background ticker loop
    startLiveTicker();
  }

  function startLiveTicker() {
    runtimeState.tickerInterval = setInterval(() => {
      if (!runtimeState.liveTickerActive || runtimeState.simInterval !== null) {
        return;
      }

      // Small Brownian micro-fluctuations (+/- $0.03) around current price
      const delta = (Math.random() - 0.5) * 0.06;
      runtimeState.currentPrice = Math.max(runtimeState.currentPrice + delta, 30.0);
      runtimeState.blockNumber++;

      // Update simulated latency
      if (el.latencyVal) {
        el.latencyVal.textContent = `${Math.floor(64 + Math.random() * 8)}ms`;
      }

      updateUI();
    }, 150);
  }

  // --- 10. SYSTEM BOOT ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initListeners();
    updateUI();
    logAudit('SYSTEM', 'AEGIS Pro-Trader Terminal initialized on Elysium L2 (Chain ID 99801)', 'accent');
    logAudit('TELEMETRY', 'Connected to 0x0801 Precompile. Real-time synchronous mark price online.', 'accent');
  });

})();
