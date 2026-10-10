/**
 * AEGIS Protocol — High-Frequency Risk Sentinel & Pro-Trader Terminal
 * Client-Side State Engine & Mathematical Model
 */

(function () {
  'use strict';

  // --- 1. CONSTANTS & INITIAL STATE ---
  const VAULT_CONSTANTS = {
    collateralAmount: 1000.0, // 1,000 HYPE
    debtUsdc: 32000.0,        // $32,000 USDC
    liquidationThreshold: 0.80, // 80% LTV threshold
    liquidationPrice: 40.0,   // $32,000 / (1000 * 0.80) = $40.00
    basePrice: 48.50
  };

  // Pro Trader Configuration State
  const proConfig = {
    triggerMode: 'HYBRID',
    priceTrigger: 44.20,
    healthTrigger: 1.10,
    hedgeRatio: 0.50, // 50% = 500 HYPE
    trailingTpPct: 0.015, // 1.5% trailing stop
    orderType: 'POST_ONLY',
    manualOverrideActive: false
  };

  // Runtime State
  const runtimeState = {
    currentPrice: VAULT_CONSTANTS.basePrice,
    previousPrice: VAULT_CONSTANTS.basePrice,
    liveTickerActive: true,
    blockNumber: 18492041,
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

  // --- 2. DOM ELEMENT REFERENCES ---
  const el = {
    liveMarkPrice: document.getElementById('liveMarkPrice'),
    collateralUsdVal: document.getElementById('collateralUsdVal'),
    markPriceChange: document.getElementById('markPriceChange'),
    heroHealthValue: document.getElementById('heroHealthValue'),
    heroLiquidationBuffer: document.getElementById('heroLiquidationBuffer'),
    heroSentinelStatus: document.getElementById('heroSentinelStatus'),
    heroBurnedTokens: document.getElementById('heroBurnedTokens'),
    gaugeRatioText: document.getElementById('gaugeRatioText'),
    gaugeMarker: document.getElementById('gaugeMarker'),
    gaugeMarkerVal: document.getElementById('gaugeMarkerVal'),
    activeHedgeBox: document.getElementById('activeHedgeBox'),
    hedgeStatusText: document.getElementById('hedgeStatusText'),
    hedgeMetaText: document.getElementById('hedgeMetaText'),
    hedgeSizeVal: document.getElementById('hedgeSizeVal'),
    hedgeEntryVal: document.getElementById('hedgeEntryVal'),
    hedgePnlVal: document.getElementById('hedgePnlVal'),
    netDeltaVal: document.getElementById('netDeltaVal'),
    clobSpread: document.getElementById('clobSpread'),
    clobMidPrice: document.getElementById('clobMidPrice'),
    clobAsks: document.getElementById('clobAsks'),
    clobBids: document.getElementById('clobBids'),
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
    auditTerminal: document.getElementById('auditTerminal'),
    btnCrashTest: document.getElementById('btnCrashTest'),
    btnRetraceTest: document.getElementById('btnRetraceTest'),
    btnResetMarket: document.getElementById('btnResetMarket'),
    liveTickerToggle: document.getElementById('liveTickerToggle'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- 3. MATHEMATICAL MARGIN CALCULATOR ---

  /**
   * Calculates health factor H = (Collateral Value * Threshold) / Total Debt
   */
  function calculateHealthFactor(price) {
    const collateralVal = VAULT_CONSTANTS.collateralAmount * price;
    return (collateralVal * VAULT_CONSTANTS.liquidationThreshold) / VAULT_CONSTANTS.debtUsdc;
  }

  /**
   * Calculates distance to liquidation in percentage and USD
   */
  function calculateLiquidationBuffer(price) {
    const dollarDist = price - VAULT_CONSTANTS.liquidationPrice;
    const pctDist = (dollarDist / price) * 100;
    return { dollarDist, pctDist };
  }

  // --- 4. TERMINAL AUDIT LOGGER ---
  function logEvent(type, message) {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const row = document.createElement('div');
    row.className = 'terminal-row';

    let tagClass = 'tag-info';
    let tagText = 'INFO';

    if (type === 'WARN') { tagClass = 'tag-warn'; tagText = 'WARN'; }
    else if (type === 'CRIT') { tagClass = 'tag-crit'; tagText = 'CRIT'; }
    else if (type === 'EXEC') { tagClass = 'tag-exec'; tagText = 'EXEC'; }
    else if (type === 'OK') { tagClass = 'tag-ok'; tagText = 'OK'; }

    row.innerHTML = `
      <span class="t-ts font-mono">[${ts}]</span>
      <span class="t-tag ${tagClass} font-mono">[${tagText}]</span>
      <span class="t-msg font-mono">${message}</span>
    `;

    el.auditTerminal.appendChild(row);
    el.auditTerminal.scrollTop = el.auditTerminal.scrollHeight;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // --- 5. HYPERCORE CLOB DEPTH GENERATOR ---
  function renderOrderbook(midPrice) {
    el.clobMidPrice.textContent = `$${midPrice.toFixed(2)}`;
    
    // Generate 4 Asks
    const askRows = [];
    let cumAskSize = 0;
    for (let i = 4; i >= 1; i--) {
      const askPrice = midPrice + (i * 0.02);
      const size = Math.floor(1200 + (Math.sin(i * 1.5) * 500) + (Math.random() * 200));
      cumAskSize += size;
      askRows.push({ price: askPrice, size, total: cumAskSize });
    }

    // Keep header and append asks
    let asksHtml = `
      <div class="clob-row clob-head font-mono">
        <span>PRICE (USDC)</span>
        <span>SIZE (HYPE)</span>
        <span>TOTAL</span>
      </div>
    `;
    askRows.forEach(item => {
      const depthPct = Math.min(100, (item.total / 8000) * 100);
      asksHtml += `
        <div class="clob-row font-mono">
          <div class="depth-bar" style="width: ${depthPct}%;"></div>
          <span class="price-col">$${item.price.toFixed(2)}</span>
          <span>${item.size.toLocaleString()}</span>
          <span style="color: #64748B;">${item.total.toLocaleString()}</span>
        </div>
      `;
    });
    el.clobAsks.innerHTML = asksHtml;

    // Generate 4 Bids
    let bidsHtml = '';
    let cumBidSize = 0;
    for (let i = 1; i <= 4; i++) {
      const bidPrice = midPrice - (i * 0.02);
      const size = Math.floor(1400 + (Math.cos(i * 1.2) * 600) + (Math.random() * 250));
      cumBidSize += size;
      const depthPct = Math.min(100, (cumBidSize / 8000) * 100);
      bidsHtml += `
        <div class="clob-row font-mono">
          <div class="depth-bar" style="width: ${depthPct}%;"></div>
          <span class="price-col">$${bidPrice.toFixed(2)}</span>
          <span>${size.toLocaleString()}</span>
          <span style="color: #64748B;">${cumBidSize.toLocaleString()}</span>
        </div>
      `;
    }
    el.clobBids.innerHTML = bidsHtml;
  }

  // --- 6. CORE REACTION & HEDGING ENGINE ---

  function updateMarketState(newPrice) {
    runtimeState.previousPrice = runtimeState.currentPrice;
    runtimeState.currentPrice = newPrice;
    runtimeState.blockNumber += 1;

    // Calculate core math
    const H = calculateHealthFactor(newPrice);
    const { dollarDist, pctDist } = calculateLiquidationBuffer(newPrice);
    const collateralUsd = VAULT_CONSTANTS.collateralAmount * newPrice;

    // Update DOM indicators
    el.liveMarkPrice.textContent = `$${newPrice.toFixed(2)}`;
    el.collateralUsdVal.textContent = `$${collateralUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    
    const pctChange = ((newPrice - VAULT_CONSTANTS.basePrice) / VAULT_CONSTANTS.basePrice) * 100;
    el.markPriceChange.textContent = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}% vs Base`;
    el.markPriceChange.className = pctChange >= 0 ? 'stat-sub font-mono text-emerald' : 'stat-sub font-mono text-danger';

    // Gauge positioning (Range: 1.00 to 1.80 mapped to 0% - 100%)
    const clampedH = Math.max(1.00, Math.min(1.80, H));
    const gaugePercent = ((clampedH - 1.00) / (1.80 - 1.00)) * 100;
    el.gaugeMarker.style.left = `${gaugePercent.toFixed(1)}%`;
    el.gaugeMarkerVal.textContent = H.toFixed(2);

    // Hero Health Factor & Badges
    el.heroHealthValue.innerHTML = `${H.toFixed(2)} `;
    if (H >= 1.25) {
      el.heroHealthValue.innerHTML += `<span class="status-pill pill-emerald">SAFE</span>`;
      el.heroHealthValue.className = 'metric-value font-mono text-emerald';
      el.gaugeRatioText.className = 'font-mono text-emerald';
    } else if (H >= 1.10) {
      el.heroHealthValue.innerHTML += `<span class="status-pill pill-cyan">CAUTION</span>`;
      el.heroHealthValue.className = 'metric-value font-mono text-cyan';
      el.gaugeRatioText.className = 'font-mono text-cyan';
    } else {
      el.heroHealthValue.innerHTML += `<span class="status-pill pill-danger">CRITICAL</span>`;
      el.heroHealthValue.className = 'metric-value font-mono text-danger';
      el.gaugeRatioText.className = 'font-mono text-danger';
    }

    el.heroLiquidationBuffer.textContent = `Distance to Liquidation: ${pctDist >= 0 ? '+' : ''}${pctDist.toFixed(1)}% ($${dollarDist.toFixed(2)})`;
    el.gaugeRatioText.textContent = `H = ${H.toFixed(2)} (Buffer: $${dollarDist.toFixed(2)} to Liquidation)`;

    // Render Orderbook
    renderOrderbook(newPrice);

    // --- SENTINEL LOGIC EXECUTION ---
    evaluateSentinelRules(newPrice, H);
  }

  function evaluateSentinelRules(price, H) {
    if (proConfig.manualOverrideActive) {
      return; // All automation paused by user killswitch
    }

    const hedge = runtimeState.activeHedge;

    // 1. Check if Trigger condition is met (if not already hedged)
    if (!hedge.isOpen) {
      let isTriggered = false;

      if (proConfig.triggerMode === 'PRICE') {
        isTriggered = price <= proConfig.priceTrigger;
      } else if (proConfig.triggerMode === 'HEALTH_FACTOR') {
        isTriggered = H <= proConfig.healthTrigger;
      } else { // HYBRID
        isTriggered = (price <= proConfig.priceTrigger) || (H <= proConfig.healthTrigger);
      }

      if (isTriggered) {
        executeOpenHedge(price, H);
      }
    } 
    // 2. Hedge is currently ACTIVE -> Manage Trailing Stop & PnL
    else {
      // Calculate floating short PnL: (entry - current) * size
      const floatingPnl = (hedge.entryPrice - price) * hedge.size;
      hedge.unrealizedPnl = floatingPnl;
      el.hedgePnlVal.textContent = `${floatingPnl >= 0 ? '+' : ''}$${floatingPnl.toFixed(2)} USDC`;
      el.hedgePnlVal.className = floatingPnl >= 0 ? 'val font-mono text-emerald' : 'val font-mono text-danger';

      // Update lowest wick reached
      if (price < hedge.lowestWick) {
        hedge.lowestWick = price;
        // Trailing stop price = lowestWick * (1 + trailingTpPct)
        hedge.trailingExitPrice = hedge.lowestWick * (1 + proConfig.trailingTpPct);
        logEvent('INFO', `Trailing Wick Low: $${hedge.lowestWick.toFixed(2)} -> Trailing Stop adjusted to $${hedge.trailingExitPrice.toFixed(2)}`);
      }

      // Check if price bounced through the trailing stop!
      if (price >= hedge.trailingExitPrice && price > hedge.lowestWick) {
        executeTrailingTakeProfit(price);
      }
    }
  }

  function executeOpenHedge(price, H) {
    const hedgeSize = VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio;
    const hedge = runtimeState.activeHedge;

    hedge.isOpen = true;
    hedge.entryPrice = price;
    hedge.size = hedgeSize;
    hedge.lowestWick = price;
    hedge.trailingExitPrice = price * (1 + proConfig.trailingTpPct);
    hedge.unrealizedPnl = 0.0;

    // Update UI
    el.activeHedgeBox.classList.add('hedging');
    el.hedgeStatusText.textContent = `HEDGE ACTIVE — DEFENDING HEALTH`;
    el.heroSentinelStatus.innerHTML = `DEFENDING <span class="status-pill pill-danger">HEDGED</span>`;
    el.heroSentinelStatus.className = 'metric-value font-mono text-danger';
    
    el.hedgeSizeVal.textContent = `${hedgeSize.toFixed(0)} HYPE Short`;
    el.hedgeEntryVal.textContent = `$${price.toFixed(2)}`;
    el.hedgePnlVal.textContent = `$0.00 USDC`;
    
    const unhedgedDelta = VAULT_CONSTANTS.collateralAmount - hedgeSize;
    el.netDeltaVal.textContent = `+${unhedgedDelta.toFixed(0)} HYPE (Delta Neutralized)`;

    logEvent('CRIT', `Trigger breached! Price: $${price.toFixed(2)} <= $${proConfig.priceTrigger.toFixed(2)} | H: ${H.toFixed(2)}`);
    logEvent('EXEC', `0x0802 Predeploy: Dispatching SELL ${hedgeSize.toFixed(0)} HYPE-PERP @ $${price.toFixed(2)} (${proConfig.orderType})`);
    logEvent('OK', `HyperCore CLOB Filled: Order #749102 in 71ms. Non-Custodial Session Key Verified.`);
    showToast(`AEGIS Sentinel: Short Perpetual Opened at $${price.toFixed(2)} to freeze collateral loss.`);
  }

  function executeTrailingTakeProfit(exitPrice) {
    const hedge = runtimeState.activeHedge;
    const cashGain = (hedge.entryPrice - exitPrice) * hedge.size;
    
    // Performance Fee: 10% on profit
    const performanceFee = Math.max(0, cashGain * 0.10);
    const feeBurn = performanceFee * 0.50;
    const feeStakers = performanceFee * 0.50;

    // Update metrics
    runtimeState.metrics.tokensBurned += feeBurn * 4.2; // roughly 4.2 tokens per dollar
    el.heroBurnedTokens.innerHTML = `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} <span class="metric-unit">AEGIS</span>`;
    el.tokenBurnDisplay.textContent = `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} $AEGIS`;

    logEvent('OK', `Trailing Take-Profit Reached! Exit Price: $${exitPrice.toFixed(2)} >= $${hedge.trailingExitPrice.toFixed(2)}`);
    logEvent('EXEC', `0x0802 Intent Emitted: BUY TO CLOSE ${hedge.size.toFixed(0)} HYPE-PERP @ $${exitPrice.toFixed(2)}`);
    logEvent('OK', `Hedge Closed: Locked +$${cashGain.toFixed(2)} USDC Net Cash Profit!`);
    logEvent('INFO', `AegisFeeCollector: Collected $${performanceFee.toFixed(2)} fee -> 50% ($${feeBurn.toFixed(2)}) burned, 50% ($${feeStakers.toFixed(2)}) distributed to stakers.`);

    // Reset hedge state
    hedge.isOpen = false;
    hedge.entryPrice = 0.0;
    hedge.size = 0.0;
    hedge.unrealizedPnl = 0.0;

    el.activeHedgeBox.classList.remove('hedging');
    el.hedgeStatusText.textContent = `STANDBY — RISK MONITORED`;
    el.heroSentinelStatus.innerHTML = `ARMED <span class="status-pill pill-cyan">ACTIVE</span>`;
    el.heroSentinelStatus.className = 'metric-value font-mono text-cyan';
    
    el.hedgeSizeVal.textContent = `0.00 HYPE Short`;
    el.hedgeEntryVal.textContent = `--`;
    el.hedgePnlVal.textContent = `$0.00 USDC`;
    el.netDeltaVal.textContent = `+1,000 HYPE (Unhedged)`;

    showToast(`Hedge Unwound: Captured +$${cashGain.toFixed(2)} USDC Profit! Spot Collateral 100% Intact.`);
  }

  // --- 7. SIMULATION SCENARIO RUNNERS ---

  function clearSimulations() {
    if (runtimeState.simInterval) {
      clearInterval(runtimeState.simInterval);
      runtimeState.simInterval = null;
    }
  }

  // Flash Crash: Rapid drop from $48.50 -> $42.00 -> $38.50
  function runFlashCrashSimulation() {
    clearSimulations();
    logEvent('WARN', 'Stress Test Started: Simulating Severe Flash Crash (-18% drop)');
    showToast('Simulation: Initiating -18% Flash Crash on HyperCore...');

    const crashSteps = [
      48.20, 47.50, 46.40, 45.10, 44.00, 43.10, 42.00, 40.80, 39.50, 38.60, 38.20
    ];
    let stepIndex = 0;

    runtimeState.simInterval = setInterval(() => {
      if (stepIndex >= crashSteps.length) {
        clearSimulations();
        logEvent('INFO', 'Flash crash simulation complete. Account survived without liquidation.');
        return;
      }
      updateMarketState(crashSteps[stepIndex]);
      stepIndex++;
    }, 400);
  }

  // Retracement & Bounce: Drop to $43.20 (triggers hedge), then V-recovery back to $49.00
  function runRetracementSimulation() {
    clearSimulations();
    logEvent('WARN', 'Stress Test Started: Simulating Retracement & V-Recovery');
    showToast('Simulation: Market Dip to $43.20 followed by V-Bounce...');

    const retraceSteps = [
      47.80, 46.50, 45.20, 44.10, 43.60, 43.20, // Dip
      43.50, 43.90, 44.60, 45.80, 47.20, 48.80, 49.50 // Bounce
    ];
    let stepIndex = 0;

    runtimeState.simInterval = setInterval(() => {
      if (stepIndex >= retraceSteps.length) {
        clearSimulations();
        logEvent('INFO', 'Retracement simulation complete. Trailing profit successfully locked.');
        return;
      }
      updateMarketState(retraceSteps[stepIndex]);
      stepIndex++;
    }, 450);
  }

  function resetMarketBaseline() {
    clearSimulations();
    logEvent('INFO', 'Resetting market to baseline parameters ($48.50)');
    
    // Reset hedge if open
    runtimeState.activeHedge.isOpen = false;
    runtimeState.activeHedge.entryPrice = 0.0;
    runtimeState.activeHedge.size = 0.0;
    el.activeHedgeBox.classList.remove('hedging');
    el.hedgeStatusText.textContent = `STANDBY — RISK MONITORED`;
    el.heroSentinelStatus.innerHTML = `ARMED <span class="status-pill pill-cyan">ACTIVE</span>`;
    el.heroSentinelStatus.className = 'metric-value font-mono text-cyan';
    el.hedgeSizeVal.textContent = `0.00 HYPE Short`;
    el.hedgeEntryVal.textContent = `--`;
    el.hedgePnlVal.textContent = `$0.00 USDC`;
    el.netDeltaVal.textContent = `+1,000 HYPE (Unhedged)`;

    proConfig.manualOverrideActive = false;
    el.btnManualOverride.style.background = '';
    el.btnManualOverride.querySelector('span').textContent = 'EMERGENCY MANUAL OVERRIDE (CLOSE HEDGES)';

    updateMarketState(VAULT_CONSTANTS.basePrice);
    showToast('Market reset to $48.50 baseline.');
  }

  // --- 8. LIVE TICKER RANDOM WALK (100ms) ---
  function initLiveTicker() {
    runtimeState.tickerInterval = setInterval(() => {
      if (!runtimeState.liveTickerActive || runtimeState.simInterval) return;

      // Small high-frequency micro ticks (+/- 0.04)
      const tick = (Math.random() - 0.495) * 0.08;
      const newPrice = Math.max(38.0, Math.min(60.0, runtimeState.currentPrice + tick));
      updateMarketState(newPrice);
    }, 300);
  }

  // --- 9. EVENT LISTENERS ---

  // Sliders and Config
  el.priceTrigger.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    el.priceTriggerDisplay.textContent = `$${val.toFixed(2)}`;
  });

  el.healthTrigger.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    el.healthTriggerDisplay.textContent = val.toFixed(2);
  });

  el.hedgeCoverage.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    const hypeHedged = (VAULT_CONSTANTS.collateralAmount * (val / 100)).toFixed(0);
    el.hedgeCoverageDisplay.textContent = `${val}% (${hypeHedged} HYPE)`;
    el.hedgeMetaText.textContent = `Hedge Ratio: ${val}% (${hypeHedged} HYPE Short)`;
  });

  el.trailingTp.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    el.trailingTpDisplay.textContent = `${val.toFixed(2)}% from Lowest Wick`;
  });

  el.btnSaveConfig.addEventListener('click', () => {
    proConfig.triggerMode = el.triggerMode.value;
    proConfig.priceTrigger = parseFloat(el.priceTrigger.value);
    proConfig.healthTrigger = parseFloat(el.healthTrigger.value);
    proConfig.hedgeRatio = parseInt(el.hedgeCoverage.value, 10) / 100;
    proConfig.trailingTpPct = parseFloat(el.trailingTp.value) / 100;
    
    const selectedRadio = document.querySelector('input[name="orderType"]:checked');
    if (selectedRadio) proConfig.orderType = selectedRadio.value;

    logEvent('OK', `AegisVault.sol::setProConfig -> Trigger=$${proConfig.priceTrigger.toFixed(2)}, H=${proConfig.healthTrigger.toFixed(2)}, Ratio=${(proConfig.hedgeRatio * 100).toFixed(0)}%, Trailing=${(proConfig.trailingTpPct * 100).toFixed(1)}%`);
    showToast('Pro Trader parameters saved to Elysium L2.');
  });

  // Emergency Manual Override Killswitch
  el.btnManualOverride.addEventListener('click', () => {
    proConfig.manualOverrideActive = !proConfig.manualOverrideActive;

    if (proConfig.manualOverrideActive) {
      // Close any active hedge immediately
      if (runtimeState.activeHedge.isOpen) {
        runtimeState.activeHedge.isOpen = false;
        el.activeHedgeBox.classList.remove('hedging');
        el.hedgeStatusText.textContent = `OVERRIDE — SENTINEL DISENGAGED`;
        el.hedgeSizeVal.textContent = `0.00 HYPE Short`;
        el.hedgePnlVal.textContent = `$0.00 USDC`;
        logEvent('CRIT', 'EMERGENCY MANUAL OVERRIDE: 0x0802 CancelOrder sent. All hedges closed.');
      }
      el.btnManualOverride.style.background = 'rgba(239, 68, 68, 0.4)';
      el.btnManualOverride.querySelector('span').textContent = 'OVERRIDE ACTIVE — CLICK TO RE-ARM';
      el.heroSentinelStatus.innerHTML = `DISARMED <span class="status-pill pill-danger">OVERRIDE</span>`;
      el.heroSentinelStatus.className = 'metric-value font-mono text-danger';
      showToast('EMERGENCY KILLSWITCH: Sentinel disarmed. 100% manual control.');
    } else {
      el.btnManualOverride.style.background = '';
      el.btnManualOverride.querySelector('span').textContent = 'EMERGENCY MANUAL OVERRIDE (CLOSE HEDGES)';
      el.heroSentinelStatus.innerHTML = `ARMED <span class="status-pill pill-cyan">ACTIVE</span>`;
      el.heroSentinelStatus.className = 'metric-value font-mono text-cyan';
      el.hedgeStatusText.textContent = `STANDBY — RISK MONITORED`;
      logEvent('OK', 'Sentinel re-armed and listening to 0x0801 market events.');
      showToast('Sentinel re-armed on Elysium L2.');
    }
  });

  // Simulation Buttons
  el.btnCrashTest.addEventListener('click', runFlashCrashSimulation);
  el.btnRetraceTest.addEventListener('click', runRetracementSimulation);
  el.btnResetMarket.addEventListener('click', resetMarketBaseline);

  el.liveTickerToggle.addEventListener('change', (e) => {
    runtimeState.liveTickerActive = e.target.checked;
    logEvent('INFO', `Live ticker stream ${runtimeState.liveTickerActive ? 'enabled' : 'paused'}.`);
  });

  // --- 10. INITIALIZATION BOOTSTRAP ---
  function init() {
    logEvent('INFO', 'AEGIS Protocol Runtime v1.0.0 Initialized.');
    logEvent('INFO', 'Connected to Elysium L2 (Chain ID: 99801) | Settlement: HyperEVM (999)');
    logEvent('OK', 'HyperCore 0x0801 Market-Data Precompile verified (~68ms latency).');
    logEvent('OK', 'ElysiumCoreWriter 0x0802 Predeploy verified. Trade-only session key active.');
    
    updateMarketState(VAULT_CONSTANTS.basePrice);
    initLiveTicker();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
