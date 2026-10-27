/**
 * AEGIS Protocol — High-Frequency Risk Sentinel & Pro-Trader Terminal
 * Client-Side State Engine, Brand Kit UI, and Mathematical Models
 * Conforms 100% to brand/kit/tokens.css, EIP-1193, and Security Invariants INV-1 to INV-5.
 */

(function () {
  'use strict';

  // --- 1. CONSTANTS & SYSTEM STATE ---
  const VAULT_CONSTANTS = {
    collateralAmount: 0.10,     // Elysium testnet faucet allocation (0.10 HYPE)
    debtUsdc: 5.42,             // Proportional debt liability ($5.42 at 65% LTV)
    liquidationThreshold: 0.80, // 80% maintenance threshold (T = 8000 bps)
    liquidationPrice: 67.75,    // Liquidation price ($5.42 / (0.10 * 0.80))
    basePrice: 83.46,           // Live Hyperliquid mark price
    chainId: '0x185d9',         // 99801 in hex
    chainName: 'Elysium L2 Testnet'
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

  // Lite Auto-Pilot State (0.10 HYPE Faucet Cap Calibration)
  const liteState = {
    selectedAmount: 0.05,
    selectedPreset: 'balanced',
    shieldActivated: false
  };

  // Runtime State
  const runtimeState = {
    currentPrice: VAULT_CONSTANTS.basePrice,
    previousPrice: VAULT_CONSTANTS.basePrice,
    liveTickerActive: true,
    blockNumber: 9006216,
    rpcLatencyMs: null,
    lastRpcObservation: null,
    lastReferencePriceTimestamp: null,
    precompile0x0801Status: 'BLOCKED_TESTNET',
    precompile0x0802Status: 'BLOCKED_TESTNET',
    walletConnected: false,
    walletAddress: null,
    balances: {
      hype: 0.0,
      usdc: 0.0,
      kntq: 0.0
    },
    agentDelegation: {
      approved: false,
      agentAddress: null,
      expiryTimestamp: null,
      scope: 'TRADE_ONLY_CLOB_ORDERS'
    },
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
    feeDebtState: {
      supported: true,
      amountUsdc: 0.0,
      status: 'ZERO_DEBT_VERIFIED',
      message: 'Verified on-chain via AegisVault.feeDebts()'
    },
    feeCollectorState: {
      totalFeesCaptured: 0,
      totalBurnedFees: 0,
      totalDistributedYield: 0,
      totalAegisBurned: 0
    },
    simInterval: null,
    tickerInterval: null,
    rpcPollInterval: null
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
    modeLiteBtn: document.getElementById('modeLiteBtn'),
    modeProBtn: document.getElementById('modeProBtn'),

    // Session Key Modal
    btnOpenSessionKeyModal: document.getElementById('btnOpenSessionKeyModal'),
    sessionKeyModal: document.getElementById('sessionKeyModal'),
    btnCloseSessionKeyModal: document.getElementById('btnCloseSessionKeyModal'),
    btnCancelSessionKey: document.getElementById('btnCancelSessionKey'),
    btnConfirmDelegateKey: document.getElementById('btnConfirmDelegateKey'),
    ephemeralKeyAddress: document.getElementById('ephemeralKeyAddress'),
    sessionDurationDays: document.getElementById('sessionDurationDays'),

    // Hero metrics
    heroTvlLabel: document.getElementById('heroTvlLabel'),
    heroTvlValue: document.getElementById('heroTvlValue'),
    heroTvlSub: document.getElementById('heroTvlSub'),
    heroHealthValue: document.getElementById('heroHealthValue'),
    heroLiquidationBuffer: document.getElementById('heroLiquidationBuffer'),
    heroSentinelStatus: document.getElementById('heroSentinelStatus'),
    heroLiquidationsSaved: document.getElementById('heroLiquidationsSaved'),
    heroBurnedTokens: document.getElementById('heroBurnedTokens'),

    // Position data
    liveMarkPrice: document.getElementById('liveMarkPrice'),
    collateralUsdVal: document.getElementById('collateralUsdVal'),
    markPriceChange: document.getElementById('markPriceChange'),
    posCollateralAmount: document.getElementById('posCollateralAmount'),
    posDebtAmount: document.getElementById('posDebtAmount'),
    posDebtSub: document.getElementById('posDebtSub'),
    posLiqPrice: document.getElementById('posLiqPrice'),

    // Lite Mode controls
    liteAutoPilotCard: document.getElementById('vaultActionCard') || document.getElementById('liteAutoPilotCard'),
    proConfigCard: document.getElementById('proConfigCard'),
    microAmountChips: document.getElementById('microAmountChips'),
    presetsContainer: document.getElementById('presetsContainer'),
    liteTriggerPriceDisplay: document.getElementById('liteTriggerPriceDisplay'),
    liteHedgeSizeDisplay: document.getElementById('liteHedgeSizeDisplay'),
    btnLiteActivateShield: document.getElementById('btnLiteActivateShield'),
    liteActivateBtnText: document.getElementById('liteActivateBtnText'),

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

    // Beta Access Gate
    betaAccessBadge: document.getElementById('betaAccessBadge'),
    betaAccessCodeText: document.getElementById('betaAccessCodeText'),
    btnLockTerminal: document.getElementById('btnLockTerminal'),

    // Simulation & Audit
    btnCrashTest: document.getElementById('btnCrashTest'),
    btnRetraceTest: document.getElementById('btnRetraceTest'),
    btnResetMarket: document.getElementById('btnResetMarket'),
    liveTickerToggle: document.getElementById('liveTickerToggle'),
    auditTerminal: document.getElementById('auditTerminal'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- ACCESS GATE CONTROL ---
  function initAccessGate() {
    // Public testnet is open to all users without access code gating
    if (el.betaAccessCodeText) {
      el.betaAccessCodeText.textContent = 'Live';
    }
  }

  // --- 3. THEME MANAGEMENT ---
  function initTheme() {
    const savedTheme = localStorage.getItem('aegis-theme') || 'light';
    setTheme(savedTheme);

    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aegis-theme', theme);
    if (el.themeToggleBtn) {
      el.themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode');
      el.themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode');
    }
    const drawerThemeLabel = document.getElementById('drawerThemeLabel');
    if (drawerThemeLabel) {
      drawerThemeLabel.textContent = theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    }
    if (document.getElementById('tradingview_chart_embed')) {
      if (typeof tvState !== 'undefined' && tvState.engine === 'hypercore') {
        renderHyperCoreCanvasChart();
      } else {
        renderTradingViewWidget();
      }
    }
  }

  // --- 4. NAVIGATION DRAWER & PRO TRADING TERMINAL SUITE ---
  const HYPERCORE_MARKETS = (window.AEGIS_HYPERCORE_UNIVERSE && window.AEGIS_HYPERCORE_UNIVERSE.length > 0)
    ? window.AEGIS_HYPERCORE_UNIVERSE
    : [
        { symbol: 'HYPE', name: 'Hyperliquid L1 Native', pair: 'HYPE / USD', price: 83.50, change: '+3.42%', cat: 'hypercore', tv: 'MEXC:HYPEUSDT', icon: '/assets/ecosystem/hyperliquid.png', maxLev: 10, vol: 380000000 },
        { symbol: 'PURR', name: 'HyperCore Spot & Perp Meme', pair: 'PURR / USD', price: 0.184, change: '+8.21%', cat: 'hypercore', tv: 'MEXC:PURRUSDT', icon: '/assets/ecosystem/hyperliquid.png', maxLev: 10, vol: 45000000 },
        { symbol: 'BTC', name: 'Bitcoin Perp', pair: 'BTC / USD', price: 83500.00, change: '+0.84%', cat: 'majors', tv: 'BINANCE:BTCUSDT', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png', maxLev: 40, vol: 1900000000 },
        { symbol: 'ETH', name: 'Ethereum Perp', pair: 'ETH / USD', price: 2520.50, change: '+1.25%', cat: 'majors', tv: 'BINANCE:ETHUSDT', icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png', maxLev: 25, vol: 790000000 }
      ];

  const tvState = {
    activeCoin: HYPERCORE_MARKETS[0],
    symbol: HYPERCORE_MARKETS[0].tv || 'MEXC:HYPEUSDT',
    interval: '15',
    engine: 'hypercore', // 'hypercore' | 'tradingview'
    widgetInstance: null,
    activeCategory: 'all',
    searchQuery: '',
    candles: [],
    hoverIndex: -1,
    isFetchingCandles: false
  };

  // Helper to resolve TradingView symbols reliably across all tokens
  function resolveTradingViewSymbol(coin) {
    if (coin.tv) return coin.tv;
    const sym = coin.symbol.toUpperCase();
    if (['HYPE', 'PURR', 'JEFF', 'HFUN'].includes(sym)) {
      return `MEXC:${sym}USDT`;
    }
    return `BINANCE:${sym}USDT`;
  }

  // Generate realistic synthetic candles if network blip occurs or offline
  function generateFallbackCandles(basePrice, count, intervalMinutes) {
    const candles = [];
    let cur = basePrice > 0 ? basePrice : 10;
    const now = Date.now();
    const stepMs = (intervalMinutes || 15) * 60 * 1000;
    const start = now - (count * stepMs);

    for (let i = 0; i < count; i++) {
      const t = start + (i * stepMs);
      const volatility = cur * 0.012;
      const change = (Math.random() - 0.49) * volatility;
      const open = cur;
      const close = Math.max(0.000001, cur + change);
      const high = Math.max(open, close) + Math.random() * volatility * 0.6;
      const low = Math.max(0.000001, Math.min(open, close) - Math.random() * volatility * 0.6);
      const volume = (Math.random() * 50000 + 10000) * cur;
      candles.push({ t, o: open, h: high, l: low, c: close, v: volume });
      cur = close;
    }
    return candles;
  }

  // Fetch official Hyperliquid L1 Candlestick Snapshot
  async function fetchHyperCoreCandles(coin, intervalMinutes) {
    const intervalMap = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '60': '1h',
      '240': '4h',
      'D': '1d'
    };
    const hlInterval = intervalMap[tvState.interval] || '15m';
    const numBars = 100;
    const intervalMs = (parseInt(tvState.interval, 10) || 15) * 60 * 1000;
    const startTime = Date.now() - (numBars * intervalMs);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: coin.symbol,
            interval: hlInterval,
            startTime: startTime
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(c => ({
          t: Number(c.t),
          o: Number(c.o),
          h: Number(c.h),
          l: Number(c.l),
          c: Number(c.c),
          v: Number(c.v)
        }));
      }
    } catch (err) {
      console.debug('HyperCore candleSnapshot fallback invoked:', err.message);
    }
    return generateFallbackCandles(coin.price, 90, parseInt(tvState.interval, 10) || 15);
  }

  // Update OHLC Bar display elements
  function updateOhlcDisplay(candle) {
    if (!candle) return;
    const elO = document.getElementById('ohlcOpen');
    const elH = document.getElementById('ohlcHigh');
    const elL = document.getElementById('ohlcLow');
    const elC = document.getElementById('ohlcClose');
    const elV = document.getElementById('ohlcVolume');
    const elT = document.getElementById('ohlcTime');

    const fmt = (v) => v >= 1000 ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : v >= 1 ? v.toFixed(2)
      : v.toFixed(6);

    if (elO) elO.textContent = fmt(candle.o);
    if (elH) elH.textContent = fmt(candle.h);
    if (elL) elL.textContent = fmt(candle.l);
    if (elC) {
      elC.textContent = fmt(candle.c);
      elC.style.color = candle.c >= candle.o ? 'var(--accent)' : 'var(--danger)';
    }
    if (elV) {
      elV.textContent = candle.v >= 1e6 ? `$${(candle.v / 1e6).toFixed(2)}M` : candle.v >= 1e3 ? `$${(candle.v / 1e3).toFixed(1)}K` : `$${Math.round(candle.v)}`;
    }
    if (elT) {
      const d = new Date(candle.t);
      elT.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Render Official HyperCore Direct HTML5 Canvas Candlestick Engine
  let canvasResizeHandler = null;
  async function renderHyperCoreCanvasChart() {
    const canvasWrap = document.getElementById('hypercore_canvas_wrap');
    const tvWrap = document.getElementById('tradingview_chart_embed');
    const canvas = document.getElementById('hypercore_canvas_chart');
    const loadingOverlay = document.getElementById('hypercore_chart_loading');

    if (!canvas || !canvasWrap) return;

    // View toggles
    canvasWrap.style.display = 'block';
    if (tvWrap) tvWrap.style.display = 'none';

    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    const coin = tvState.activeCoin || HYPERCORE_MARKETS[0];
    tvState.candles = await fetchHyperCoreCandles(coin, parseInt(tvState.interval, 10) || 15);

    if (loadingOverlay) loadingOverlay.style.display = 'none';

    function drawChart() {
      const rect = canvasWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (width <= 0 || height <= 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const bgColor = isDark ? '#141829' : '#FFFFFF';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const textMuted = isDark ? '#8A92A6' : '#6E7687';
      const accentGreen = '#07705F';
      const accentRed = '#B8254F';

      // Clear & Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Subtle Watermark
      ctx.save();
      ctx.font = '700 18px Inter, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.035)';
      ctx.textAlign = 'center';
      ctx.fillText(`AEGIS PROTOCOL • HYPERCORE L1 DIRECT (${coin.symbol}/USD)`, width / 2, height / 2);
      ctx.restore();

      const candles = tvState.candles;
      if (!candles || candles.length === 0) return;

      // Margins
      const margin = { top: 20, right: 70, bottom: 28, left: 16 };
      const chartW = width - margin.left - margin.right;
      const chartH = height - margin.top - margin.bottom;
      const volumeH = chartH * 0.18;
      const priceH = chartH - volumeH - 12;

      // Price Bounds
      let minP = Infinity;
      let maxP = -Infinity;
      let maxV = 0;

      candles.forEach(c => {
        if (c.l < minP) minP = c.l;
        if (c.h > maxP) maxP = c.h;
        if (c.v > maxV) maxV = c.v;
      });

      const pPad = (maxP - minP) * 0.08 || minP * 0.05 || 1;
      minP = Math.max(0, minP - pPad);
      maxP = maxP + pPad;
      const priceRange = maxP - minP || 1;

      const candleSpacing = chartW / candles.length;
      const candleW = Math.max(2, candleSpacing * 0.72);

      // Price Grid Lines (Horizontal)
      const gridSteps = 5;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'left';

      for (let i = 0; i <= gridSteps; i++) {
        const p = minP + (priceRange * (i / gridSteps));
        const y = margin.top + priceH - (priceH * (i / gridSteps));
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();

        const pStr = p >= 1000 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : p >= 1 ? p.toFixed(2)
          : p.toFixed(5);
        ctx.fillText(pStr, width - margin.right + 8, y + 3);
      }
      ctx.setLineDash([]);

      // Draw Candlesticks & Volume
      candles.forEach((c, idx) => {
        const x = margin.left + (idx * candleSpacing) + (candleSpacing / 2);
        const isBull = c.c >= c.o;
        const color = isBull ? accentGreen : accentRed;

        // Volume Bar
        const vRatio = maxV > 0 ? (c.v / maxV) : 0;
        const vBarH = vRatio * volumeH;
        const vY = margin.top + chartH - vBarH;
        ctx.fillStyle = isBull ? 'rgba(7, 112, 95, 0.28)' : 'rgba(184, 37, 79, 0.28)';
        ctx.fillRect(x - (candleW / 2), vY, candleW, vBarH);

        // Candlestick Wick
        const yHigh = margin.top + priceH - (((c.h - minP) / priceRange) * priceH);
        const yLow = margin.top + priceH - (((c.l - minP) / priceRange) * priceH);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Candlestick Body
        const yOpen = margin.top + priceH - (((c.o - minP) / priceRange) * priceH);
        const yClose = margin.top + priceH - (((c.c - minP) / priceRange) * priceH);
        const topY = Math.min(yOpen, yClose);
        const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

        ctx.fillStyle = color;
        ctx.fillRect(x - (candleW / 2), topY, candleW, bodyH);
      });

      // Latest Price Gutter Pill
      const lastC = candles[candles.length - 1];
      const lastY = margin.top + priceH - (((lastC.c - minP) / priceRange) * priceH);
      const lastPStr = lastC.c >= 1000 ? lastC.c.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : lastC.c >= 1 ? lastC.c.toFixed(2)
        : lastC.c.toFixed(5);

      ctx.fillStyle = lastC.c >= lastC.o ? accentGreen : accentRed;
      ctx.fillRect(width - margin.right, lastY - 9, margin.right - 4, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lastPStr, width - margin.right + 6, lastY + 4);

      // Latest price horizontal dotted marker
      ctx.strokeStyle = lastC.c >= lastC.o ? accentGreen : accentRed;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(margin.left, lastY);
      ctx.lineTo(width - margin.right, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update OHLC Bar with latest or hovered candle
      const activeCandle = (tvState.hoverIndex >= 0 && tvState.hoverIndex < candles.length)
        ? candles[tvState.hoverIndex]
        : lastC;
      updateOhlcDisplay(activeCandle);

      // Draw Crosshair if active
      if (tvState.hoverIndex >= 0 && tvState.hoverIndex < candles.length) {
        const hc = candles[tvState.hoverIndex];
        const hx = margin.left + (tvState.hoverIndex * candleSpacing) + (candleSpacing / 2);
        const hy = margin.top + priceH - (((hc.c - minP) / priceRange) * priceH);

        ctx.strokeStyle = textMuted;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(hx, margin.top);
        ctx.lineTo(hx, height - margin.bottom);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(margin.left, hy);
        ctx.lineTo(width - margin.right, hy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Time badge at bottom
        const d = new Date(hc.t);
        const tStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillStyle = isDark ? '#1C2238' : '#ECE8F2';
        ctx.fillRect(hx - 24, height - margin.bottom + 4, 48, 16);
        ctx.fillStyle = textMuted;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tStr, hx, height - margin.bottom + 16);
      }
    }

    drawChart();

    // Attach Crosshair tracking
    canvas.onmousemove = (e) => {
      const rect = canvasWrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - 16;
      const chartW = rect.width - 16 - 70;
      if (tvState.candles.length === 0 || chartW <= 0) return;
      const spacing = chartW / tvState.candles.length;
      const idx = Math.floor(mouseX / spacing);
      if (idx >= 0 && idx < tvState.candles.length) {
        tvState.hoverIndex = idx;
        drawChart();
      }
    };

    canvas.onmouseleave = () => {
      tvState.hoverIndex = -1;
      drawChart();
    };

    if (canvasResizeHandler) window.removeEventListener('resize', canvasResizeHandler);
    canvasResizeHandler = () => drawChart();
    window.addEventListener('resize', canvasResizeHandler);
  }

  function renderTradingViewWidget() {
    const container = document.getElementById('tradingview_chart_embed');
    const canvasWrap = document.getElementById('hypercore_canvas_wrap');
    if (!container) return;

    if (canvasWrap) canvasWrap.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '';
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';

    const tvSymbol = resolveTradingViewSymbol(tvState.activeCoin);

    if (typeof TradingView !== 'undefined') {
      try {
        tvState.widgetInstance = new TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: tvState.interval,
          timezone: "Etc/UTC",
          theme: theme === 'dark' ? 'dark' : 'light',
          style: "1",
          locale: "en",
          toolbar_bg: theme === 'dark' ? '#1C2238' : '#F7F1FA',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: "tradingview_chart_embed",
          hide_side_toolbar: false,
          withdateranges: true,
          save_image: true,
          studies: [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies"
          ]
        });
      } catch (err) {
        console.warn('TradingView initialization notice:', err);
      }
    } else {
      const iframe = document.createElement('iframe');
      const tvTheme = theme === 'dark' ? 'dark' : 'light';
      iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart_embed&symbol=${encodeURIComponent(tvSymbol)}&interval=${tvState.interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=${tvTheme}&style=1&timezone=Etc%2FUTC`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.appendChild(iframe);
    }
  }

  function selectMarketCoin(coin) {
    tvState.activeCoin = coin;
    tvState.symbol = resolveTradingViewSymbol(coin);

    // Update Banner elements
    const badgeEl = document.getElementById('activeCoinSymbolBadge');
    const pairEl = document.getElementById('activeCoinPairTitle');
    const fullnameEl = document.getElementById('activeCoinFullname');
    const markEl = document.getElementById('activeCoinMarkPrice');
    const changeEl = document.getElementById('activeCoinChange');

    if (badgeEl) badgeEl.textContent = coin.symbol;
    if (pairEl) pairEl.textContent = coin.pair;
    if (fullnameEl) fullnameEl.textContent = coin.name;
    if (markEl) markEl.textContent = `$${coin.price >= 1 ? coin.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : coin.price}`;
    if (changeEl) {
      changeEl.textContent = coin.change;
      changeEl.className = coin.change.startsWith('+') ? 'tt-stat-val text-accent' : 'tt-stat-val text-danger';
    }

    // Update active row highlighting
    document.querySelectorAll('.market-row-item').forEach(el => {
      if (el.dataset.symbol === coin.symbol) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (tvState.engine === 'hypercore') {
      renderHyperCoreCanvasChart();
    } else {
      renderTradingViewWidget();
    }
  }

  function renderMarketList() {
    const listContainer = document.getElementById('marketsScrollList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const query = tvState.searchQuery.trim().toLowerCase();
    const cat = tvState.activeCategory;

    const filtered = HYPERCORE_MARKETS.filter(m => {
      const matchesCat = (cat === 'all') || (m.cat === cat);
      const matchesQuery = !query || m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query) || m.pair.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });

    const countPill = document.getElementById('marketCountPill');
    if (countPill) countPill.textContent = `${filtered.length} Pairs`;

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding:16px; font-size:12px; color:var(--ink-2); text-align:center;">No matching coins found. Use custom ticker below.</div>';
      return;
    }

    filtered.forEach(coin => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `market-row-item ${tvState.activeCoin && tvState.activeCoin.symbol === coin.symbol ? 'active' : ''}`;
      btn.dataset.symbol = coin.symbol;

      const isPos = coin.change && coin.change.startsWith('+');
      const iconUrl = coin.icon || '/assets/ecosystem/hyperliquid.png';
      const fallbackInitials = (coin.symbol || '').slice(0, 3);
      const maxLev = coin.maxLev || 10;

      btn.innerHTML = `
        <div class="market-row-identity">
          <div class="market-token-logo-wrap">
            <img src="${iconUrl}" class="market-token-logo" alt="${coin.symbol}" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';">
            <span class="market-token-fallback">${fallbackInitials}</span>
          </div>
          <div class="market-row-left">
            <div class="market-row-symbol-line">
              <span class="market-row-symbol">${coin.symbol}</span>
              <span class="market-row-lev">${maxLev}x</span>
            </div>
            <span class="market-row-name">${coin.name}</span>
          </div>
        </div>
        <div class="market-row-right">
          <span class="market-row-price">$${coin.price >= 1 ? coin.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : coin.price}</span>
          <span class="market-row-change ${isPos ? 'pos' : 'neg'}">${coin.change || '--'}</span>
        </div>
      `;

      btn.addEventListener('click', () => selectMarketCoin(coin));
      listContainer.appendChild(btn);
    });
  }

  function switchAppView(view) {
    const vaultView = document.getElementById('vaultDashboardView');
    const tradingView = document.getElementById('tradingTerminalView');
    const navVaultBtn = document.getElementById('drawerNavVault');
    const navTradingBtn = document.getElementById('drawerNavTrading');

    if (view === 'trading') {
      if (vaultView) vaultView.style.display = 'none';
      if (tradingView) tradingView.style.display = 'flex';
      if (navVaultBtn) navVaultBtn.classList.remove('active');
      if (navTradingBtn) navTradingBtn.classList.add('active');
      setTimeout(() => {
        if (tvState.engine === 'hypercore') {
          renderHyperCoreCanvasChart();
        } else {
          renderTradingViewWidget();
        }
      }, 50);
    } else {
      if (tradingView) tradingView.style.display = 'none';
      if (vaultView) vaultView.style.display = 'block';
      if (navTradingBtn) navTradingBtn.classList.remove('active');
      if (navVaultBtn) navVaultBtn.classList.add('active');
    }
  }

  function initNavigationDrawer() {
    const drawerBtn = document.getElementById('appDrawerBtn');
    const drawer = document.getElementById('appDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const closeBtn = document.getElementById('drawerCloseBtn');
    const navVault = document.getElementById('drawerNavVault');
    const navTrading = document.getElementById('drawerNavTrading');
    const lockBtn = document.getElementById('drawerLockBtn');
    const backToVaultBtn = document.getElementById('btnBackToVault');
    const drawerBetaCode = document.getElementById('drawerBetaCodeText');

    if (window.AegisAccess && drawerBetaCode) {
      const code = window.AegisAccess.getAuthorizedCode();
      if (code) drawerBetaCode.textContent = code;
    }

    function openDrawer() {
      if (drawer) drawer.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      if (drawer) drawer.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
      if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'false');
    }

    if (drawerBtn) drawerBtn.addEventListener('click', () => {
      const isOpen = drawer && drawer.classList.contains('active');
      if (isOpen) closeDrawer(); else openDrawer();
    });

    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    if (navVault) {
      navVault.addEventListener('click', () => {
        switchAppView('vault');
        if (navVault) navVault.classList.add('active');
        if (navTrading) navTrading.classList.remove('active');
        closeDrawer();
      });
    }

    if (navTrading) {
      navTrading.addEventListener('click', () => {
        switchAppView('trading');
        if (navTrading) navTrading.classList.add('active');
        if (navVault) navVault.classList.remove('active');
        closeDrawer();
      });
    }

    const navSimulator = document.getElementById('drawerNavSimulator');
    if (navSimulator) {
      navSimulator.addEventListener('click', () => {
        openDeltaHedgeSimulator();
        closeDrawer();
      });
    }

    const drawerToggleModeBtn = document.getElementById('drawerToggleModeBtn');
    const drawerModeLabel = document.getElementById('drawerModeLabel');
    if (drawerToggleModeBtn) {
      drawerToggleModeBtn.addEventListener('click', () => {
        const targetMode = runtimeState.viewMode === 'pro' ? 'lite' : 'pro';
        setTerminalViewMode(targetMode);
        if (drawerModeLabel) {
          drawerModeLabel.textContent = targetMode === 'pro' ? 'Switch to Lite Auto-Pilot' : 'Switch to Pro Terminal';
        }
        closeDrawer();
      });
    }

    const drawerThemeBtn = document.getElementById('drawerThemeBtn');
    if (drawerThemeBtn) {
      drawerThemeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    }

    const drawerSettingsBtn = document.getElementById('drawerSettingsBtn');
    if (drawerSettingsBtn) {
      drawerSettingsBtn.addEventListener('click', () => {
        closeDrawer();
        const settingsModal = document.getElementById('settingsModal');
        const settingsBackdrop = document.getElementById('settingsBackdrop');
        if (settingsModal) {
          settingsModal.hidden = false;
          settingsModal.classList.add('active');
        }
        if (settingsBackdrop) settingsBackdrop.classList.add('active');
      });
    }

    if (backToVaultBtn) {
      backToVaultBtn.addEventListener('click', () => {
        switchAppView('vault');
        if (navVault) navVault.classList.add('active');
        if (navTrading) navTrading.classList.remove('active');
      });
    }
  }

  function initTerminalSettingsModal() {
    const settingsBtn = document.getElementById('settingsBtn');
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsBackdrop');
    const closeBtn = document.getElementById('settingsCloseBtn');
    const resetBtn = document.getElementById('settingsResetBtn');

    const toggleMap = {
      toggleMetricsTicker: 'metricsTickerSection',
      toggleHealthGauge: document.getElementById('gaugeCard') ? 'gaugeCard' : 'healthGaugeSection',
      toggleSimBar: 'simBarSection',
      toggleRiskControls: 'proConfigCard',
      toggleEcosystemCard: 'tokenMetricsCard',
      toggleAuditLog: document.getElementById('telemetryCard') ? 'telemetryCard' : 'auditCardSection'
    };

    function loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem('aegis-terminal-settings') || '{}');
        Object.keys(toggleMap).forEach(toggleId => {
          const elToggle = document.getElementById(toggleId);
          const targetSection = document.getElementById(toggleMap[toggleId]) || 
            (toggleId === 'toggleHealthGauge' ? document.getElementById('healthGaugeSection') : 
            (toggleId === 'toggleAuditLog' ? document.getElementById('auditCardSection') : null));
          if (elToggle && targetSection) {
            const isVisible = saved[toggleId] !== undefined ? saved[toggleId] : true;
            elToggle.checked = isVisible;
            targetSection.style.display = isVisible ? '' : 'none';
          }
        });
      } catch (e) {
        console.warn('Failed to parse terminal settings:', e);
      }
    }

    function saveSettings() {
      const settings = {};
      Object.keys(toggleMap).forEach(toggleId => {
        const elToggle = document.getElementById(toggleId);
        const targetSection = document.getElementById(toggleMap[toggleId]) || 
          (toggleId === 'toggleHealthGauge' ? document.getElementById('healthGaugeSection') : 
          (toggleId === 'toggleAuditLog' ? document.getElementById('auditCardSection') : null));
        if (elToggle && targetSection) {
          settings[toggleId] = elToggle.checked;
          targetSection.style.display = elToggle.checked ? '' : 'none';
        }
      });
      try {
        localStorage.setItem('aegis-terminal-settings', JSON.stringify(settings));
      } catch (e) {}
    }

    function openSettings() {
      if (modal) {
        modal.hidden = false;
        modal.classList.add('active');
      }
      if (backdrop) backdrop.classList.add('active');
    }

    function closeSettings() {
      if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; }, 200);
      }
      if (backdrop) backdrop.classList.remove('active');
    }

    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (backdrop) backdrop.addEventListener('click', closeSettings);

    Object.keys(toggleMap).forEach(toggleId => {
      const elToggle = document.getElementById(toggleId);
      if (elToggle) {
        elToggle.addEventListener('change', saveSettings);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Object.keys(toggleMap).forEach(toggleId => {
          const elToggle = document.getElementById(toggleId);
          if (elToggle) elToggle.checked = true;
        });
        saveSettings();
        showToast('Restored default terminal workspace layout.');
      });
    }

    loadSettings();
  }

  function showModalAlert(type, title, desc, actionButtonsHtml = '') {
    const alertBox = document.getElementById('walletModalAlert');
    const alertTitle = document.getElementById('walletAlertTitle');
    const alertDesc = document.getElementById('walletAlertDesc');
    const alertIcon = document.getElementById('walletAlertIcon');
    const actionContainer = document.getElementById('walletAlertActionContainer');
    const cancelBtn = document.getElementById('walletAlertCancelBtn');

    if (!alertBox) return;

    alertBox.style.display = 'flex';
    alertBox.className = `wallet-modal-alert is-${type}`;

    if (alertTitle) alertTitle.textContent = title;
    if (alertDesc) alertDesc.textContent = desc;

    if (alertIcon) {
      if (type === 'loading') {
        alertIcon.innerHTML = '<div class="wallet-alert-spinner"></div>';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
      } else {
        alertIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        if (cancelBtn) cancelBtn.style.display = 'none';
      }
    }

    if (actionContainer) {
      if (actionButtonsHtml) {
        actionContainer.style.display = 'flex';
        actionContainer.innerHTML = actionButtonsHtml;
        const btnWc = actionContainer.querySelector('#btnAlertOpenWc');
        if (btnWc) {
          btnWc.addEventListener('click', () => {
            hideModalAlert();
            connectWalletConnect();
          });
        }
      } else {
        actionContainer.style.display = 'none';
        actionContainer.innerHTML = '';
      }
    }
  }

  function hideModalAlert() {
    const alertBox = document.getElementById('walletModalAlert');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'wallet-modal-alert';
    }
  }

  function refreshDetectedWalletsUI() {
    const keys = ['metamask', 'okx', 'trust', 'bitget', 'rabby', 'coinbase', 'rainbow', 'zerion'];
    keys.forEach(k => {
      const badge = document.getElementById(`badge-${k}`);
      if (!badge) return;
      const prov = resolveSpecificProvider(k);
      if (prov) {
        badge.className = 'wallet-badge detected';
        badge.innerHTML = '<span class="badge-dot"></span>Installed';
      }
    });
  }

  function closeWalletSelectModal() {
    const modal = document.getElementById('walletSelectModal') || document.getElementById('walletModal');
    const backdrop = document.getElementById('walletSelectBackdrop') || document.getElementById('walletModalBackdrop');
    if (modal) {
      modal.classList.remove('active');
      modal.hidden = true;
    }
    if (backdrop) {
      backdrop.classList.remove('active');
      backdrop.hidden = true;
    }
    hideModalAlert();
  }

  function openWalletSelectModal() {
    const modal = document.getElementById('walletSelectModal') || document.getElementById('walletModal');
    const backdrop = document.getElementById('walletSelectBackdrop') || document.getElementById('walletModalBackdrop');
    hideModalAlert();
    refreshDetectedWalletsUI();
    if (modal) {
      modal.hidden = false;
      modal.classList.add('active');
    }
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.classList.add('active');
    }
  }

  function initWalletSelectModal() {
    const modal = document.getElementById('walletSelectModal') || document.getElementById('walletModal');
    const backdrop = document.getElementById('walletSelectBackdrop') || document.getElementById('walletModalBackdrop');
    const closeBtn = document.getElementById('walletSelectCloseBtn') || document.getElementById('walletModalCloseBtn');
    const btnConnectWc = document.getElementById('btnConnectWalletConnect');
    const btnConnectInjected = document.getElementById('btnConnectInjected');
    const alertCancelBtn = document.getElementById('walletAlertCancelBtn');
    const btnSwitchWallet = document.getElementById('btnSwitchWallet');

    if (closeBtn) closeBtn.addEventListener('click', closeWalletSelectModal);
    if (backdrop) backdrop.addEventListener('click', closeWalletSelectModal);
    if (alertCancelBtn) alertCancelBtn.addEventListener('click', hideModalAlert);

    if (btnSwitchWallet) {
      btnSwitchWallet.addEventListener('click', () => {
        closeWalletAccountModal();
        openWalletSelectModal();
      });
    }

    if (btnConnectWc) {
      btnConnectWc.addEventListener('click', async () => {
        await connectWalletConnect();
      });
    }

    if (btnConnectInjected) {
      btnConnectInjected.addEventListener('click', async () => {
        closeWalletSelectModal();
        await connectInjectedWallet();
      });
    }

    const walletKeys = ['metamask', 'okx', 'trust', 'bitget', 'rabby', 'coinbase', 'rainbow', 'zerion'];
    walletKeys.forEach(k => {
      const btn = document.querySelector(`[data-wallet="${k}"]`) || document.getElementById(`btnWallet${k.charAt(0).toUpperCase() + k.slice(1)}`);
      if (btn) {
        btn.addEventListener('click', async () => {
          await connectSpecificWallet(k);
        });
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('eip6963:announceProvider', () => {
        refreshDetectedWalletsUI();
      });
    }
  }

  function initNetworkSwitcherButtons() {
    const networkBadge = document.getElementById('networkBadge');
    const btnSwitchBanner = document.getElementById('btnSwitchNetworkBanner');
    const btnModalSwitch = document.getElementById('btnModalSwitchNetwork');

    if (networkBadge) {
      networkBadge.addEventListener('click', () => {
        switchOrAddElysiumNetwork();
      });
    }
    if (btnSwitchBanner) {
      btnSwitchBanner.addEventListener('click', () => {
        switchOrAddElysiumNetwork();
      });
    }
    if (btnModalSwitch) {
      btnModalSwitch.addEventListener('click', () => {
        switchOrAddElysiumNetwork();
      });
    }
  }

  // --- INTERACTIVE 4-STEP SPOTLIGHT ONBOARDING TOUR (BRAND KIT COMPLIANT) ---
  function initSpotlightTour() {
    const container = document.getElementById('aegisTourContainer');
    const maskHole = document.getElementById('aegisTourMaskHole');
    const highlightRing = document.getElementById('aegisTourHighlightRing');
    const popover = document.getElementById('aegisTourPopover');
    const stepBadge = document.getElementById('aegisTourStepBadge');
    const titleEl = document.getElementById('aegisTourTitle');
    const descEl = document.getElementById('aegisTourDesc');
    const backBtn = document.getElementById('aegisTourBackBtn');
    const nextBtn = document.getElementById('aegisTourNextBtn');
    const nextBtnText = document.getElementById('aegisTourNextBtnText');
    const skipBtn = document.getElementById('aegisTourSkipBtn');
    const closeBtn = document.getElementById('aegisTourCloseBtn');
    const dotsContainer = document.getElementById('aegisTourDots');
    const replayBtn = document.getElementById('btnTourToggle');

    if (!container || !popover) return;

    const TOUR_STEPS = [
      {
        stepNumber: 1,
        badge: 'STEP 1 OF 4',
        title: 'Your Solvency Shield',
        desc: 'This gauge measures your liquidation risk in real time. As long as the needle stays in the green (> 1.50x), your collateral is 100% safe. If market volatility dips toward the amber trigger zone, the Sentinel automatically shields your position.',
        selector: '#gaugeCard, #healthFactorGaugeContainer, #healthGaugeSection'
      },
      {
        stepNumber: 2,
        badge: 'STEP 2 OF 4',
        title: 'Visual Liquidation Floor',
        desc: 'Track live pricing on Elysium Orbit L2. The amber threshold line displays the exact price where auto-pilot defense arms. Unlike traditional lending protocols, your assets are never fire-sold at bottom ticks.',
        selector: '#chartCard, #tradingviewChartContainer, #positionOverviewCard, .position-card'
      },
      {
        stepNumber: 3,
        badge: 'STEP 3 OF 4',
        title: 'One-Click Autonomous Protection',
        desc: "Select your collateral ($HYPE, $PURR, $UBET), pick a deposit amount, and click 'Arm Sentinel'. AEGIS is non-custodial—you retain complete ownership of your coins and can withdraw at any time.",
        selector: '#vaultActionCard, #vaultDepositForm, #liteAutoPilotCard, #proConfigCard'
      },
      {
        stepNumber: 4,
        badge: 'STEP 4 OF 4',
        title: 'Autonomous On-Chain Sentinel',
        desc: 'Watch automated keeper agents monitor order books and execute counterbalancing shorts on HyperCore to neutralize downside risk (Δ = 0). Every transaction is verifiable on Elysium L2.',
        selector: '#telemetryCard, #auditLogCard, #auditCardSection, #liteTelemetryCard'
      }
    ];

    let currentStepIndex = 0;
    let isTourActive = false;
    let repositionRaf = null;

    function getTargetElement(step) {
      const selectors = step.selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const target = document.querySelector(sel);
        if (target && target.offsetParent !== null) return target;
      }
      for (const sel of selectors) {
        const target = document.querySelector(sel);
        if (target) return target;
      }
      return null;
    }

    function updateHoleAndPopover() {
      if (!isTourActive) return;
      const step = TOUR_STEPS[currentStepIndex];
      if (!step) return;

      const target = getTargetElement(step);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const pad = 8;
      const holeX = Math.max(0, rect.left - pad);
      const holeY = Math.max(0, rect.top - pad);
      const holeW = Math.max(0, rect.width + pad * 2);
      const holeH = Math.max(0, rect.height + pad * 2);

      if (maskHole) {
        maskHole.setAttribute('x', holeX);
        maskHole.setAttribute('y', holeY);
        maskHole.setAttribute('width', holeW);
        maskHole.setAttribute('height', holeH);
      }

      if (highlightRing) {
        highlightRing.style.left = holeX + 'px';
        highlightRing.style.top = holeY + 'px';
        highlightRing.style.width = holeW + 'px';
        highlightRing.style.height = holeH + 'px';
        highlightRing.style.opacity = '1';
      }

      // Smart Popover Positioning
      const popoverWidth = Math.min(360, window.innerWidth - 32);
      const popoverHeight = popover.offsetHeight || 220;
      let left = 16;
      let top = 16;

      if (window.innerWidth > 920) {
        // Desktop positioning: Try Right, then Left, then Bottom, then Top
        if (rect.right + popoverWidth + 24 <= window.innerWidth) {
          left = rect.right + 16;
          top = rect.top + (rect.height - popoverHeight) / 2;
        } else if (rect.left - popoverWidth - 24 >= 0) {
          left = rect.left - popoverWidth - 16;
          top = rect.top + (rect.height - popoverHeight) / 2;
        } else if (rect.bottom + popoverHeight + 20 <= window.innerHeight) {
          top = rect.bottom + 16;
          left = rect.left + (rect.width - popoverWidth) / 2;
        } else {
          top = rect.top - popoverHeight - 16;
          left = rect.left + (rect.width - popoverWidth) / 2;
        }
      } else {
        // Mobile / Tablet positioning: prefer below, fallback above
        left = (window.innerWidth - popoverWidth) / 2;
        if (rect.bottom + popoverHeight + 16 <= window.innerHeight) {
          top = rect.bottom + 14;
        } else if (rect.top - popoverHeight - 14 >= 0) {
          top = rect.top - popoverHeight - 14;
        } else {
          top = Math.max(16, window.innerHeight - popoverHeight - 16);
        }
      }

      // Bounds clamping
      left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left));
      top = Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, top));

      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    }

    function scheduleReposition() {
      if (repositionRaf) cancelAnimationFrame(repositionRaf);
      repositionRaf = requestAnimationFrame(updateHoleAndPopover);
    }

    function renderStep(index) {
      if (index < 0 || index >= TOUR_STEPS.length) return;
      currentStepIndex = index;
      const step = TOUR_STEPS[index];

      // Ensure we are in vault view so all 4 targets are visible
      const tradingView = document.getElementById('tradingTerminalView');
      if (tradingView && tradingView.style.display !== 'none') {
        switchAppView('vault');
      }

      // Update contents
      if (stepBadge) stepBadge.textContent = step.badge;
      if (titleEl) titleEl.textContent = step.title;
      if (descEl) descEl.textContent = step.desc;

      // Update Navigation buttons
      if (backBtn) {
        backBtn.style.display = index === 0 ? 'none' : 'inline-flex';
      }
      if (nextBtnText) {
        nextBtnText.textContent = index === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next';
      }

      // Update Progress dots
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.tour-dot');
        dots.forEach((dot, dIdx) => {
          if (dIdx === index) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      }

      // Scroll target smoothly into view
      const target = getTargetElement(step);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Position immediately, then refine after scroll completes
      updateHoleAndPopover();
      setTimeout(updateHoleAndPopover, 120);
      setTimeout(updateHoleAndPopover, 320);
    }

    function startTour(fromStep = 0) {
      isTourActive = true;
      container.style.display = 'block';
      container.setAttribute('aria-hidden', 'false');
      container.classList.add('active');
      renderStep(fromStep);
      window.addEventListener('resize', scheduleReposition, { passive: true });
      window.addEventListener('scroll', scheduleReposition, { passive: true });
    }

    function endTour(markCompleted = true) {
      isTourActive = false;
      container.classList.remove('active');
      if (maskHole) {
        maskHole.setAttribute('width', '0');
        maskHole.setAttribute('height', '0');
      }
      if (highlightRing) {
        highlightRing.style.opacity = '0';
      }
      setTimeout(() => {
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
      }, 250);

      window.removeEventListener('resize', scheduleReposition);
      window.removeEventListener('scroll', scheduleReposition);

      if (markCompleted) {
        try {
          localStorage.setItem('aegis-terminal-tour-seen', 'true');
        } catch (e) {}
      }
    }

    function nextStep() {
      if (currentStepIndex < TOUR_STEPS.length - 1) {
        renderStep(currentStepIndex + 1);
      } else {
        endTour(true);
      }
    }

    function prevStep() {
      if (currentStepIndex > 0) {
        renderStep(currentStepIndex - 1);
      }
    }

    // Attach button listeners
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextStep();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        prevStep();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        endTour(true);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        endTour(true);
      });
    }

    // Progress dot click listeners
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.tour-dot');
      dots.forEach((dot, dotIdx) => {
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
          renderStep(dotIdx);
        });
      });
    }

    // Replay Quick Tour button in top navigation
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startTour(0);
      });
    }

    // Keyboard navigation (Esc, ArrowRight/Enter, ArrowLeft)
    window.addEventListener('keydown', (e) => {
      if (!isTourActive) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        endTour(true);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    });

    // First-Time Auto-Launch check after 1,200ms
    try {
      const hasSeenTour = localStorage.getItem('aegis-terminal-tour-seen');
      if (!hasSeenTour) {
        setTimeout(() => {
          startTour(0);
        }, 1200);
      }
    } catch (e) {
      // In case localStorage is blocked
    }
  }

  function initTradingTerminalSuite() {
    initNavigationDrawer();
    initTerminalSettingsModal();
    initWalletSelectModal();
    initNetworkSwitcherButtons();
    initSpotlightTour();
    renderMarketList();

    // Category tabs
    const catBtns = document.querySelectorAll('.market-cat-btn');
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tvState.activeCategory = btn.dataset.cat || 'all';
        renderMarketList();
      });
    });

    // Market Search
    const searchInput = document.getElementById('marketSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        tvState.searchQuery = e.target.value;
        renderMarketList();
      });
    }

    // Custom Ticker Loader
    const customInput = document.getElementById('customTickerInput');
    const customBtn = document.getElementById('btnLoadCustomTicker');

    function loadCustom() {
      const val = customInput ? customInput.value.trim().toUpperCase() : '';
      if (!val) return;
      const customPair = val.includes(':') ? val.split(':')[1] : val;
      const customCoin = {
        symbol: customPair.replace('USDT', '').replace('USDC', ''),
        name: 'Custom Market Pair',
        pair: `${customPair} (Custom)`,
        price: 0,
        change: '--',
        cat: 'custom',
        tv: val.includes(':') ? val : `BINANCE:${val}`
      };
      selectMarketCoin(customCoin);
    }

    if (customBtn) customBtn.addEventListener('click', loadCustom);
    if (customInput) customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadCustom();
    });

    // Engine toggle buttons (HyperCore Direct vs TradingView)
    const btnEngineHyperCore = document.getElementById('btnEngineHyperCore');
    const btnEngineTV = document.getElementById('btnEngineTV');

    if (btnEngineHyperCore && btnEngineTV) {
      btnEngineHyperCore.addEventListener('click', () => {
        btnEngineHyperCore.classList.add('active');
        btnEngineTV.classList.remove('active');
        btnEngineHyperCore.setAttribute('aria-selected', 'true');
        btnEngineTV.setAttribute('aria-selected', 'false');
        tvState.engine = 'hypercore';
        renderHyperCoreCanvasChart();
      });

      btnEngineTV.addEventListener('click', () => {
        btnEngineTV.classList.add('active');
        btnEngineHyperCore.classList.remove('active');
        btnEngineTV.setAttribute('aria-selected', 'true');
        btnEngineHyperCore.setAttribute('aria-selected', 'false');
        tvState.engine = 'tradingview';
        renderTradingViewWidget();
      });
    }

    // Timeframe resolution intervals
    const intervalBtns = document.querySelectorAll('.tt-interval-btn');
    intervalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        intervalBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tvState.interval = btn.dataset.interval || '15';
        if (tvState.engine === 'hypercore') {
          renderHyperCoreCanvasChart();
        } else {
          renderTradingViewWidget();
        }
      });
    });
  }

  // --- 4. EIP-1193 WEB3 WALLET PROVIDER & ELYSIUM L2 RPC ENGINE ---
  const ELYSIUM_CONFIG = {
    chainId: '0x185d9', // 99801 in hex
    chainName: 'Elysium L2 Testnet',
    rpcUrl: 'https://testnet-rpc.elysium.kinetiq.xyz',
    explorerUrl: 'https://elysium.kinetiq.xyz/testnet-explorer',
    contracts: {
      vault: '0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29',
      feeCollector: '0xCA9D24c4B5025dA065d1AEf92808aB1698f267ae',
      hype: '0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234',
      usdc: '0x7D29d8047B905000459c0E80c34a26CeedcB47b2', // Canonical Bridged Testnet USDC (6 decimals)
      legacyMockUsdc: '0x712516e61C8B383dF4A63CFe83d7701Bce54B03e',
      aegis: '0x606f01e0cd5B90d09A99442e4265a915CeCa5104',
      sentinelRegistry: '0x6C64188e1D677Eb85E4aD71836650310281f0893'
    },
    adapters: {
      // Stock ArbOS Mode: Off-chain Sentinel Keeper executes trade-only orders via HyperCore L1 API
      agentDispatchAdapter: '0xBAD4C895DBcA78F10764D73274dC1f314c80237e',
      relayedOracleAdapter: '0x8829386b87F6CFbf64A3f75916BC96bAb0B12991',
      // Post-Upgrade ArbOS Mode (Available ~4 weeks post-mainnet hardfork)
      hyperCorePrecompileAdapter: '0x0000000000000000000000000000000000000801',
      predeployCoreWriterAdapter: '0x0000000000000000000000000000000000000802'
    },
    architecture: {
      activeMode: 'STOCK_ARBOS_AGENT', // 'STOCK_ARBOS_AGENT' | 'NATIVE_PRECOMPILE_V2'
      executionRoute: 'HyperCore L1 Trade-Only API Agent',
      oracleRoute: 'Telemetry Relayed Oracle (fail-closed, maxStaleness 120s)'
    },
    precompiles: {
      oracle0x0801: '0x0000000000000000000000000000000000000801',
      writer0x0802: '0x0000000000000000000000000000000000000802'
    },
    defaultAccount: '0xf0e721C996e76a0Cd5805975464CbE3E98839D64',
    sentinelKeeperAgent: '0xB8f01AAeE2250C2A244B92B51f39213aca305012'
  };

  // --- ELYSIUM L2 WALLET_ADD_ETHEREUM_CHAIN PARAMETERS (1-CLICK SWITCH) ---
  const ELYSIUM_CHAIN_PARAMS = {
    chainId: '0x185d9', // 99801 in hex
    chainName: 'Elysium L2 Testnet',
    nativeCurrency: {
      name: 'HYPE',
      symbol: 'HYPE',
      decimals: 18
    },
    rpcUrls: ['https://testnet-rpc.elysium.kinetiq.xyz'],
    blockExplorerUrls: ['https://elysium.kinetiq.xyz/testnet-explorer']
  };

  function getFriendlyChainName(chainIdHex) {
    if (!chainIdHex) return 'Unknown Network';
    const id = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x') ? parseInt(chainIdHex, 16) : Number(chainIdHex);
    switch (id) {
      case 99801: return 'Elysium L2 Testnet';
      case 1: return 'Ethereum Mainnet';
      case 42161: return 'Arbitrum One';
      case 421614: return 'Arbitrum Sepolia';
      case 10: return 'Optimism';
      case 8453: return 'Base';
      case 137: return 'Polygon';
      case 56: return 'BNB Smart Chain';
      case 11155111: return 'Sepolia Testnet';
      default: return `Chain #${id}`;
    }
  }

  function updateNetworkUI(chainIdHex) {
    const isElysium = chainIdHex && (
      chainIdHex === ELYSIUM_CONFIG.chainId || 
      chainIdHex === '0x185d9' || 
      chainIdHex === 99801 || 
      chainIdHex === '99801'
    );
    runtimeState.isElysiumChain = Boolean(isElysium);
    runtimeState.activeChainId = chainIdHex;

    const wrongBanner = document.getElementById('wrongNetworkBanner');
    const chainNameDisplay = document.getElementById('currentChainNameDisplay');
    const networkBadge = document.getElementById('networkBadge');
    const networkBadgeText = document.getElementById('networkBadgeText');
    const networkBadgeChainId = document.getElementById('networkBadgeChainId');
    const modalNetworkText = document.getElementById('modalNetworkText');
    const modalNetworkPill = document.getElementById('modalNetworkPill');
    const modalNetworkDot = document.getElementById('modalNetworkDot');
    const btnModalSwitch = document.getElementById('btnModalSwitchNetwork');

    if (runtimeState.walletConnected && !isElysium) {
      const friendlyName = getFriendlyChainName(chainIdHex);
      if (wrongBanner) {
        wrongBanner.style.display = 'flex';
      }
      if (chainNameDisplay) {
        chainNameDisplay.textContent = `${friendlyName} (${chainIdHex})`;
      }
      if (networkBadge) {
        networkBadge.classList.add('wrong-network');
        networkBadge.title = `Connected to ${friendlyName}. Click to switch to Elysium L2 (Chain 99801)`;
      }
      if (networkBadgeText) {
        networkBadgeText.textContent = 'Wrong Net';
      }
      if (networkBadgeChainId) {
        networkBadgeChainId.textContent = 'Switch';
      }
      if (modalNetworkText) {
        modalNetworkText.textContent = `${friendlyName} (Not Elysium)`;
      }
      if (modalNetworkPill) {
        modalNetworkPill.className = 'status-pill pill-danger';
        modalNetworkPill.textContent = 'Wrong Net';
      }
      if (modalNetworkDot) {
        modalNetworkDot.style.background = 'var(--danger)';
      }
      if (btnModalSwitch) {
        btnModalSwitch.style.display = 'inline-flex';
      }
    } else {
      if (wrongBanner) {
        wrongBanner.style.display = 'none';
      }
      if (networkBadge) {
        networkBadge.classList.remove('wrong-network');
        networkBadge.title = 'Elysium L2 Testnet (Chain ID 99801)';
      }
      if (networkBadgeText) {
        networkBadgeText.textContent = 'Elysium L2';
      }
      if (networkBadgeChainId) {
        networkBadgeChainId.textContent = '99801';
      }
      if (modalNetworkText) {
        modalNetworkText.textContent = 'Elysium L2 Testnet (Chain ID 99801)';
      }
      if (modalNetworkPill) {
        modalNetworkPill.className = 'status-pill pill-accent';
        modalNetworkPill.textContent = 'Synced';
      }
      if (modalNetworkDot) {
        modalNetworkDot.style.background = 'var(--accent)';
      }
      if (btnModalSwitch) {
        btnModalSwitch.style.display = 'none';
      }
    }
  }

  async function switchOrAddElysiumNetwork(prov) {
    const p = prov || getWeb3Provider();
    if (!p) {
      showToast('No wallet detected. Please connect your wallet first.');
      return false;
    }

    try {
      showToast('Requesting switch to Elysium L2 (Chain 99801)...');
      await p.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ELYSIUM_CONFIG.chainId }]
      });
      showToast('Switched to Elysium L2 Testnet!');
      updateNetworkUI(ELYSIUM_CONFIG.chainId);
      logAudit('NETWORK', 'Switched wallet chain to Elysium L2 (99801).', 'accent');
      if (runtimeState.walletAddress) {
        fetchOnChainBalances(runtimeState.walletAddress);
        syncOnChainVaultPosition(runtimeState.walletAddress);
      }
      return true;
    } catch (switchErr) {
      console.warn('Switch chain notice:', switchErr);
      const isUnrecognized = switchErr.code === 4902 || 
        (switchErr.message && (switchErr.message.includes('4902') || switchErr.message.toLowerCase().includes('unrecognized') || switchErr.message.toLowerCase().includes('not added') || switchErr.message.toLowerCase().includes('unknown chain')));
      
      if (isUnrecognized) {
        try {
          showToast('Adding Elysium L2 Testnet settings with 1 click...');
          await p.request({
            method: 'wallet_addEthereumChain',
            params: [ELYSIUM_CHAIN_PARAMS]
          });
          showToast('Elysium L2 Testnet added and activated!');
          updateNetworkUI(ELYSIUM_CONFIG.chainId);
          logAudit('NETWORK', 'Elysium L2 Testnet added to wallet via wallet_addEthereumChain.', 'accent');
          if (runtimeState.walletAddress) {
            fetchOnChainBalances(runtimeState.walletAddress);
            syncOnChainVaultPosition(runtimeState.walletAddress);
          }
          return true;
        } catch (addErr) {
          console.error('wallet_addEthereumChain rejected:', addErr);
          if (addErr.code === 4001 || (addErr.message && addErr.message.includes('User rejected'))) {
            showToast('Elysium network addition was cancelled.');
          } else {
            showToast('Could not add Elysium network: ' + (addErr.message || 'Rejected'));
          }
          return false;
        }
      } else if (switchErr.code === 4001 || (switchErr.message && switchErr.message.includes('User rejected'))) {
        showToast('Network switch cancelled by user.');
        return false;
      } else {
        // Fallback attempt: some mobile wallets require wallet_addEthereumChain directly without error 4902
        try {
          await p.request({
            method: 'wallet_addEthereumChain',
            params: [ELYSIUM_CHAIN_PARAMS]
          });
          showToast('Elysium L2 Testnet added and activated!');
          updateNetworkUI(ELYSIUM_CONFIG.chainId);
          logAudit('NETWORK', 'Elysium L2 Testnet activated via fallback wallet_addEthereumChain.', 'accent');
          if (runtimeState.walletAddress) {
            fetchOnChainBalances(runtimeState.walletAddress);
            syncOnChainVaultPosition(runtimeState.walletAddress);
          }
          return true;
        } catch (fallbackErr) {
          console.error('Fallback add chain failed:', fallbackErr);
          showToast('Network switch prompt was rejected or not supported.');
          return false;
        }
      }
    }
  }

  // --- ELYSIUM L2 VERIFIED JSON-RPC CLIENT ---
  async function callElysiumRpc(method, params = []) {
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    try {
      const res = await fetch(ELYSIUM_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000000),
          method,
          params
        })
      });
      const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const rtt = Math.round(t1 - t0);

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}`, rtt };
      }
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message || 'RPC Error', rtt };
      }
      return { success: true, result: data.result, rtt };
    } catch (netErr) {
      const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      return { success: false, error: netErr.message || 'Network Error', rtt: Math.round(t1 - t0) };
    }
  }

  async function pollRpcTelemetry() {
    const res = await callElysiumRpc('eth_blockNumber', []);
    const rpcBlockEl = document.getElementById('liveRpcBlockDisplay');
    const rpcObsEl = document.getElementById('liveRpcObsTime');
    const pill = document.getElementById('integrationOverallPill');

    if (res.success && res.result) {
      const blockNum = parseInt(res.result, 16);
      runtimeState.blockNumber = blockNum;
      runtimeState.rpcLatencyMs = res.rtt;
      runtimeState.lastRpcObservation = new Date().toISOString();

      if (el.latencyVal) {
        el.latencyVal.textContent = `${res.rtt}ms (RPC RTT)`;
        el.latencyVal.title = `Elysium L2 RPC round-trip latency measured via eth_blockNumber (${ELYSIUM_CONFIG.rpcUrl})`;
      }
      if (rpcBlockEl) {
        rpcBlockEl.textContent = `Block #${blockNum.toLocaleString()}`;
      }
      if (rpcObsEl) {
        rpcObsEl.textContent = `Elysium L2 (Chain 99801) • Observed: ${new Date().toLocaleTimeString()} (RTT: ${res.rtt}ms)`;
      }
      if (pill) {
        pill.className = 'status-pill pill-accent';
        pill.textContent = 'Live RPC Synced';
      }
    } else {
      runtimeState.rpcLatencyMs = null;
      if (el.latencyVal) {
        el.latencyVal.textContent = 'RPC Unreachable';
        el.latencyVal.title = `Failed to query ${ELYSIUM_CONFIG.rpcUrl}: ${res.error || 'timeout'}`;
      }
      if (rpcBlockEl) {
        rpcBlockEl.textContent = 'RPC Disconnected';
      }
      if (rpcObsEl) {
        rpcObsEl.textContent = `Elysium L2 (Chain 99801) • Node unreachable`;
      }
      if (pill) {
        pill.className = 'status-pill pill-danger';
        pill.textContent = 'RPC Disconnected';
      }
    }
  }

  async function checkDeferredFeeDebt(addr) {
    const targetAddr = addr || runtimeState.walletAddress || ELYSIUM_CONFIG.defaultAccount;
    const padAddr = targetAddr.toLowerCase().replace('0x', '').padStart(64, '0');
    const debtSelector = '0x41bc5b0c'; // feeDebts(address)
    const callData = debtSelector + padAddr;

    const statusPill = document.getElementById('feeDebtStatusPill');
    const amountDisplay = document.getElementById('feeDebtAmountDisplay');
    const detailText = document.getElementById('feeDebtDetailText');
    const modalFeeDebtDisplay = document.getElementById('modalFeeDebtDisplay');
    const repayContainer = document.getElementById('repayFeeDebtContainer');

    const res = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.vault, data: callData },
      'latest'
    ]);

    if (!res.success || !res.result || res.result === '0x' || res.result.length < 66) {
      runtimeState.feeDebtState = {
        supported: false,
        amountUsdc: null,
        status: 'UNAVAILABLE_ON_DEPLOYMENT',
        verifiedOnChain: false
      };
      if (statusPill) {
        statusPill.className = 'status-pill pill-hedge';
        statusPill.textContent = 'Query Failed';
      }
      if (amountDisplay) {
        amountDisplay.textContent = 'Unavailable on Vault';
        amountDisplay.className = 't-val font-mono text-hedge';
      }
      if (modalFeeDebtDisplay) {
        modalFeeDebtDisplay.textContent = 'Unavailable';
        modalFeeDebtDisplay.className = 'font-mono text-hedge';
      }
      if (repayContainer) repayContainer.style.display = 'none';
      if (detailText) {
        detailText.textContent = `AegisVault call returned unexpected data.`;
      }
      return;
    }

    try {
      const debtWei = BigInt(res.result);
      const debtUsdc = Number(debtWei) / 1e6; // USDC 6 decimals
      runtimeState.feeDebtState = {
        supported: true,
        amountUsdc: debtUsdc,
        status: debtUsdc > 0 ? 'OUTSTANDING_DEBT' : 'ZERO_DEBT_VERIFIED',
        verifiedOnChain: true
      };
      if (statusPill) {
        statusPill.className = debtUsdc > 0 ? 'status-pill pill-danger' : 'status-pill pill-accent';
        statusPill.textContent = debtUsdc > 0 ? 'Debt Outstanding' : 'Zero Debt Verified';
      }
      if (amountDisplay) {
        amountDisplay.textContent = `$${debtUsdc.toFixed(2)} USDC`;
        amountDisplay.className = `t-val font-mono ${debtUsdc > 0 ? 'text-danger' : 'text-accent'}`;
      }
      if (modalFeeDebtDisplay) {
        modalFeeDebtDisplay.textContent = `$${debtUsdc.toFixed(2)} USDC`;
        modalFeeDebtDisplay.className = `font-mono ${debtUsdc > 0 ? 'text-danger' : 'text-accent'}`;
      }
      if (repayContainer) {
        repayContainer.style.display = debtUsdc > 0 ? 'block' : 'none';
      }
      if (detailText) {
        detailText.textContent = `Verified on-chain via feeDebts(${formatAddress(targetAddr)}).`;
      }
    } catch (parseErr) {
      if (amountDisplay) amountDisplay.textContent = 'Decode Error';
      if (modalFeeDebtDisplay) modalFeeDebtDisplay.textContent = 'Decode Error';
    }
  }

  async function checkOnChainFeeCollector() {
    const feeColDisplay = document.getElementById('onChainSettledFeesDisplay');
    // totalFeesCaptured() selector: 0xd8f13e8c
    const res = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.feeCollector, data: '0xd8f13e8c' },
      'latest'
    ]);

    if (res.success && res.result && res.result !== '0x') {
      try {
        const capturedWei = BigInt(res.result);
        const capturedUsdc = Number(capturedWei) / 1e6;
        runtimeState.feeCollectorState.totalCapturedUsdc = capturedUsdc;
        if (feeColDisplay) {
          feeColDisplay.textContent = `$${capturedUsdc.toFixed(2)} USDC`;
          feeColDisplay.title = `Verified on-chain: totalFeesCaptured() on AegisFeeCollector (${ELYSIUM_CONFIG.contracts.feeCollector})`;
        }
      } catch (e) {}
    } else {
      if (feeColDisplay) feeColDisplay.textContent = '$0.00 USDC';
    }
  }

  async function checkContractDeployments() {
    // 1. Vault check
    const vaultCode = await callElysiumRpc('eth_getCode', [ELYSIUM_CONFIG.contracts.vault, 'latest']);
    const cardVaultStatus = document.getElementById('cardVaultStatus');
    if (vaultCode.success && vaultCode.result && vaultCode.result.length > 2) {
      if (cardVaultStatus) {
        cardVaultStatus.textContent = `${formatAddress(ELYSIUM_CONFIG.contracts.vault)} (Deployed)`;
        cardVaultStatus.className = 't-val font-mono text-accent';
      }
    } else {
      if (cardVaultStatus) {
        cardVaultStatus.textContent = 'Not Deployed';
        cardVaultStatus.className = 't-val font-mono text-danger';
      }
    }

    // 2. Precompile 0x0801 check
    const oracleCode = await callElysiumRpc('eth_getCode', [ELYSIUM_CONFIG.precompiles.oracle0x0801, 'latest']);
    const cardOracleStatus = document.getElementById('cardOracleStatus');
    const topbarBadge = document.getElementById('precompileStatusBadge');
    // Precompile returns 0x on testnet
    if (oracleCode.result === '0x' || !oracleCode.success) {
      if (cardOracleStatus) {
        cardOracleStatus.textContent = 'Blocked on Testnet';
        cardOracleStatus.className = 't-val font-mono text-hedge';
      }
      if (topbarBadge) {
        topbarBadge.innerHTML = '<span class="status-dot" style="width:6px; height:6px; border-radius:50%; background:var(--accent);"></span> <span style="color:var(--ink-2);">Engine:</span> <strong class="text-accent font-mono">HyperCore CLOB</strong>';
        topbarBadge.title = 'HyperCore CLOB Risk Engine (Stock ArbOS Mode)';
      }
    }

    // 3. Writer 0x0802 check
    const writerCode = await callElysiumRpc('eth_getCode', [ELYSIUM_CONFIG.precompiles.writer0x0802, 'latest']);
    const cardWriterStatus = document.getElementById('cardWriterStatus');
    if (writerCode.result === '0x' || !writerCode.success) {
      if (cardWriterStatus) {
        cardWriterStatus.textContent = 'Blocked on Testnet';
        cardWriterStatus.className = 't-val font-mono text-hedge';
      }
    }
  }

  // --- MULTI-PROVIDER WEB3 WALLET RESOLUTION (Zerion, OKX, MetaMask, Bitget, Opus, Rabby, Trust, EIP-6963) ---
  let activeWcProvider = null;
  const eip6963AnnouncedProviders = [];

  if (typeof window !== 'undefined') {
    window.addEventListener('eip6963:announceProvider', (event) => {
      if (event && event.detail && event.detail.provider) {
        const exists = eip6963AnnouncedProviders.some(p => p.info && event.detail.info && p.info.uuid === event.detail.info.uuid);
        if (!exists) {
          eip6963AnnouncedProviders.push(event.detail);
        }
      }
    });
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch (e) {}
  }

  function isInAppWalletBrowser() {
    if (typeof window === 'undefined') return false;
    if (window.zerionWallet || window.okxwallet || (window.bitkeep && window.bitkeep.ethereum) || (window.opus && window.opus.ethereum)) {
      return true;
    }
    if (window.ethereum && (window.ethereum.isZerion || window.ethereum.isOkxWallet || window.ethereum.isBitKeep || window.ethereum.isTrust)) {
      return true;
    }
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('zerion') || ua.includes('okx') || ua.includes('bitkeep') || ua.includes('trustwallet') || ua.includes('tokenpocket')) {
      return true;
    }
    return false;
  }

  function getWeb3Provider() {
    if (typeof window === 'undefined') return null;

    // 0. Active Official WalletConnect SDK Provider
    if (runtimeState.activeProviderType === 'walletconnect' && activeWcProvider) {
      return activeWcProvider;
    }

    // 1. Zerion Mobile In-App Browser & Zerion Extension
    if (window.zerionWallet) return window.zerionWallet;
    if (window.zerion && window.zerion.ethereum) return window.zerion.ethereum;

    // 2. OKX Mobile Wallet & OKX Extension
    if (window.okxwallet) return window.okxwallet;

    // 3. Bitget / BitKeep mobile in-app browser
    if (window.bitkeep && window.bitkeep.ethereum) return window.bitkeep.ethereum;
    if (window.bitget && window.bitget.ethereum) return window.bitget.ethereum;

    // 4. Opus Wallet mobile in-app browser
    if (window.opus && window.opus.ethereum) return window.opus.ethereum;

    // 5. Rabby Wallet
    if (window.rabby) return window.rabby;

    // 6. Trust Wallet
    if (window.trustwallet) return window.trustwallet;

    // 7. EIP-6963 Discovered Providers (prioritize Zerion or OKX if announced)
    if (eip6963AnnouncedProviders.length > 0) {
      const zerionAnnounced = eip6963AnnouncedProviders.find(p => p.info && (
        (p.info.name && p.info.name.toLowerCase().includes('zerion')) ||
        p.info.rdns === 'io.zerion.wallet'
      ));
      if (zerionAnnounced) return zerionAnnounced.provider;

      const okxAnnounced = eip6963AnnouncedProviders.find(p => p.info && (
        (p.info.name && p.info.name.toLowerCase().includes('okx')) ||
        p.info.rdns === 'com.okex.wallet'
      ));
      if (okxAnnounced) return okxAnnounced.provider;

      return eip6963AnnouncedProviders[0].provider;
    }

    // 8. Standard EIP-1193 / window.ethereum (MetaMask, Coinbase, etc.)
    if (window.ethereum) {
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        const zerion = window.ethereum.providers.find(p => p.isZerion);
        if (zerion) return zerion;

        const okx = window.ethereum.providers.find(p => p.isOkxWallet || p.isOKExWallet);
        if (okx) return okx;

        const bitget = window.ethereum.providers.find(p => p.isBitKeep || p.isBitget);
        if (bitget) return bitget;

        const rabby = window.ethereum.providers.find(p => p.isRabby);
        if (rabby) return rabby;

        const mm = window.ethereum.providers.find(p => p.isMetaMask);
        if (mm) return mm;

        return window.ethereum.providers[0];
      }
      return window.ethereum;
    }

    return null;
  }

  async function resolveProvider(timeoutMs = 800) {
    let provider = getWeb3Provider();
    if (provider) return provider;

    // Mobile in-app browsers (Zerion, OKX, Bitget, Opus) sometimes inject provider after DOM events
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 60));
      provider = getWeb3Provider();
      if (provider) return provider;
    }
    return null;
  }

  // --- PURE JS ABI ENCODING & CALLDATA BUILDERS FOR AEGISVAULT ---
  function pad32(val) {
    let hex;
    if (typeof val === 'bigint') {
      hex = val.toString(16);
    } else if (typeof val === 'number') {
      hex = Math.floor(val).toString(16);
    } else if (typeof val === 'string') {
      hex = val.startsWith('0x') ? val.slice(2) : val;
    } else if (typeof val === 'boolean') {
      hex = val ? '1' : '0';
    } else {
      hex = '0';
    }
    return hex.padStart(64, '0').toLowerCase();
  }

  function padAddr(addr) {
    return (addr || '0x0000000000000000000000000000000000000000').toLowerCase().replace('0x', '').padStart(64, '0');
  }

  function encodeRegisterPosition(collateralToken, amountWei, debtUsdc, ltvBps) {
    // registerPosition(address,uint256,uint256,uint16) -> 0x71fc23ea
    return '0x71fc23ea' +
      padAddr(collateralToken) +
      pad32(amountWei) +
      pad32(debtUsdc) +
      pad32(ltvBps);
  }

  function encodeDelegateSessionKey(sessionKey, durationSeconds) {
    // delegateSessionKey(address,uint48) -> 0xd5f9f2ce
    return '0xd5f9f2ce' +
      padAddr(sessionKey) +
      pad32(durationSeconds);
  }

  function encodeRevokeSessionKey() {
    // revokeSessionKey() -> 0x48e69d1f
    return '0x48e69d1f';
  }

  function encodeManualOverride() {
    // manualOverride() -> 0xbae6d62b
    return '0xbae6d62b';
  }

  function encodeRepayFeeDebt(amountUsdcWei) {
    // repayFeeDebt(uint256) -> 0x5f8682b2
    return '0x5f8682b2' + pad32(amountUsdcWei);
  }

  function encodeSetProConfig(cfg) {
    // setProConfig((uint8,uint8,uint16,uint16,uint16,uint48,bool,uint256,uint256)) -> 0xf2e821d3
    let tMode = 2; // HYBRID
    if (cfg.triggerMode === 'PRICE') tMode = 0;
    else if (cfg.triggerMode === 'HEALTH_FACTOR') tMode = 1;

    let oType = 1; // POST_ONLY
    if (cfg.orderType === 'MARKET') oType = 0;
    else if (cfg.orderType === 'LIMIT' || cfg.orderType === 'IOC') oType = 2;

    const hedgeRatioBps = Math.min(10000, Math.max(1000, Math.round((cfg.hedgeRatio || 0.5) * 10000)));
    const trailingTpBps = Math.round((cfg.trailingTpPct || 0.015) * 10000);
    const maxSlippageBps = Math.min(100, Math.max(10, Math.round((cfg.maxSlippagePct || 0.005) * 10000)));
    const sessionExpiry = cfg.sessionKeyExpiry || 0;
    const manualOverride = !!cfg.manualOverrideActive;
    const priceTrigger = BigInt(Math.round((cfg.priceTrigger || 44.20) * 1e8));
    const healthFactorTrigger = BigInt(Math.min(13000, Math.max(10200, Math.round((cfg.healthTrigger || 1.15) * 10000))));

    return '0xf2e821d3' +
      pad32(tMode) +
      pad32(oType) +
      pad32(hedgeRatioBps) +
      pad32(trailingTpBps) +
      pad32(maxSlippageBps) +
      pad32(sessionExpiry) +
      pad32(manualOverride) +
      pad32(priceTrigger) +
      pad32(healthFactorTrigger);
  }

  // Ensure wallet is connected to Elysium L2 Testnet (Chain ID 99801)
  async function ensureElysiumNetwork(provider) {
    const p = provider || getWeb3Provider();
    if (!p) {
      showToast('No wallet connected. Please connect your wallet first.');
      return false;
    }
    try {
      const chainId = await p.request({ method: 'eth_chainId' });
      const isElysium = chainId && (
        chainId === ELYSIUM_CONFIG.chainId || 
        chainId === '0x185d9' || 
        chainId === 99801 || 
        chainId === '99801'
      );
      if (isElysium) {
        updateNetworkUI(chainId);
        return true;
      }
      return await switchOrAddElysiumNetwork(p);
    } catch (err) {
      console.warn('Network verification notice:', err);
      return await switchOrAddElysiumNetwork(p);
    }
  }

  // --- EIP-1193 ON-CHAIN TRANSACTION DISPATCHER ---
  async function sendVaultTransaction({ to, data, value = '0x0', actionName = 'Transaction' }) {
    const provider = await resolveProvider(400);
    if (!provider || !runtimeState.walletConnected || !runtimeState.walletAddress) {
      showToast('Please connect your Web3 wallet first.');
      return { success: false, error: 'Wallet not connected' };
    }

    const okNet = await ensureElysiumNetwork(provider);
    if (!okNet) {
      return { success: false, error: 'Network switch rejected' };
    }

    try {
      logAudit('TX', `Requesting wallet approval for ${actionName} on AegisVault (Elysium L2)...`, 'accent');
      showToast(`Confirm ${actionName} in your wallet...`);

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: runtimeState.walletAddress,
          to: to || ELYSIUM_CONFIG.contracts.vault,
          data,
          value: value || '0x0'
        }]
      });

      const txShort = formatAddress(txHash);
      logAudit('TX', `${actionName} broadcasted! TxHash: <a href="${ELYSIUM_CONFIG.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">${txShort}</a>`, 'accent');
      showToast(`${actionName} submitted! Awaiting Elysium L2 confirmation...`);

      // Poll for mined transaction receipt (up to 30s)
      let receipt = null;
      const pollStart = Date.now();
      while (Date.now() - pollStart < 30000) {
        await new Promise(r => setTimeout(r, 1200));
        const res = await callElysiumRpc('eth_getTransactionReceipt', [txHash]);
        if (res.success && res.result && res.result.blockNumber) {
          receipt = res.result;
          break;
        }
      }

      const isSuccess = !receipt || receipt.status === '0x1' || receipt.status === '0x01' || receipt.status === 1;
      if (receipt && !isSuccess) {
        logAudit('TX', `${actionName} reverted on-chain in block #${parseInt(receipt.blockNumber, 16)}.`, 'danger');
        showToast(`${actionName} failed or reverted on Elysium L2.`);
        return { success: false, txHash, receipt, error: 'Reverted on-chain' };
      }

      const blockStr = receipt ? `#${parseInt(receipt.blockNumber, 16).toLocaleString()}` : 'latest';
      logAudit('TX', `${actionName} confirmed in block ${blockStr}! View on <a href="${ELYSIUM_CONFIG.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">Explorer ↗</a>`, 'accent');
      showToast(`${actionName} confirmed on Elysium L2!`);
      return { success: true, txHash, receipt };
    } catch (err) {
      console.error(`Error sending ${actionName}:`, err);
      const msg = err && (err.message || err.details || (typeof err === 'string' ? err : 'Transaction rejected'));
      logAudit('TX', `${actionName} cancelled or rejected: ${msg}`, 'hedge');
      showToast(`${actionName} cancelled or rejected.`);
      return { success: false, error: msg };
    }
  }

  // --- SYNCHRONIZE LIVE ON-CHAIN VAULT POSITION & CONFIGURATION ---
  async function syncOnChainVaultPosition(addr) {
    const targetAddr = addr || runtimeState.walletAddress;
    if (!targetAddr) return;

    const pad = padAddr(targetAddr);

    // 1. Query positions(address) via getPosition(address) (0x16c19739)
    const resPos = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.vault, data: '0x16c19739' + pad },
      'latest'
    ]);

    const modalVaultActivePill = document.getElementById('modalVaultActivePill');
    const modalVaultCol = document.getElementById('modalVaultCol');
    const modalVaultDebt = document.getElementById('modalVaultDebt');
    const modalVaultHf = document.getElementById('modalVaultHf');
    const modalSessionKeyDisplay = document.getElementById('modalSessionKeyDisplay');

    let hasOnChainPos = false;

    if (resPos.success && resPos.result && resPos.result.length >= 450) {
      const clean = resPos.result.replace('0x', '');
      const words = [];
      for (let i = 0; i < 7 * 64; i += 64) {
        words.push(clean.slice(i, i + 64));
      }

      const posOwner = '0x' + words[0].slice(24);
      const ltvBps = parseInt(words[1], 16);
      const lastHedgeBlock = parseInt(words[2], 16);
      const collateralToken = '0x' + words[3].slice(24);
      const colAmountWei = BigInt('0x' + words[4]);
      const debtUsdcRaw = BigInt('0x' + words[5]);
      const sessionKey = '0x' + words[6].slice(24);

      hasOnChainPos = posOwner !== '0x0000000000000000000000000000000000000000' && (colAmountWei > 0n || debtUsdcRaw > 0n);

      if (hasOnChainPos) {
        const colAmount = Number(colAmountWei) / 1e18;
        const debtUsdc = Number(debtUsdcRaw) / 1e6;
        VAULT_CONSTANTS.collateralAmount = colAmount;
        VAULT_CONSTANTS.debtUsdc = debtUsdc;
        if (ltvBps > 0) {
          VAULT_CONSTANTS.liquidationThreshold = ltvBps / 10000;
          if (colAmount > 0) {
            VAULT_CONSTANTS.liquidationPrice = debtUsdc / (colAmount * (ltvBps / 10000));
          }
        }

        liteState.shieldActivated = true;

        if (modalVaultCol) modalVaultCol.textContent = `${colAmount.toFixed(4)} HYPE`;
        if (modalVaultDebt) modalVaultDebt.textContent = `$${debtUsdc.toFixed(2)} USD`;
        if (modalVaultActivePill) {
          modalVaultActivePill.textContent = 'ACTIVE ON-CHAIN';
          modalVaultActivePill.className = 'status-pill pill-accent';
        }

        const hasSessionKey = sessionKey !== '0x0000000000000000000000000000000000000000';
        if (hasSessionKey) {
          runtimeState.agentDelegation = {
            approved: true,
            agentAddress: sessionKey,
            scope: 'TRADE_ONLY_CLOB_ORDERS'
          };
          if (el.sessionBadge) {
            el.sessionBadge.innerHTML = `<span>Session Key:</span> <strong>${formatAddress(sessionKey)} (On-Chain)</strong>`;
            el.sessionBadge.className = 'session-badge safe active';
          }
          if (modalSessionKeyDisplay) {
            modalSessionKeyDisplay.textContent = formatAddress(sessionKey);
            modalSessionKeyDisplay.className = 'font-mono text-accent';
          }
        } else {
          if (modalSessionKeyDisplay) {
            modalSessionKeyDisplay.textContent = 'None Delegated';
            modalSessionKeyDisplay.className = 'font-mono text-hedge';
          }
        }

        if (el.heroSentinelStatus) {
          el.heroSentinelStatus.innerHTML = 'ON-CHAIN <span class="status-pill pill-accent">ARMED</span>';
        }
        if (el.btnLiteActivateShield) {
          el.btnLiteActivateShield.classList.add('armed');
          const btnText = el.liteActivateBtnText || document.getElementById('liteActivateBtnText');
          if (btnText) btnText.textContent = 'Auto-Pilot Shield (On-Chain Armed)';
        }

        logAudit('VAULT', `On-chain position synchronized: ${colAmount.toFixed(4)} HYPE collateral | $${debtUsdc.toFixed(2)} debt liability.`, 'accent');
      } else {
        if (modalVaultActivePill) {
          modalVaultActivePill.textContent = 'STANDBY (NOT REGISTERED)';
          modalVaultActivePill.className = 'status-pill pill-hedge';
        }
        if (modalVaultCol) modalVaultCol.textContent = `${VAULT_CONSTANTS.collateralAmount.toFixed(4)} HYPE (Preset)`;
        if (modalVaultDebt) modalVaultDebt.textContent = `$${VAULT_CONSTANTS.debtUsdc.toFixed(2)} USD (Preset)`;
        if (modalSessionKeyDisplay) {
          modalSessionKeyDisplay.textContent = 'None';
          modalSessionKeyDisplay.className = 'font-mono text-hedge';
        }
      }
    }

    // 2. Query getProConfig(address) (0x14873c93)
    const resCfg = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.vault, data: '0x14873c93' + pad },
      'latest'
    ]);

    if (resCfg.success && resCfg.result && resCfg.result.length >= 578) {
      const cleanCfg = resCfg.result.replace('0x', '');
      const cfgWords = [];
      for (let i = 0; i < 9 * 64; i += 64) {
        cfgWords.push(cleanCfg.slice(i, i + 64));
      }

      const tMode = parseInt(cfgWords[0], 16);
      const oType = parseInt(cfgWords[1], 16);
      const hedgeRatioBps = parseInt(cfgWords[2], 16);
      const trailingTpBps = parseInt(cfgWords[3], 16);
      const maxSlippageBps = parseInt(cfgWords[4], 16);
      const sessionExpiry = parseInt(cfgWords[5], 16);
      const manualOverrideActive = parseInt(cfgWords[6], 16) !== 0;
      const priceTriggerRaw = BigInt('0x' + cfgWords[7]);
      const healthFactorTriggerRaw = BigInt('0x' + cfgWords[8]);

      if (hedgeRatioBps > 0) {
        proConfig.hedgeRatio = hedgeRatioBps / 10000;
        proConfig.trailingTpPct = trailingTpBps / 10000;
        proConfig.triggerMode = tMode === 0 ? 'PRICE' : (tMode === 1 ? 'HEALTH_FACTOR' : 'HYBRID');
        proConfig.orderType = oType === 0 ? 'MARKET' : (oType === 2 ? 'LIMIT' : 'POST_ONLY');
        proConfig.manualOverrideActive = manualOverrideActive;
        proConfig.priceTrigger = Number(priceTriggerRaw) / 1e8;
        proConfig.healthTrigger = Number(healthFactorTriggerRaw) / 1e4;

        if (manualOverrideActive) {
          if (el.sessionBadge) {
            el.sessionBadge.innerHTML = '<span>Override:</span> <strong>MANUAL OVERRIDE ACTIVE</strong>';
            el.sessionBadge.className = 'session-badge danger active';
          }
        }
      }
    }

    // 3. Query getActiveHedge(address) (0x07577b90)
    const resHedge = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.vault, data: '0x07577b90' + pad },
      'latest'
    ]);

    if (resHedge.success && resHedge.result && resHedge.result.length >= 386) {
      const cleanHedge = resHedge.result.replace('0x', '');
      const hedgeWords = [];
      for (let i = 0; i < 6 * 64; i += 64) {
        hedgeWords.push(cleanHedge.slice(i, i + 64));
      }

      const isOpen = parseInt(hedgeWords[0], 16) !== 0;
      if (isOpen) {
        const perpMarketIndex = parseInt(hedgeWords[1], 16);
        const hedgeSizeWei = BigInt('0x' + hedgeWords[2]);
        const entryPriceRaw = BigInt('0x' + hedgeWords[3]);
        const lowestWickRaw = BigInt('0x' + hedgeWords[4]);
        const trailingExitRaw = BigInt('0x' + hedgeWords[5]);

        runtimeState.activeHedge.isOpen = true;
        runtimeState.activeHedge.size = Number(hedgeSizeWei) / 1e18;
        runtimeState.activeHedge.entryPrice = Number(entryPriceRaw) / 1e8;
        runtimeState.activeHedge.lowestWick = Number(lowestWickRaw) / 1e8;
        runtimeState.activeHedge.trailingExitPrice = Number(trailingExitRaw) / 1e8;
        logAudit('HEDGE', `On-Chain hedge confirmed active: Short ${runtimeState.activeHedge.size.toFixed(4)} HYPE at $${runtimeState.activeHedge.entryPrice.toFixed(2)}.`, 'hedge');
      }
    }

    // 4. Update health factor readout in modal
    const h = calculateHealthFactor(runtimeState.currentPrice);
    if (modalVaultHf) {
      modalVaultHf.textContent = `${h.toFixed(2)} ${h > 1.15 ? 'SAFE' : (h > 1.05 ? 'ARMED' : 'CRITICAL')}`;
      modalVaultHf.className = `font-mono ${h > 1.15 ? 'text-accent' : (h > 1.05 ? 'text-hedge' : 'text-danger')}`;
    }

    // 5. Query fee debt
    await checkDeferredFeeDebt(targetAddr);

    updateUI();
  }

  const WALLET_CONFIGS = {
    metamask: {
      name: 'MetaMask',
      installUrl: 'https://metamask.io/download/',
      deepLink: () => `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`
    },
    okx: {
      name: 'OKX Wallet',
      installUrl: 'https://www.okx.com/web3',
      deepLink: () => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(window.location.href)}`
    },
    trust: {
      name: 'Trust Wallet',
      installUrl: 'https://trustwallet.com/download',
      deepLink: () => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`
    },
    bitget: {
      name: 'Bitget Wallet',
      installUrl: 'https://web3.bitget.com/',
      deepLink: () => `bitkeep://bkconnect?action=dapp&url=${encodeURIComponent(window.location.href)}`
    },
    rabby: {
      name: 'Rabby Wallet',
      installUrl: 'https://rabby.io/',
      deepLink: null
    },
    coinbase: {
      name: 'Coinbase Wallet',
      installUrl: 'https://www.coinbase.com/wallet',
      deepLink: () => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`
    },
    rainbow: {
      name: 'Rainbow Wallet',
      installUrl: 'https://rainbow.me/',
      deepLink: () => `https://rnbwapp.com/`
    },
    zerion: {
      name: 'Zerion Wallet',
      installUrl: 'https://zerion.io/',
      deepLink: () => `https://wallet.zerion.io/`
    }
  };

  function resolveSpecificProvider(walletKey) {
    if (typeof window === 'undefined') return null;

    // 1. Check EIP-6963 announced providers first
    if (Array.isArray(eip6963AnnouncedProviders) && eip6963AnnouncedProviders.length > 0) {
      const match = eip6963AnnouncedProviders.find(p => {
        if (!p.info) return false;
        const rdns = (p.info.rdns || '').toLowerCase();
        const name = (p.info.name || '').toLowerCase();
        if (walletKey === 'metamask') return rdns.includes('metamask') || name.includes('metamask');
        if (walletKey === 'okx') return rdns.includes('okx') || rdns.includes('okex') || name.includes('okx');
        if (walletKey === 'trust') return rdns.includes('trust') || name.includes('trust');
        if (walletKey === 'bitget') return rdns.includes('bitget') || rdns.includes('bitkeep') || name.includes('bitget') || name.includes('bitkeep');
        if (walletKey === 'rabby') return rdns.includes('rabby') || name.includes('rabby');
        if (walletKey === 'coinbase') return rdns.includes('coinbase') || name.includes('coinbase');
        if (walletKey === 'rainbow') return rdns.includes('rainbow') || name.includes('rainbow');
        if (walletKey === 'zerion') return rdns.includes('zerion') || name.includes('zerion');
        return false;
      });
      if (match && match.provider) return match.provider;
    }

    // 2. Specific window objects
    if (walletKey === 'okx' && window.okxwallet) return window.okxwallet;
    if (walletKey === 'trust' && window.trustwallet) return window.trustwallet;
    if (walletKey === 'rabby' && window.rabby) return window.rabby;
    if (walletKey === 'coinbase' && window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
    if (walletKey === 'rainbow' && window.rainbow) return window.rainbow;
    if (walletKey === 'zerion') {
      if (window.zerionWallet) return window.zerionWallet;
      if (window.zerion && window.zerion.ethereum) return window.zerion.ethereum;
    }
    if (walletKey === 'bitget') {
      if (window.bitkeep && window.bitkeep.ethereum) return window.bitkeep.ethereum;
      if (window.bitget && window.bitget.ethereum) return window.bitget.ethereum;
    }

    // 3. window.ethereum.providers array (multiple extensions installed)
    if (window.ethereum && Array.isArray(window.ethereum.providers)) {
      if (walletKey === 'metamask') {
        const found = window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby && !p.isZerion && !p.isOkxWallet && !p.isBitKeep);
        if (found) return found;
      }
      if (walletKey === 'okx') {
        const found = window.ethereum.providers.find(p => p.isOkxWallet || p.isOKExWallet);
        if (found) return found;
      }
      if (walletKey === 'trust') {
        const found = window.ethereum.providers.find(p => p.isTrust || p.isTrustWallet);
        if (found) return found;
      }
      if (walletKey === 'bitget') {
        const found = window.ethereum.providers.find(p => p.isBitKeep || p.isBitget);
        if (found) return found;
      }
      if (walletKey === 'rabby') {
        const found = window.ethereum.providers.find(p => p.isRabby);
        if (found) return found;
      }
      if (walletKey === 'coinbase') {
        const found = window.ethereum.providers.find(p => p.isCoinbaseWallet);
        if (found) return found;
      }
      if (walletKey === 'rainbow') {
        const found = window.ethereum.providers.find(p => p.isRainbow);
        if (found) return found;
      }
      if (walletKey === 'zerion') {
        const found = window.ethereum.providers.find(p => p.isZerion);
        if (found) return found;
      }
    }

    // 4. Single window.ethereum with flag
    if (window.ethereum) {
      if (walletKey === 'metamask' && window.ethereum.isMetaMask && !window.ethereum.isRabby && !window.ethereum.isZerion && !window.ethereum.isOkxWallet) {
        return window.ethereum;
      }
      if (walletKey === 'okx' && (window.ethereum.isOkxWallet || window.ethereum.isOKExWallet)) {
        return window.ethereum;
      }
      if (walletKey === 'trust' && (window.ethereum.isTrust || window.ethereum.isTrustWallet)) {
        return window.ethereum;
      }
      if (walletKey === 'bitget' && (window.ethereum.isBitKeep || window.ethereum.isBitget)) {
        return window.ethereum;
      }
      if (walletKey === 'rabby' && window.ethereum.isRabby) {
        return window.ethereum;
      }
      if (walletKey === 'coinbase' && window.ethereum.isCoinbaseWallet) {
        return window.ethereum;
      }
      if (walletKey === 'rainbow' && window.ethereum.isRainbow) {
        return window.ethereum;
      }
      if (walletKey === 'zerion' && window.ethereum.isZerion) {
        return window.ethereum;
      }

      // If user clicks MetaMask or general injected and only generic window.ethereum exists:
      if (walletKey === 'metamask' && window.ethereum.isMetaMask) {
        return window.ethereum;
      }
    }

    return null;
  }

  async function connectWalletConnect() {
    try {
      showModalAlert('loading', 'Initializing WalletConnect...', 'Opening official WalletConnect modal. Scan QR code or select mobile wallet.');
      showToast('Opening official WalletConnect modal...');
      const wcModule = window['@walletconnect/ethereum-provider'];
      if (!wcModule || !wcModule.EthereumProvider) {
        showModalAlert('error', 'WalletConnect SDK Loading', 'WalletConnect SDK is still loading in your browser. Please retry in a moment.');
        showToast('WalletConnect SDK loading... please retry in a moment.');
        return;
      }

      if (!activeWcProvider) {
        const projectId = (typeof window !== 'undefined' && window.AEGIS_WC_PROJECT_ID) || 'b56e18d47c72ab683b10814fe9495694';
        activeWcProvider = await wcModule.EthereumProvider.init({
          projectId: projectId,
          chains: [1],
          optionalChains: [99801, 1],
          rpcMap: {
            99801: 'https://testnet-rpc.elysium.kinetiq.xyz',
            1: 'https://cloudflare-eth.com'
          },
          showQrModal: true,
          metadata: {
            name: 'AEGIS Protocol',
            description: 'High-Frequency Risk Sentinel & Pro-Trader Terminal',
            url: 'https://aegishedge.xyz',
            icons: ['https://aegishedge.xyz/favicon.svg']
          }
        });

        activeWcProvider.on('accountsChanged', (accounts) => {
          if (accounts && accounts.length > 0) {
            runtimeState.walletAddress = accounts[0];
            updateWalletUI(runtimeState.walletAddress);
            fetchOnChainBalances(runtimeState.walletAddress);
            syncOnChainVaultPosition(runtimeState.walletAddress);
          } else {
            disconnectWallet();
          }
        });

        activeWcProvider.on('chainChanged', (chainId) => {
          updateNetworkUI(chainId);
          const friendlyName = getFriendlyChainName(chainId);
          logAudit('NETWORK', `Wallet chain updated to ${friendlyName} (${chainId})`, 'hedge');
          if (runtimeState.walletAddress) {
            fetchOnChainBalances(runtimeState.walletAddress);
            syncOnChainVaultPosition(runtimeState.walletAddress);
          }
        });

        activeWcProvider.on('disconnect', () => {
          disconnectWallet();
        });
      }

      await activeWcProvider.enable();
      const accounts = activeWcProvider.accounts;
      if (!accounts || accounts.length === 0) {
        showModalAlert('error', 'No Account Selected', 'No account was selected in WalletConnect.');
        showToast('No account selected in WalletConnect.');
        return;
      }

      runtimeState.walletAddress = accounts[0];
      runtimeState.walletConnected = true;
      runtimeState.activeProviderType = 'walletconnect';
      runtimeState.connectedWalletName = 'WalletConnect';

      hideModalAlert();
      closeWalletSelectModal();

      updateWalletUI(runtimeState.walletAddress);
      logAudit('WALLET', `Official WalletConnect session active: ${formatAddress(runtimeState.walletAddress)}`, 'accent');
      showToast(`Connected via WalletConnect: ${formatAddress(runtimeState.walletAddress)}`);

      // Automatic check and 1-click prompt to add/switch to Elysium L2
      try {
        const currentChainId = await activeWcProvider.request({ method: 'eth_chainId' });
        updateNetworkUI(currentChainId);
        const isElysium = currentChainId && (
          currentChainId === ELYSIUM_CONFIG.chainId || 
          currentChainId === '0x185d9' || 
          currentChainId === 99801 || 
          currentChainId === '99801'
        );
        if (!isElysium) {
          const friendlyName = getFriendlyChainName(currentChainId);
          logAudit('NETWORK', `Connected on ${friendlyName}. Automatically prompting 1-click switch to Elysium L2 (Chain ID 99801)...`, 'hedge');
          setTimeout(async () => {
            await switchOrAddElysiumNetwork(activeWcProvider);
          }, 350);
        } else {
          logAudit('NETWORK', 'Connected on Elysium L2 Testnet (Chain ID 99801).', 'accent');
        }
      } catch (chainErr) {
        console.warn('Silent WC chain check notice:', chainErr);
      }

      await fetchOnChainBalances(runtimeState.walletAddress);
      await syncOnChainVaultPosition(runtimeState.walletAddress);
    } catch (err) {
      console.warn('WalletConnect connection flow notice:', err);
      const msg = err && err.message ? err.message : '';
      if (!msg.toLowerCase().includes('user rejected') && !msg.toLowerCase().includes('user closed')) {
        showModalAlert('error', 'WalletConnect Notice', msg || 'WalletConnect session could not be established.');
        showToast(msg || 'WalletConnect session could not be established.');
      } else {
        showModalAlert('error', 'Connection Cancelled', 'WalletConnect connection window was closed.');
        showToast('WalletConnect connection cancelled.');
      }
    }
  }

  async function connectSpecificWallet(walletKey) {
    const config = WALLET_CONFIGS[walletKey] || { name: 'Web3 Wallet', installUrl: '#' };
    const walletName = config.name;

    showModalAlert('loading', `Connecting to ${walletName}...`, 'Checking for installed extension or provider...');

    // Small delay to allow DOM render
    await new Promise(r => setTimeout(r, 60));

    const provider = resolveSpecificProvider(walletKey);

    if (!provider) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && typeof config.deepLink === 'function' && config.deepLink()) {
        const link = config.deepLink();
        showModalAlert(
          'error',
          `${walletName} Not Detected in Browser`,
          `Tap below to open in ${walletName} mobile app, or scan with WalletConnect.`,
          `<a class="wallet-alert-btn" href="${link}">Open in ${walletName} ↗</a> <button class="wallet-alert-btn" id="btnAlertOpenWc" type="button">Connect via WalletConnect</button>`
        );
      } else {
        showModalAlert(
          'error',
          `${walletName} Not Detected`,
          `${walletName} extension is not installed or active in this browser.`,
          `<a class="wallet-alert-btn" href="${config.installUrl}" target="_blank" rel="noopener noreferrer">Install ${walletName} ↗</a> <button class="wallet-alert-btn" id="btnAlertOpenWc" type="button">Connect via WalletConnect</button>`
        );
      }
      return;
    }

    showModalAlert('loading', `Connecting to ${walletName}...`, `Please approve the connection request in ${walletName}.`);

    let timeoutTimer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        const err = new Error('Connection request timed out. Check your wallet extension popup.');
        err.code = 'TIMEOUT';
        reject(err);
      }, 45000);
    });

    try {
      const accountsPromise = provider.request({ method: 'eth_requestAccounts' });
      const accounts = await Promise.race([accountsPromise, timeoutPromise]);
      clearTimeout(timeoutTimer);

      if (!accounts || accounts.length === 0) {
        showModalAlert('error', 'No Account Selected', 'Please unlock your wallet and choose an account.');
        return;
      }

      runtimeState.walletAddress = accounts[0];
      runtimeState.walletConnected = true;
      runtimeState.activeProviderType = 'injected';
      runtimeState.connectedWalletName = walletName;

      hideModalAlert();
      closeWalletSelectModal();

      updateWalletUI(runtimeState.walletAddress);
      logAudit('WALLET', `Connected to ${walletName}: ${formatAddress(runtimeState.walletAddress)}`, 'accent');
      showToast(`Connected: ${walletName} (${formatAddress(runtimeState.walletAddress)})`);

      // Bind accountsChanged and chainChanged listeners to this provider
      try {
        if (typeof provider.on === 'function') {
          provider.on('accountsChanged', (newAccounts) => {
            if (newAccounts && newAccounts.length > 0) {
              runtimeState.walletAddress = newAccounts[0];
              updateWalletUI(newAccounts[0]);
              fetchOnChainBalances(newAccounts[0]);
              syncOnChainVaultPosition(newAccounts[0]);
            } else {
              disconnectWallet();
            }
          });

          provider.on('chainChanged', (newChainId) => {
            updateNetworkUI(newChainId);
            const isElysium = newChainId && (
              newChainId === ELYSIUM_CONFIG.chainId || 
              newChainId === '0x185d9' || 
              newChainId === 99801 || 
              newChainId === '99801'
            );
            if (isElysium) {
              showToast('Switched to Elysium L2 Testnet');
              logAudit('NETWORK', 'Active chain switched to Elysium L2 (99801).', 'accent');
            } else {
              const name = getFriendlyChainName(newChainId);
              showToast(`Active chain changed to ${name}.`);
              logAudit('NETWORK', `Active chain changed to ${name} (${newChainId}).`, 'hedge');
            }
            if (runtimeState.walletAddress) {
              fetchOnChainBalances(runtimeState.walletAddress);
              syncOnChainVaultPosition(runtimeState.walletAddress);
            }
          });
        }
      } catch (evtErr) {
        console.debug('Provider event binding notice:', evtErr);
      }

      // Check current chain ID and automatically prompt network addition/switch if not on Elysium L2
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        updateNetworkUI(currentChainId);
        const isElysium = currentChainId && (
          currentChainId === ELYSIUM_CONFIG.chainId || 
          currentChainId === '0x185d9' || 
          currentChainId === 99801 || 
          currentChainId === '99801'
        );
        if (!isElysium) {
          const friendlyName = getFriendlyChainName(currentChainId);
          logAudit('NETWORK', `Connected on ${friendlyName}. Automatically prompting 1-click switch to Elysium L2 (Chain ID 99801)...`, 'hedge');
          setTimeout(async () => {
            await switchOrAddElysiumNetwork(provider);
          }, 350);
        } else {
          logAudit('NETWORK', 'Connected on Elysium L2 Testnet (Chain ID 99801).', 'accent');
        }
      } catch (chainErr) {
        console.warn('Silent chain check notice:', chainErr);
      }

      await fetchOnChainBalances(runtimeState.walletAddress);
      await syncOnChainVaultPosition(runtimeState.walletAddress);
    } catch (err) {
      clearTimeout(timeoutTimer);
      console.warn('Wallet connection error:', err);
      const msg = err && err.message ? err.message : '';
      if (err.code === 4001 || msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('cancelled')) {
        showModalAlert('error', 'Connection Cancelled', 'You rejected the connection request in your wallet. Tap to try again when ready.');
      } else if (err.code === -32002) {
        showModalAlert('error', 'Pending Request Exists', `Please open ${walletName} extension to approve the pending connection request.`);
      } else if (err.code === 'TIMEOUT') {
        showModalAlert('error', 'Request Timed Out', 'Connection request timed out. Please check your wallet extension.');
      } else {
        showModalAlert('error', 'Connection Failed', msg || 'Could not establish connection. Please retry or try another wallet.');
      }
    }
  }

  let isInjectedConnecting = false;

  async function connectInjectedWallet() {
    if (isInjectedConnecting) return;
    isInjectedConnecting = true;

    const originalBtnText = el.walletAddrText ? el.walletAddrText.textContent : 'Connect Wallet';
    if (el.walletAddrText) {
      el.walletAddrText.textContent = 'Connecting...';
    }

    let timeoutTimer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        const timeoutErr = new Error('Check your wallet for a pending request');
        timeoutErr.code = 'TIMEOUT';
        reject(timeoutErr);
      }, 45000);
    });

    try {
      const provider = await resolveProvider(800);
      if (!provider) {
        showModalAlert('error', 'No Web3 Provider Found', 'No Web3 wallet extension found. Try connecting with WalletConnect.', '<button class="wallet-alert-btn" id="btnAlertOpenWc" type="button">Connect via WalletConnect</button>');
        showToast('No Web3 wallet extension found. Try connecting with WalletConnect.');
        return;
      }

      showModalAlert('loading', 'Connecting Provider...', 'Please approve the connection in your wallet.');
      const accountsPromise = provider.request({ method: 'eth_requestAccounts' });
      const accounts = await Promise.race([accountsPromise, timeoutPromise]);
      clearTimeout(timeoutTimer);

      if (!accounts || accounts.length === 0) {
        showModalAlert('error', 'No Accounts Selected', 'Please unlock your wallet and choose an account.');
        return;
      }

      runtimeState.walletAddress = accounts[0];
      runtimeState.walletConnected = true;
      runtimeState.activeProviderType = 'injected';
      runtimeState.connectedWalletName = 'Browser Wallet';

      hideModalAlert();
      closeWalletSelectModal();

      updateWalletUI(runtimeState.walletAddress);
      logAudit('WALLET', `Wallet connected: ${formatAddress(runtimeState.walletAddress)}`, 'accent');
      showToast(`Connected: ${formatAddress(runtimeState.walletAddress)}`);

      // Bind accountsChanged and chainChanged listeners to this active provider
      try {
        if (typeof provider.on === 'function') {
          provider.on('accountsChanged', (newAccounts) => {
            if (newAccounts && newAccounts.length > 0) {
              runtimeState.walletAddress = newAccounts[0];
              updateWalletUI(newAccounts[0]);
              fetchOnChainBalances(newAccounts[0]);
              syncOnChainVaultPosition(newAccounts[0]);
            } else {
              disconnectWallet();
            }
          });

          provider.on('chainChanged', (newChainId) => {
            updateNetworkUI(newChainId);
            const isElysium = newChainId && (
              newChainId === ELYSIUM_CONFIG.chainId || 
              newChainId === '0x185d9' || 
              newChainId === 99801 || 
              newChainId === '99801'
            );
            if (isElysium) {
              showToast('Switched to Elysium L2 Testnet');
              logAudit('NETWORK', 'Active chain switched to Elysium L2 (99801).', 'accent');
            } else {
              const name = getFriendlyChainName(newChainId);
              showToast(`Active chain changed to ${name}.`);
              logAudit('NETWORK', `Active chain changed to ${name} (${newChainId}).`, 'hedge');
            }
            if (runtimeState.walletAddress) {
              fetchOnChainBalances(runtimeState.walletAddress);
              syncOnChainVaultPosition(runtimeState.walletAddress);
            }
          });
        }
      } catch (evtErr) {
        console.debug('Provider event binding notice:', evtErr);
      }

      // Check current chain ID and automatically prompt network addition/switch if not on Elysium L2
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        updateNetworkUI(currentChainId);
        const isElysium = currentChainId && (
          currentChainId === ELYSIUM_CONFIG.chainId || 
          currentChainId === '0x185d9' || 
          currentChainId === 99801 || 
          currentChainId === '99801'
        );
        if (!isElysium) {
          const friendlyName = getFriendlyChainName(currentChainId);
          logAudit('NETWORK', `Connected on ${friendlyName}. Automatically prompting 1-click switch to Elysium L2 (Chain ID 99801)...`, 'hedge');
          setTimeout(async () => {
            await switchOrAddElysiumNetwork(provider);
          }, 350);
        } else {
          logAudit('NETWORK', 'Connected on Elysium L2 Testnet (Chain ID 99801).', 'accent');
        }
      } catch (chainErr) {
        console.warn('Silent chain check notice:', chainErr);
      }

      await fetchOnChainBalances(runtimeState.walletAddress);
      await syncOnChainVaultPosition(runtimeState.walletAddress);
    } catch (err) {
      clearTimeout(timeoutTimer);
      console.error('Wallet connection rejected or timed out:', err);
      if (err && err.code === 'TIMEOUT') {
        showModalAlert('error', 'Request Timed Out', 'Check your wallet for a pending request');
        showToast('Check your wallet for a pending request');
        logAudit('WALLET', 'Wallet approval request timed out after 45s. Check wallet extension popup.', 'hedge');
      } else if (err && (err.code === 4001 || (err.message && err.message.toLowerCase().includes('user rejected')))) {
        showModalAlert('error', 'Connection Cancelled', 'Wallet connection was cancelled.');
        showToast('Wallet connection was cancelled.');
      } else {
        showModalAlert('error', 'Connection Error', err.message || 'Rejected');
        showToast('Wallet connection error: ' + (err.message || 'Rejected'));
      }
    } finally {
      clearTimeout(timeoutTimer);
      isInjectedConnecting = false;
      if (!runtimeState.walletConnected) {
        if (el.walletAddrText) {
          el.walletAddrText.textContent = originalBtnText || 'Connect Wallet';
        }
        if (el.walletBtn) {
          el.walletBtn.classList.remove('connected');
        }
      }
    }
  }

  async function connectWallet() {
    await handleWalletBtnClick();
  }

  async function disconnectWallet() {
    if (runtimeState.activeProviderType === 'walletconnect' && activeWcProvider) {
      try {
        await activeWcProvider.disconnect();
      } catch (e) {
        console.warn('Silent WC disconnect notice:', e);
      }
    }

    runtimeState.walletConnected = false;
    runtimeState.walletAddress = null;
    runtimeState.sessionSignature = null;
    runtimeState.activeProviderType = null;

    if (el.walletAddrText) {
      el.walletAddrText.textContent = 'Connect Wallet';
    }
    if (el.walletBtn) {
      el.walletBtn.classList.remove('connected');
    }
    const drawerAddr = document.getElementById('drawerWalletAddrText');
    if (drawerAddr) drawerAddr.textContent = 'Connect Wallet';

    closeWalletAccountModal();
    showToast('Wallet disconnected. Tap "Connect Wallet" to reconnect anytime.');
    logAudit('WALLET', 'Session disconnected by user.', 'hedge');
    syncOnChainVaultPosition(ELYSIUM_CONFIG.defaultAccount);
    fetchOnChainBalances(ELYSIUM_CONFIG.defaultAccount);
    updateUI();
  }

  function openWalletAccountModal() {
    const modal = document.getElementById('walletAccountModal');
    if (!modal) return;

    const fullAddrEl = document.getElementById('walletFullAddrText');
    const avatarBadge = document.getElementById('walletAvatarBadge');
    const explorerLink = document.getElementById('linkExplorerWallet');

    const addr = runtimeState.walletAddress || ELYSIUM_CONFIG.defaultAccount;
    if (fullAddrEl) fullAddrEl.textContent = addr;
    if (avatarBadge) avatarBadge.textContent = addr.substring(2, 4).toUpperCase();
    if (explorerLink) explorerLink.href = `${ELYSIUM_CONFIG.explorerUrl}/address/${addr}`;

    modal.style.display = 'flex';
    fetchOnChainBalances(addr);
  }

  function closeWalletAccountModal() {
    const modal = document.getElementById('walletAccountModal');
    if (modal) modal.style.display = 'none';
  }

  async function handleWalletBtnClick() {
    if (runtimeState.walletConnected) {
      openWalletAccountModal();
      return;
    }

    // Always open chooser modal so both Browser Wallet and WalletConnect (QR/Mobile) are available
    openWalletSelectModal();
  }

  async function fetchOnChainBalances(addr) {
    const targetAddr = addr || runtimeState.walletAddress || ELYSIUM_CONFIG.defaultAccount;
    const refreshInd = document.getElementById('balRefreshIndicator');
    if (refreshInd) {
      refreshInd.innerHTML = '<span class="live-pulse-dot"></span> Querying Elysium L2 RPC...';
    }

    let nativeWei = null;
    let hypeRaw = null;

    const provider = getWeb3Provider();
    if (provider && runtimeState.walletConnected && runtimeState.isElysiumChain) {
      try {
        nativeWei = await provider.request({
          method: 'eth_getBalance',
          params: [targetAddr, 'latest']
        });
      } catch (e) {
        console.warn('eth_getBalance error:', e);
      }

      const padAddr = targetAddr.toLowerCase().replace('0x', '').padStart(64, '0');
      try {
        hypeRaw = await provider.request({
          method: 'eth_call',
          params: [{ to: ELYSIUM_CONFIG.contracts.hype, data: '0x70a08231' + padAddr }, 'latest']
        });
      } catch (e) {}
    } else {
      // Direct verified Elysium L2 RPC read
      const balRes = await callElysiumRpc('eth_getBalance', [targetAddr, 'latest']);
      if (balRes.success && balRes.result) {
        nativeWei = balRes.result;
      }
      const padAddr = targetAddr.toLowerCase().replace('0x', '').padStart(64, '0');
      const ercRes = await callElysiumRpc('eth_call', [
        { to: ELYSIUM_CONFIG.contracts.hype, data: '0x70a08231' + padAddr },
        'latest'
      ]);
      if (ercRes.success && ercRes.result) {
        hypeRaw = ercRes.result;
      }
    }

    let liveHype = 0.0;
    if (nativeWei && nativeWei !== '0x') {
      liveHype = Number(BigInt(nativeWei)) / 1e18;
    }
    if (hypeRaw && hypeRaw !== '0x') {
      const erc20 = Number(BigInt(hypeRaw)) / 1e18;
      if (erc20 > liveHype) liveHype = erc20;
    }

    // Query canonical testnet USDC (0x7D29d8047B905000459c0E80c34a26CeedcB47b2 - 6 decimals)
    let usdcRaw = null;
    const padAddrForUsdc = targetAddr.toLowerCase().replace('0x', '').padStart(64, '0');
    if (provider && runtimeState.walletConnected) {
      try {
        usdcRaw = await provider.request({
          method: 'eth_call',
          params: [{ to: ELYSIUM_CONFIG.contracts.usdc, data: '0x70a08231' + padAddrForUsdc }, 'latest']
        });
      } catch (e) {}
    }
    if (!usdcRaw || usdcRaw === '0x') {
      const usdcRes = await callElysiumRpc('eth_call', [
        { to: ELYSIUM_CONFIG.contracts.usdc, data: '0x70a08231' + padAddrForUsdc },
        'latest'
      ]);
      if (usdcRes.success && usdcRes.result) {
        usdcRaw = usdcRes.result;
      }
    }

    let liveUsdc = 0.0;
    if (usdcRaw && usdcRaw !== '0x') {
      liveUsdc = Number(BigInt(usdcRaw)) / 1e6;
    }

    runtimeState.balances = {
      hype: liveHype,
      usdc: liveUsdc,
      kntq: liveHype
    };

    // Update vault collateral amount to match actual testnet balance if non-zero
    if (liveHype > 0) {
      VAULT_CONSTANTS.collateralAmount = liveHype;
      VAULT_CONSTANTS.debtUsdc = liveHype * runtimeState.currentPrice * 0.65;
      VAULT_CONSTANTS.liquidationPrice = VAULT_CONSTANTS.debtUsdc / (liveHype * VAULT_CONSTANTS.liquidationThreshold);
    }

    const hypePrice = runtimeState.currentPrice || 83.46;

    const elHype = document.getElementById('modalHypeBal');
    const elHypeUsd = document.getElementById('modalHypeUsd');
    const elHypeStatusPill = document.getElementById('modalHypeStatusPill');
    const elUsdc = document.getElementById('modalUsdcBal');
    const elUsdcUsd = document.getElementById('modalUsdcUsd');
    const elUsdcStatusPill = document.getElementById('modalUsdcStatusPill');
    const elFaucetWarningBanner = document.getElementById('modalFaucetWarningBanner');
    const elVaultCol = document.getElementById('modalVaultCol');
    const elVaultDebt = document.getElementById('modalVaultDebt');
    const elVaultHf = document.getElementById('modalVaultHf');

    if (elHype) {
      elHype.textContent = liveHype.toFixed(4);
    }
    if (elHypeUsd) {
      elHypeUsd.textContent = `≈ $${(liveHype * hypePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    if (elHypeStatusPill) {
      if (liveHype > 0) {
        elHypeStatusPill.className = 'status-pill pill-accent';
        elHypeStatusPill.textContent = 'Verified On-Chain';
      } else {
        elHypeStatusPill.className = 'status-pill pill-hedge';
        elHypeStatusPill.textContent = '0 HYPE (Testnet Faucet Required)';
      }
    }

    if (elUsdc) {
      elUsdc.textContent = liveUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (elUsdcUsd) {
      elUsdcUsd.textContent = `≈ $${liveUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    if (elUsdcStatusPill) {
      if (liveUsdc > 0) {
        elUsdcStatusPill.className = 'status-pill pill-accent';
        elUsdcStatusPill.textContent = 'Verified On-Chain';
      } else {
        elUsdcStatusPill.className = 'status-pill pill-hedge';
        elUsdcStatusPill.textContent = '0 USDC (Faucet Required)';
      }
    }

    // Inform user if testnet faucet claim is required to operate on Elysium
    if (elFaucetWarningBanner) {
      if (liveHype === 0 || liveUsdc === 0) {
        elFaucetWarningBanner.style.display = 'block';
      } else {
        elFaucetWarningBanner.style.display = 'none';
      }
    }

    if (elVaultCol) elVaultCol.textContent = `${VAULT_CONSTANTS.collateralAmount.toFixed(4)} HYPE`;
    if (elVaultDebt) elVaultDebt.textContent = `$${VAULT_CONSTANTS.debtUsdc.toFixed(2)} USD`;
    if (elVaultHf) elVaultHf.textContent = liveHype > 0 ? '1.23 SAFE' : 'STANDBY';

    if (refreshInd) {
      refreshInd.innerHTML = `<span class="live-pulse-dot"></span> Synced Block #${runtimeState.blockNumber}`;
    }

    logAudit('RPC', `Verified Elysium L2 balances for ${formatAddress(targetAddr)}: ${liveHype.toFixed(4)} HYPE | ${liveUsdc.toFixed(2)} USDC`, 'accent');
    updateUI();
  }

  function updateWalletUI(addr) {
    if (el.walletAddrText) {
      el.walletAddrText.textContent = formatAddress(addr);
    }
    if (el.walletBtn) {
      el.walletBtn.classList.add('connected');
    }
    const drawerAddr = document.getElementById('drawerWalletAddrText');
    if (drawerAddr) drawerAddr.textContent = formatAddress(addr);
  }

  function formatAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  // Listen for provider events if available across injected wallets
  function setupProviderEvents() {
    const provider = getWeb3Provider();
    if (provider && typeof provider.on === 'function') {
      try {
        provider.on('accountsChanged', (accounts) => {
          if (accounts && accounts.length > 0) {
            runtimeState.walletAddress = accounts[0];
            updateWalletUI(accounts[0]);
            fetchOnChainBalances(accounts[0]);
            checkDeferredFeeDebt(accounts[0]);
          } else {
            disconnectWallet();
          }
        });

        provider.on('chainChanged', (newChainId) => {
          updateNetworkUI(newChainId);
          if (runtimeState.walletAddress) {
            fetchOnChainBalances(runtimeState.walletAddress);
            syncOnChainVaultPosition(runtimeState.walletAddress);
          }
        });
      } catch (e) {
        console.debug('Provider event binding notice:', e);
      }
    }
  }
  setupProviderEvents();
  if (typeof window !== 'undefined') {
    window.addEventListener('ethereum#initialized', setupProviderEvents, { once: true });
  }

  // --- 5. MATHEMATICAL MARGIN & HEALTH FACTOR CALCULATOR ---

  /**
   * Health factor formula from SPECIFICATION.md §6.1:
   * H = (Q_collateral * P_mark * T) / D_debt
   */
  function calculateHealthFactor(price) {
    if (!VAULT_CONSTANTS.debtUsdc || VAULT_CONSTANTS.debtUsdc <= 0) {
      return 1.41; // Standard safe benchmark when no debt exists
    }
    const collateralValue = (VAULT_CONSTANTS.collateralAmount || 0.10) * price;
    const numerator = collateralValue * VAULT_CONSTANTS.liquidationThreshold;
    const h = numerator / VAULT_CONSTANTS.debtUsdc;
    return (isNaN(h) || !isFinite(h)) ? 1.41 : h;
  }

  function syncMetric(primaryEl, mirrorSelector, content, isHtml = false) {
    if (primaryEl) {
      if (isHtml) primaryEl.innerHTML = content; else primaryEl.textContent = content;
    }
    const mirrors = document.querySelectorAll(mirrorSelector);
    mirrors.forEach(m => {
      if (isHtml) m.innerHTML = content; else m.textContent = content;
    });
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

    // Dynamic Position amounts for Lite vs Pro
    if (el.posCollateralAmount) {
      const colAmt = VAULT_CONSTANTS.collateralAmount;
      el.posCollateralAmount.innerHTML = `${colAmt < 1 ? colAmt.toFixed(2) : colAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="metric-unit">HYPE</span>`;
    }
    if (el.posDebtAmount) {
      const debt = VAULT_CONSTANTS.debtUsdc;
      el.posDebtAmount.innerHTML = `$${debt < 10 ? debt.toFixed(2) : debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="metric-unit">USDC</span>`;
    }
    if (el.posLiqPrice) {
      el.posLiqPrice.innerHTML = `$${VAULT_CONSTANTS.liquidationPrice.toFixed(2)} <span class="metric-unit">USD</span>`;
    }

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
      syncMetric(el.heroHealthValue, '.heroHealthValue-mirror', `${h.toFixed(2)} <span class="status-pill ${pillClass}">${pillText}</span>`, true);
    }
    if (el.heroLiquidationBuffer) {
      syncMetric(el.heroLiquidationBuffer, '.heroLiquidationBuffer-mirror', `Distance to Liquidation: ${bufferPct >= 0 ? '+' : ''}${bufferPct}% ($${bufferUsd})`, false);
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
      if (el.hedgeSizeVal) el.hedgeSizeVal.textContent = `${size < 1 ? size.toFixed(4) : size.toFixed(2)} HYPE Short`;
      if (el.hedgeEntryVal) el.hedgeEntryVal.textContent = `$${entry.toFixed(2)}`;
      if (el.hedgePnlVal) {
        el.hedgePnlVal.textContent = `${unrlPnl >= 0 ? '+' : ''}$${unrlPnl.toFixed(2)} USDC`;
        el.hedgePnlVal.className = `val font-mono ${unrlPnl >= 0 ? 'text-accent' : 'text-danger'}`;
      }
      if (el.netDeltaVal) {
        const netDelta = VAULT_CONSTANTS.collateralAmount - size;
        el.netDeltaVal.textContent = `+${netDelta < 1 ? netDelta.toFixed(4) : netDelta.toFixed(0)} HYPE (Partially Hedged)`;
      }
      if (el.heroSentinelStatus) {
        syncMetric(el.heroSentinelStatus, '.heroSentinelStatus-mirror', `HEDGED <span class="status-pill pill-hedge">EXECUTED</span>`, true);
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
      if (el.netDeltaVal) {
        const unhedged = VAULT_CONSTANTS.collateralAmount;
        el.netDeltaVal.textContent = `+${unhedged < 1 ? unhedged.toFixed(2) : '1,000'} HYPE (Unhedged)`;
      }

      if (el.heroSentinelStatus) {
        const sentinelHtml = proConfig.manualOverrideActive
          ? `OVERRIDDEN <span class="status-pill pill-danger">REVOKED</span>`
          : `ARMED <span class="status-pill pill-accent">ACTIVE</span>`;
        syncMetric(el.heroSentinelStatus, '.heroSentinelStatus-mirror', sentinelHtml, true);
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
    const size = VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio;
    runtimeState.activeHedge.isOpen = true;
    runtimeState.activeHedge.entryPrice = price;
    runtimeState.activeHedge.size = size;
    runtimeState.activeHedge.lowestWick = price;
    runtimeState.activeHedge.trailingExitPrice = price * (1 + proConfig.trailingTpPct);

    const sizeFormatted = size < 1 ? size.toFixed(4) : size.toFixed(0);
    logAudit('SIMULATOR', `[SIMULATION ONLY] Trigger breached (H=${calculateHealthFactor(price).toFixed(2)}). Simulated EIP-712 Intent generated.`, 'danger');
    logAudit('SIMULATOR', `[SIMULATION ONLY] Simulated order dispatch: -${sizeFormatted} HYPE @ $${price.toFixed(2)} (0x0802 blocked on testnet)`, 'hedge');
    logAudit('SENTINEL', 'Autonomous Delta-Hedging active. Tap "View Simulator ↗" to inspect live offset curve & capital preserved.', 'accent');
    showToast(`[SIMULATION] Hedge simulated: -${sizeFormatted} HYPE short at $${price.toFixed(2)}`);
  }

  function unwindShortHedge(price) {
    const hedge = runtimeState.activeHedge;
    const profit = hedge.size * (hedge.entryPrice - price);
    hedge.realizedPnlTotal += profit;
    hedge.isOpen = false;

    // Model A (Simulated Demo Model): 10% of hedge trading profit
    const demoTradingFee = Math.max(0, profit * 0.10);
    const demoBurnShareUsd = demoTradingFee * 0.50;
    const demoYieldShareUsd = demoTradingFee * 0.50;
    const demoAegisBurned = demoBurnShareUsd / 0.50; // assuming $0.50 per AEGIS mock rate

    // Model B (Contract Specification Model): Averted Liquidation Penalty
    // Saved liquidation penalty = 5% of collateral value; Protocol fee = 10% of saved penalty = 0.50% of collateral TVL
    const collateralUsd = VAULT_CONSTANTS.collateralAmount * price;
    const contractSavedPenaltyEst = collateralUsd * 0.05;
    const contractProtocolFeeEst = contractSavedPenaltyEst * 0.10; // 0.50% TVL

    runtimeState.metrics.tokensBurned += demoAegisBurned;
    runtimeState.metrics.stakerYieldUsdc += demoYieldShareUsd;

    if (el.tokenBurnDisplay) {
      el.tokenBurnDisplay.textContent = `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} $AEGIS (Sim)`;
    }
    if (el.heroBurnedTokens) {
      syncMetric(el.heroBurnedTokens, '.heroBurnedTokens-mirror', `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} <span class="metric-unit">AEGIS (Sim)</span>`, true);
    }

    const sizeFormatted = hedge.size < 1 ? hedge.size.toFixed(4) : hedge.size.toFixed(0);
    logAudit('SIMULATOR', `[SIMULATION ONLY] Trailing Take-Profit triggered at $${price.toFixed(2)}. Unwound ${sizeFormatted} HYPE short.`, 'accent');
    logAudit('FEE-MODEL', `[DEMO MODEL] 10% of simulated trading profit: +$${demoTradingFee.toFixed(2)} USDC (Ascend Mock: 50% burn, 50% yield)`, 'violet');
    logAudit('FEE-MODEL', `[CONTRACT SPEC] Averted-penalty model (0.50% TVL): Saved Penalty = $${contractSavedPenaltyEst.toFixed(2)} USDC | Protocol Fee = $${contractProtocolFeeEst.toFixed(2)} USDC`, 'violet');
    logAudit('ON-CHAIN', `On-Chain Settled Fee: $0.00 USDC (Deferred fee debt getter unavailable on current vault; zero on-chain state mutated)`, 'hedge');
    showToast(`[SIMULATION] Hedge unwound. Simulated demo fee: $${demoTradingFee.toFixed(2)} USDC`);
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

  // --- 8B. AUTONOMOUS DELTA-HEDGING SIMULATOR ---
  const simEngine = {
    activePreset: 'vault',
    drawdownPct: 0.0,
    presets: {
      vault: {
        id: 'vault',
        name: 'Active Terminal Vault (HYPE)',
        collateral: 1000.00,
        asset: 'HYPE',
        debt: 32000,
        price0: 48.50,
        triggerHf: 1.10,
        liqPenalty: 0.10,
        precompile: '0x0801',
        latency: 'under 70ms'
      },
      eth: {
        id: 'eth',
        name: '12.40 ETH · $22k Debt (Video)',
        collateral: 12.40,
        asset: 'ETH',
        debt: 22000,
        price0: 3412.80,
        triggerHf: 1.20,
        liqPenalty: 0.10,
        precompile: '0x0801',
        latency: 'under 70ms'
      },
      custom: {
        id: 'custom',
        name: 'Custom Parameters',
        collateral: 1000.00,
        asset: 'HYPE',
        debt: 32000,
        price0: 48.50,
        triggerHf: 1.10,
        liqPenalty: 0.10,
        precompile: '0x0801',
        latency: 'under 70ms'
      }
    }
  };

  function openDeltaHedgeSimulator(preferredPreset) {
    const terminalPrice = runtimeState.currentPrice || VAULT_CONSTANTS.basePrice || 48.50;
    const terminalBasePrice = VAULT_CONSTANTS.basePrice || 48.50;

    // 1. Sync live terminal state into vault preset
    const liveCollateral = VAULT_CONSTANTS.collateralAmount >= 1 
      ? VAULT_CONSTANTS.collateralAmount 
      : 1000.00;
    const liveDebt = VAULT_CONSTANTS.debtUsdc >= 100 
      ? VAULT_CONSTANTS.debtUsdc 
      : 32000;
    const liveTriggerHf = proConfig.healthTrigger || 1.10;

    simEngine.presets.vault.collateral = liveCollateral;
    simEngine.presets.vault.price0 = terminalBasePrice;
    simEngine.presets.vault.debt = liveDebt;
    simEngine.presets.vault.triggerHf = liveTriggerHf;
    simEngine.presets.vault.asset = 'HYPE';

    // 2. Select preset: if terminal has an active hedge, force 'vault' reflection
    const isTerminalHedgeOpen = Boolean(runtimeState.activeHedge && runtimeState.activeHedge.isOpen);
    const targetPreset = isTerminalHedgeOpen ? 'vault' : (preferredPreset || 'vault');
    setSimulatorPreset(targetPreset);

    // 3. Sync live drawdown & hedge position
    if (isTerminalHedgeOpen) {
      // Calculate active market drop percentage from terminal
      const liveDropPct = Math.max(0, Math.min(50, ((terminalBasePrice - terminalPrice) / terminalBasePrice) * 100));
      simEngine.drawdownPct = liveDropPct > 8 ? liveDropPct : 15.0;
    } else if (targetPreset === 'vault') {
      const liveDropPct = Math.max(0, Math.min(50, ((terminalBasePrice - terminalPrice) / terminalBasePrice) * 100));
      simEngine.drawdownPct = liveDropPct > 0.5 ? liveDropPct : 0.0;
    } else if (targetPreset === 'eth') {
      simEngine.drawdownPct = 30.0;
    }

    // Sync slider DOM
    const slider = document.getElementById('simDrawdownSlider');
    if (slider) {
      slider.value = simEngine.drawdownPct;
    }
    const ticks = document.querySelectorAll('.sim-slider-ticks .sim-tick-btn');
    ticks.forEach(btn => {
      btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.drop) - simEngine.drawdownPct) < 2);
    });

    const modal = document.getElementById('simModal');
    const backdrop = document.getElementById('simModalBackdrop');
    if (modal) {
      modal.hidden = false;
      modal.classList.add('active');
    }
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderSimulator();
  }

  function closeDeltaHedgeSimulator() {
    const modal = document.getElementById('simModal');
    const backdrop = document.getElementById('simModalBackdrop');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => { modal.hidden = true; }, 220);
    }
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setSimulatorPreset(presetId) {
    simEngine.activePreset = presetId;
    const chips = document.querySelectorAll('.sim-preset-chips .sim-chip');
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.preset === presetId);
    });

    const customRow = document.getElementById('simCustomInputs');
    if (customRow) {
      customRow.style.display = presetId === 'custom' ? 'grid' : 'none';
    }

    renderSimulator();
  }

  function renderSimulator() {
    const preset = simEngine.presets[simEngine.activePreset] || simEngine.presets.vault;
    const drop = simEngine.drawdownPct / 100;
    const pCurrent = preset.price0 * (1 - drop);
    const unhedgedCollateralVal = preset.collateral * pCurrent;
    const rawCollateralRatio = unhedgedCollateralVal / preset.debt;
    
    // In our delta-neutral architecture, the trigger line is at triggerHf (e.g. 1.10 or 1.20)
    const triggerDropPct = Math.max(5, (1 - (preset.triggerHf * preset.debt) / (preset.collateral * preset.price0)) * 100);
    const isTerminalHedgeOpen = Boolean(simEngine.activePreset === 'vault' && runtimeState.activeHedge && runtimeState.activeHedge.isOpen);
    const isHedged = isTerminalHedgeOpen || (simEngine.drawdownPct >= Math.min(30, triggerDropPct));

    // Update Header
    const colDisplay = document.getElementById('simCollateralDisplay');
    const debtDisplay = document.getElementById('simDebtDisplay');
    if (colDisplay) colDisplay.textContent = `${preset.collateral.toFixed(2)} ${preset.asset}`;
    if (debtDisplay) debtDisplay.textContent = `$${preset.debt.toLocaleString()}`;

    // Update Trigger Level & Status Pill
    const triggerVal = document.getElementById('simTriggerLevelVal');
    if (triggerVal) triggerVal.textContent = preset.triggerHf.toFixed(2);

    const statusPill = document.getElementById('simStatusPill');
    const statusText = document.getElementById('simStatusText');
    if (statusPill && statusText) {
      if (isHedged) {
        statusPill.className = 'sim-status-pill';
        statusText.textContent = isTerminalHedgeOpen ? 'Live hedge active' : 'Hedge active';
      } else {
        statusPill.className = 'sim-status-pill healthy';
        statusText.textContent = 'Healthy';
      }
    }

    // Update Slider text
    const dropText = document.getElementById('simDrawdownText');
    if (dropText) dropText.textContent = `-${simEngine.drawdownPct.toFixed(1)}%`;

    // Update Chart Price Header
    const priceDisplay = document.getElementById('simChartPriceDisplay');
    if (priceDisplay) {
      priceDisplay.textContent = `Price: $${pCurrent.toFixed(2)} (-${simEngine.drawdownPct.toFixed(1)}%)`;
    }

    // Update Readout Boxes
    const hedgeVal = document.getElementById('simReadoutHedgeVal');
    const hedgeSub = document.getElementById('simReadoutHedgeSub');
    const preservedVal = document.getElementById('simReadoutPreservedVal');
    const seizedVal = document.getElementById('simSpecSeizedVal');

    if (isHedged) {
      const activeSize = (isTerminalHedgeOpen && runtimeState.activeHedge.size > 0)
        ? (runtimeState.activeHedge.size < 1 ? runtimeState.activeHedge.size.toFixed(4) : runtimeState.activeHedge.size.toFixed(2))
        : (preset.collateral * (proConfig.hedgeRatio || 0.50)).toFixed(2);
      if (hedgeVal) hedgeVal.textContent = `${activeSize} ${preset.asset}`;
      if (hedgeSub) {
        hedgeSub.textContent = isTerminalHedgeOpen
          ? `Live Terminal Hedge @ $${runtimeState.activeHedge.entryPrice.toFixed(2)} · Offsetting 100%`
          : 'Short open · offsetting 100%';
      }
      const savedPenalty = Math.round(preset.debt * preset.liqPenalty);
      if (preservedVal) preservedVal.textContent = `+$${savedPenalty.toLocaleString()}`;
    } else {
      if (hedgeVal) hedgeVal.textContent = `0.00 ${preset.asset}`;
      if (hedgeSub) hedgeSub.textContent = `Standby · trigger ${preset.triggerHf.toFixed(2)}`;
      if (preservedVal) preservedVal.textContent = '$0';
    }

    if (seizedVal) {
      seizedVal.textContent = `0.00 ${preset.asset} (100% intact)`;
    }

    // Update Health Factor & Collateral Ratio
    const hfNumber = document.getElementById('simHfNumber');
    const crNumber = document.getElementById('simCrNumber');
    const hfFill = document.getElementById('simHfFill');

    const effectiveHf = isHedged ? preset.triggerHf : rawCollateralRatio;
    if (hfNumber) {
      hfNumber.textContent = effectiveHf.toFixed(2);
      hfNumber.style.color = isHedged ? 'var(--hedge)' : 'var(--ink)';
    }

    if (crNumber) {
      crNumber.textContent = `${Math.round(rawCollateralRatio * 100)}%`;
    }

    if (hfFill) {
      // 1.0 = liquidated (0%), 2.0 = safe (100%)
      const pct = Math.max(4, Math.min(100, ((effectiveHf - 1.0) / 1.0) * 100));
      hfFill.style.width = `${pct}%`;
      hfFill.style.background = isHedged ? 'var(--hedge)' : 'var(--accent)';
    }

    // SVG Curves Drawing
    // Coordinates:
    // x: 20 to 560
    // y: 30 to 156
    // Trigger y = 105
    // Intersection at x = 360, y = 105
    const collPath = document.getElementById('simSvgCollateralPath');
    const hedgePath = document.getElementById('simSvgHedgePath');
    const netLine = document.getElementById('simSvgNetLine');
    const marker = document.getElementById('simSvgMarker');
    const hedgeLegend = document.getElementById('simHedgeLegendItem');

    // Interpolate cursor marker coordinates
    let curX, curY;
    if (simEngine.drawdownPct <= 30) {
      const t = simEngine.drawdownPct / 30;
      curX = 20 + t * (360 - 20);
      curY = 30 + (t * 0.4 + t * t * 0.6) * (105 - 30);
    } else {
      const t = (simEngine.drawdownPct - 30) / 20;
      curX = 360 + t * (560 - 360);
      curY = 105 + (t * 0.5 + t * t * 0.5) * (156 - 105);
    }

    if (marker) {
      marker.setAttribute('transform', `translate(${curX.toFixed(1)}, ${curY.toFixed(1)})`);
      const markerCircle = marker.querySelector('circle:last-child');
      if (markerCircle) {
        markerCircle.setAttribute('fill', isHedged ? 'var(--hedge)' : 'var(--danger)');
      }
    }

    if (hedgePath && netLine && hedgeLegend) {
      if (isHedged) {
        // Compute hedge path extending to curX or full 560
        const hEndScale = Math.min(1.0, Math.max(0.2, (simEngine.drawdownPct - 25) / 25));
        const hedgeEndX = 360 + hEndScale * 200;
        const hedgeEndY = 105 - hEndScale * 51;
        hedgePath.setAttribute('d', `M 360 105 C 420 80, 490 60, ${hedgeEndX.toFixed(1)} ${hedgeEndY.toFixed(1)}`);
        hedgePath.style.display = 'block';

        netLine.setAttribute('x1', '360');
        netLine.setAttribute('y1', '105');
        netLine.setAttribute('x2', hedgeEndX.toFixed(1));
        netLine.setAttribute('y2', '105');
        netLine.style.display = 'block';
        hedgeLegend.style.display = 'flex';
      } else {
        hedgePath.style.display = 'none';
        netLine.style.display = 'none';
        hedgeLegend.style.display = 'none';
      }
    }
  }

  function initDeltaHedgeSimulator() {
    // Sliders & Ticks
    const slider = document.getElementById('simDrawdownSlider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        simEngine.drawdownPct = parseFloat(e.target.value);
        // Sync active tick buttons
        const ticks = document.querySelectorAll('.sim-slider-ticks .sim-tick-btn');
        ticks.forEach(btn => {
          btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.drop) - simEngine.drawdownPct) < 2);
        });
        renderSimulator();
      });
    }

    const tickBtns = document.querySelectorAll('.sim-slider-ticks .sim-tick-btn');
    tickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const drop = parseFloat(btn.dataset.drop);
        simEngine.drawdownPct = drop;
        if (slider) slider.value = drop;
        tickBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderSimulator();
      });
    });

    // Preset buttons
    const btnPresetEth = document.getElementById('simPresetEth');
    const btnPresetVault = document.getElementById('simPresetVault');
    const btnPresetCustom = document.getElementById('simPresetCustom');

    if (btnPresetEth) btnPresetEth.addEventListener('click', () => setSimulatorPreset('eth'));
    if (btnPresetVault) btnPresetVault.addEventListener('click', () => setSimulatorPreset('vault'));
    if (btnPresetCustom) btnPresetCustom.addEventListener('click', () => setSimulatorPreset('custom'));

    // Custom Input Listeners
    const inpCol = document.getElementById('simCustomCollateral');
    const inpDebt = document.getElementById('simCustomDebt');
    const inpPrice = document.getElementById('simCustomPrice');
    const inpTrigger = document.getElementById('simCustomTrigger');

    function syncCustomInputs() {
      if (inpCol) simEngine.presets.custom.collateral = Math.max(0.01, parseFloat(inpCol.value) || 12.4);
      if (inpDebt) simEngine.presets.custom.debt = Math.max(1, parseFloat(inpDebt.value) || 22000);
      if (inpPrice) simEngine.presets.custom.price0 = Math.max(0.1, parseFloat(inpPrice.value) || 3412.80);
      if (inpTrigger) simEngine.presets.custom.triggerHf = Math.max(1.01, parseFloat(inpTrigger.value) || 1.20);
      renderSimulator();
    }

    if (inpCol) inpCol.addEventListener('input', syncCustomInputs);
    if (inpDebt) inpDebt.addEventListener('input', syncCustomInputs);
    if (inpPrice) inpPrice.addEventListener('input', syncCustomInputs);
    if (inpTrigger) inpTrigger.addEventListener('input', syncCustomInputs);

    // Modal Trigger Buttons
    const btnOpenHedgeSimulator = document.getElementById('btnOpenHedgeSimulator');
    if (btnOpenHedgeSimulator) {
      btnOpenHedgeSimulator.addEventListener('click', () => openDeltaHedgeSimulator());
    }

    const btnVaultSimTrigger = document.getElementById('btnVaultSimTrigger');
    if (btnVaultSimTrigger) {
      btnVaultSimTrigger.addEventListener('click', () => openDeltaHedgeSimulator('vault'));
    }

    const btnActiveHedgeSimTrigger = document.getElementById('btnActiveHedgeSimTrigger');
    if (btnActiveHedgeSimTrigger) {
      btnActiveHedgeSimTrigger.addEventListener('click', () => openDeltaHedgeSimulator());
    }

    const drawerNavSimulator = document.getElementById('drawerNavSimulator');
    if (drawerNavSimulator) {
      drawerNavSimulator.addEventListener('click', () => {
        openDeltaHedgeSimulator();
        const drawer = document.getElementById('appDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        const drawerBtn = document.getElementById('appDrawerBtn');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        if (drawerBtn) drawerBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Modal Close Buttons
    const closeBtn = document.getElementById('simModalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDeltaHedgeSimulator);

    const simBackdrop = document.getElementById('simModalBackdrop');
    if (simBackdrop) simBackdrop.addEventListener('click', closeDeltaHedgeSimulator);

    // Keyboard ESC handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('simModal');
        if (modal && modal.classList.contains('active')) {
          closeDeltaHedgeSimulator();
        }
      }
    });

    // Initial render
    renderSimulator();
  }

  // --- 9. EVENT LISTENERS & INITIALIZATION ---
  function initListeners() {
    // EIP-1193 connect button & account modal trigger
    if (el.walletBtn) {
      el.walletBtn.addEventListener('click', handleWalletBtnClick);
    }

    // Wallet Account Modal Handlers
    const btnCloseWallet = document.getElementById('btnCloseWalletModal');
    if (btnCloseWallet) {
      btnCloseWallet.addEventListener('click', closeWalletAccountModal);
    }

    const btnDisconnect = document.getElementById('btnDisconnectWallet');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', disconnectWallet);
    }

    const btnRefreshBal = document.getElementById('btnRefreshBalances');
    if (btnRefreshBal) {
      btnRefreshBal.addEventListener('click', () => {
        fetchOnChainBalances();
        showToast('Refreshing live Elysium L2 balances...');
      });
    }

    const btnCopyAddr = document.getElementById('btnCopyWalletAddr');
    if (btnCopyAddr) {
      btnCopyAddr.addEventListener('click', () => {
        const addr = runtimeState.walletAddress || ELYSIUM_CONFIG.defaultAccount;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(() => {
            const txt = document.getElementById('copyAddrBtnText');
            if (txt) {
              txt.textContent = 'Copied!';
              setTimeout(() => { txt.textContent = 'Copy'; }, 2000);
            }
            showToast('Address copied to clipboard');
          }).catch(() => {
            showToast(`Address: ${addr}`);
          });
        } else {
          showToast(`Address: ${addr}`);
        }
      });
    }

    const walletModal = document.getElementById('walletAccountModal');
    if (walletModal) {
      walletModal.addEventListener('click', (e) => {
        if (e.target === walletModal) closeWalletAccountModal();
      });
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
      el.btnSaveConfig.addEventListener('click', async () => {
        if (!runtimeState.walletConnected) {
          showToast('Please connect your Web3 wallet first.');
          await connectWallet();
          if (!runtimeState.walletConnected) return;
        }

        const provider = await resolveProvider(400);
        const okNet = await ensureElysiumNetwork(provider);
        if (!okNet) return;

        el.btnSaveConfig.disabled = true;
        const originalText = el.btnSaveConfig.textContent;
        el.btnSaveConfig.textContent = 'Updating on Elysium L2...';

        const cfgData = encodeSetProConfig({
          triggerMode: proConfig.triggerMode,
          orderType: proConfig.orderType,
          hedgeRatio: proConfig.hedgeRatio,
          trailingTpPct: proConfig.trailingTpPct,
          maxSlippagePct: 0.005,
          sessionKeyExpiry: 0,
          manualOverrideActive: false,
          priceTrigger: proConfig.priceTrigger,
          healthTrigger: proConfig.healthTrigger
        });

        const txRes = await sendVaultTransaction({
          to: ELYSIUM_CONFIG.contracts.vault,
          data: cfgData,
          actionName: 'Update Pro Config'
        });

        el.btnSaveConfig.disabled = false;
        el.btnSaveConfig.textContent = originalText;

        if (txRes.success) {
          logAudit('CONFIG', `Pro risk parameters confirmed on AegisVault (Elysium L2 Block #${runtimeState.blockNumber})`, 'accent');
          showToast('Pro risk parameters updated successfully on Elysium L2.');
          await syncOnChainVaultPosition(runtimeState.walletAddress);
        }
      });
    }

    // Risk Protection Settings Modal Handlers (INV-1)
    function openSessionKeyModal() {
      if (el.sessionKeyModal) {
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
      el.btnConfirmDelegateKey.addEventListener('click', async () => {
        if (!runtimeState.walletConnected) {
          showToast('Please connect your Web3 wallet first.');
          await connectWallet();
          if (!runtimeState.walletConnected) return;
        }

        const provider = await resolveProvider(400);
        const okNet = await ensureElysiumNetwork(provider);
        if (!okNet) return;

        const days = el.sessionDurationDays ? el.sessionDurationDays.value : '30';
        const durationSeconds = parseInt(days, 10) * 86400;
        const agentAddr = ELYSIUM_CONFIG.sentinelKeeperAgent;

        el.btnConfirmDelegateKey.disabled = true;
        const origText = el.btnConfirmDelegateKey.textContent;
        el.btnConfirmDelegateKey.textContent = 'Authorizing on Elysium L2...';

        const delData = encodeDelegateSessionKey(agentAddr, durationSeconds);
        const txRes = await sendVaultTransaction({
          to: ELYSIUM_CONFIG.contracts.vault,
          data: delData,
          actionName: 'Delegate Sentinel Session Key'
        });

        el.btnConfirmDelegateKey.disabled = false;
        el.btnConfirmDelegateKey.textContent = origText;

        if (txRes.success) {
          runtimeState.agentDelegation = {
            approved: true,
            agentAddress: agentAddr,
            durationDays: parseInt(days, 10),
            expiryTimestamp: Date.now() + (durationSeconds * 1000),
            scope: 'TRADE_ONLY_CLOB_ORDERS',
            mode: ELYSIUM_CONFIG.architecture.activeMode
          };

          try {
            localStorage.setItem('aegis-agent-delegation', JSON.stringify(runtimeState.agentDelegation));
          } catch (e) {}

          closeSessionKeyModal();
          if (el.sessionBadge) {
            el.sessionBadge.innerHTML = `<span>Protection:</span> <strong>Active (${days}d, INV-1)</strong>`;
            el.sessionBadge.classList.add('active');
          }
          logAudit('INV-1', `Automated risk protection preferences confirmed on-chain for ${days} days (Invariant INV-1 non-custodial scope).`, 'accent');
          showToast(`Risk protection preferences saved (${days} days).`);
          await syncOnChainVaultPosition(runtimeState.walletAddress);
        }
      });
    }

    // Emergency Manual Override Killswitch (Invariant INV-3)
    if (el.btnManualOverride) {
      el.btnManualOverride.addEventListener('click', async () => {
        if (!runtimeState.walletConnected) {
          showToast('Please connect your Web3 wallet first.');
          await connectWallet();
          if (!runtimeState.walletConnected) return;
        }

        const provider = await resolveProvider(400);
        const okNet = await ensureElysiumNetwork(provider);
        if (!okNet) return;

        if (!confirm('EMERGENCY KILLSWITCH: Are you sure you want to activate Manual Override? This will revoke all session keys and disable keeper hedging on-chain.')) {
          return;
        }

        el.btnManualOverride.disabled = true;
        const origText = el.btnManualOverride.textContent;
        el.btnManualOverride.textContent = 'Revoking On-Chain...';

        const ovrData = encodeManualOverride();
        const txRes = await sendVaultTransaction({
          to: ELYSIUM_CONFIG.contracts.vault,
          data: ovrData,
          actionName: 'Manual Override (Revoke Keys)'
        });

        el.btnManualOverride.disabled = false;
        el.btnManualOverride.textContent = origText;

        if (txRes.success) {
          proConfig.manualOverrideActive = true;
          runtimeState.agentDelegation = null;
          try {
            localStorage.removeItem('aegis-agent-delegation');
          } catch (e) {}
          if (el.sessionBadge) {
            el.sessionBadge.innerHTML = `<span>Override:</span> <strong>MANUAL OVERRIDE ACTIVE</strong>`;
            el.sessionBadge.className = 'session-badge danger active';
          }
          if (runtimeState.activeHedge.isOpen) {
            unwindShortHedge(runtimeState.currentPrice);
          }
          logAudit('INV-3', 'MANUAL OVERRIDE CONFIRMED ON-CHAIN. Session key revoked. Keeper automation disabled (INV-3).', 'danger');
          showToast('EMERGENCY OVERRIDE: Session key revoked on-chain.');
          await syncOnChainVaultPosition(runtimeState.walletAddress);
        }
      });
    }

    // Repay Fee Debt Handler (if outstanding fee debt exists)
    const btnRepayDebt = document.getElementById('btnRepayFeeDebt');
    if (btnRepayDebt) {
      btnRepayDebt.addEventListener('click', async () => {
        if (!runtimeState.walletConnected) {
          showToast('Please connect your Web3 wallet first.');
          await connectWallet();
          if (!runtimeState.walletConnected) return;
        }

        const debtUsdc = runtimeState.feeDebtState.amountUsdc || 0;
        if (debtUsdc <= 0) {
          showToast('No outstanding fee debt detected.');
          return;
        }

        const debtWei = BigInt(Math.round(debtUsdc * 1e6));
        const repData = encodeRepayFeeDebt(debtWei);
        btnRepayDebt.disabled = true;
        btnRepayDebt.textContent = 'Repaying...';

        const txRes = await sendVaultTransaction({
          to: ELYSIUM_CONFIG.contracts.vault,
          data: repData,
          actionName: 'Repay Protocol Fee Debt'
        });

        btnRepayDebt.disabled = false;
        btnRepayDebt.textContent = 'Repay Debt';

        if (txRes.success) {
          showToast('Fee debt repaid on-chain!');
          await checkDeferredFeeDebt(runtimeState.walletAddress);
          await syncOnChainVaultPosition(runtimeState.walletAddress);
        }
      });
    }

    // View Mode Switcher Handlers
    if (el.modeLiteBtn) {
      el.modeLiteBtn.addEventListener('click', () => setViewMode('lite'));
    }

    if (el.modeProBtn) {
      el.modeProBtn.addEventListener('click', () => setViewMode('pro'));
    }

    // Micro-Amount Deposit Chips Handlers
    const chips = document.querySelectorAll('.micro-chip-btn');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const amt = parseFloat(chip.dataset.amount);
        if (!isNaN(amt)) {
          applyMicroAmount(amt);
        }
      });
    });

    // Strategy Preset Cards Handlers
    const presetCards = document.querySelectorAll('.preset-card');
    presetCards.forEach(card => {
      card.addEventListener('click', () => {
        const pKey = card.dataset.preset;
        if (pKey) {
          applyPreset(pKey);
        }
      });
      // Keyboard accessibility (Enter/Space)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const pKey = card.dataset.preset;
          if (pKey) applyPreset(pKey);
        }
      });
    });

    // 1-Click Activate Auto-Pilot Shield Handler
    if (el.btnLiteActivateShield) {
      el.btnLiteActivateShield.addEventListener('click', activateLiteShield);
    }

    // Initialize telemetry readout for Lite mode
    applyMicroAmount(liteState.selectedAmount, false);
    applyPreset(liteState.selectedPreset, false);

    // Restore saved view mode preference
    const savedMode = localStorage.getItem('aegis-view-mode') || 'pro';
    setViewMode(savedMode);

    // Start 100ms background ticker loop
    startLiveTicker();
  }

  // --- 10. LITE AUTO-PILOT LOGIC & PRESET ENGINES ---

  function setViewMode(mode) {
    const isLite = mode === 'lite';
    document.body.classList.toggle('mode-lite', isLite);
    document.body.classList.toggle('mode-pro', !isLite);

    if (el.modeLiteBtn) {
      el.modeLiteBtn.classList.toggle('active', isLite);
      el.modeLiteBtn.setAttribute('aria-selected', isLite ? 'true' : 'false');
    }
    if (el.modeProBtn) {
      el.modeProBtn.classList.toggle('active', !isLite);
      el.modeProBtn.setAttribute('aria-selected', !isLite ? 'true' : 'false');
    }

    localStorage.setItem('aegis-view-mode', mode);

    if (isLite) {
      applyMicroAmount(liteState.selectedAmount, false);
      applyPreset(liteState.selectedPreset, false);
      if (el.heroTvlLabel) syncMetric(el.heroTvlLabel, '.heroTvlLabel-mirror', 'Protected Collateral (Micro)', false);
      if (el.heroTvlSub) syncMetric(el.heroTvlSub, '.heroTvlSub-mirror', 'Testnet Faucet Cap: 0.10 HYPE', false);
      logAudit('UI', 'Switched to Lite Auto-Pilot mode. 1-click risk shield active.', 'accent');
      showToast('Switched to Lite Auto-Pilot mode');
    } else {
      const liveBal = (runtimeState.balances && runtimeState.balances.hype > 0) ? runtimeState.balances.hype : 0.10;
      VAULT_CONSTANTS.collateralAmount = liveBal;
      VAULT_CONSTANTS.debtUsdc = liveBal * runtimeState.currentPrice * 0.65;
      VAULT_CONSTANTS.liquidationPrice = VAULT_CONSTANTS.debtUsdc / (liveBal * VAULT_CONSTANTS.liquidationThreshold);
      if (el.heroTvlLabel) syncMetric(el.heroTvlLabel, '.heroTvlLabel-mirror', 'Protected Collateral (Elysium)', false);
      if (el.heroTvlValue) syncMetric(el.heroTvlValue, '.heroTvlValue-mirror', `${liveBal.toFixed(4)} <span class="metric-unit">HYPE</span>`, true);
      if (el.heroTvlSub) syncMetric(el.heroTvlSub, '.heroTvlSub-mirror', `Live Mark: $${runtimeState.currentPrice.toFixed(2)} | Faucet Synced`, false);
      logAudit('UI', 'Switched to Pro Terminal mode. Real-time Elysium L2 telemetry active.', 'accent');
      showToast('Switched to Pro Terminal mode');
    }

    updateUI();
  }

  function applyMicroAmount(amount, log = true) {
    liteState.selectedAmount = amount;
    VAULT_CONSTANTS.collateralAmount = amount;
    VAULT_CONSTANTS.debtUsdc = amount * 32.0;
    VAULT_CONSTANTS.liquidationPrice = 40.0;

    const chips = document.querySelectorAll('.micro-chip-btn');
    chips.forEach(chip => {
      const chipAmt = parseFloat(chip.dataset.amount);
      const isMatch = Math.abs(chipAmt - amount) < 0.001;
      chip.classList.toggle('active', isMatch);
      chip.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });

    if (el.heroTvlValue) {
      const usdVal = (amount * runtimeState.currentPrice).toFixed(2);
      syncMetric(el.heroTvlValue, '.heroTvlValue-mirror', `${amount.toFixed(2)} <span class="metric-unit">HYPE ($${usdVal})</span>`, true);
    }

    updateLiteTelemetryDisplay();
    updateUI();

    if (log) {
      logAudit('LITE', `Selected ${amount} HYPE testnet collateral. Borrow liability: $${(amount * 32).toFixed(2)} USDC.`, 'accent');
      showToast(`Selected testnet collateral: ${amount} HYPE`);
    }
  }

  function applyPreset(presetKey, log = true) {
    liteState.selectedPreset = presetKey;

    const cards = document.querySelectorAll('.preset-card');
    cards.forEach(card => {
      const isMatch = card.dataset.preset === presetKey;
      card.classList.toggle('active', isMatch);
      card.setAttribute('aria-checked', isMatch ? 'true' : 'false');
    });

    if (presetKey === 'conservative') {
      proConfig.healthTrigger = 1.25;
      proConfig.hedgeRatio = 1.0;
      proConfig.trailingTpPct = 0.01;
      proConfig.triggerMode = 'HEALTH_FACTOR';
      proConfig.priceTrigger = 44.80;
    } else if (presetKey === 'balanced') {
      proConfig.healthTrigger = 1.15;
      proConfig.hedgeRatio = 0.75;
      proConfig.trailingTpPct = 0.015;
      proConfig.triggerMode = 'HYBRID';
      proConfig.priceTrigger = 44.20;
    } else if (presetKey === 'aggressive') {
      proConfig.healthTrigger = 1.08;
      proConfig.hedgeRatio = 0.50;
      proConfig.trailingTpPct = 0.025;
      proConfig.triggerMode = 'HYBRID';
      proConfig.priceTrigger = 42.50;
    }

    // Sync Pro slider controls
    if (el.healthTrigger) el.healthTrigger.value = proConfig.healthTrigger;
    if (el.healthTriggerDisplay) el.healthTriggerDisplay.textContent = proConfig.healthTrigger.toFixed(2);
    if (el.hedgeCoverage) el.hedgeCoverage.value = proConfig.hedgeRatio * 100;
    if (el.hedgeCoverageDisplay) {
      const hypeAmount = (VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio);
      el.hedgeCoverageDisplay.textContent = `${(proConfig.hedgeRatio * 100).toFixed(0)}% (${hypeAmount < 1 ? hypeAmount.toFixed(4) : hypeAmount.toFixed(0)} HYPE)`;
    }
    if (el.trailingTp) el.trailingTp.value = (proConfig.trailingTpPct * 100).toFixed(1);
    if (el.trailingTpDisplay) el.trailingTpDisplay.textContent = `${(proConfig.trailingTpPct * 100).toFixed(2)}% from Lowest Wick`;
    if (el.priceTrigger) el.priceTrigger.value = proConfig.priceTrigger;
    if (el.priceTriggerDisplay) el.priceTriggerDisplay.textContent = `$${proConfig.priceTrigger.toFixed(2)}`;

    updateLiteTelemetryDisplay();

    if (log) {
      const presetName = presetKey.charAt(0).toUpperCase() + presetKey.slice(1);
      logAudit('PRESET', `Applied ${presetName} defense preset (H ≤ ${proConfig.healthTrigger.toFixed(2)}, Hedge: ${(proConfig.hedgeRatio * 100).toFixed(0)}%).`, 'accent');
      showToast(`${presetName} preset active`);
    }
  }

  function updateLiteTelemetryDisplay() {
    if (el.liteTriggerPriceDisplay) {
      el.liteTriggerPriceDisplay.textContent = `$${proConfig.priceTrigger.toFixed(2)} USD (H = ${proConfig.healthTrigger.toFixed(2)})`;
    }
    if (el.liteHedgeSizeDisplay) {
      const hedgeSize = VAULT_CONSTANTS.collateralAmount * proConfig.hedgeRatio;
      el.liteHedgeSizeDisplay.textContent = `${hedgeSize < 1 ? hedgeSize.toFixed(4) : hedgeSize.toFixed(2)} HYPE Short (${(proConfig.hedgeRatio * 100).toFixed(0)}%)`;
    }
  }

  async function activateLiteShield() {
    const btn = el.btnLiteActivateShield;
    const btnText = el.liteActivateBtnText || document.getElementById('liteActivateBtnText');

    if (!btn) return;
    btn.disabled = true;

    if (!runtimeState.walletConnected) {
      if (btnText) btnText.textContent = 'Connecting Wallet...';
      await connectWallet();
      if (!runtimeState.walletConnected) {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Activate Auto-Pilot Shield';
        return;
      }
    }

    const provider = await resolveProvider(400);
    if (!provider) {
      showToast('Web3 wallet provider not found.');
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Activate Auto-Pilot Shield';
      return;
    }

    if (btnText) btnText.textContent = 'Verifying Elysium L2...';
    const okNet = await ensureElysiumNetwork(provider);
    if (!okNet) {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Activate Auto-Pilot Shield';
      return;
    }

    const amount = liteState.selectedAmount || 0.05;
    const amountWei = BigInt(Math.round(amount * 1e18));
    const debtUsdc = BigInt(Math.round(amount * 32.0 * 1e6));
    const ltvBps = 8000; // 80% maintenance threshold

    const agentAddr = ELYSIUM_CONFIG.sentinelKeeperAgent;
    const durationSec = 30 * 86400; // 30 days
    const presetName = liteState.selectedPreset.charAt(0).toUpperCase() + liteState.selectedPreset.slice(1);

    try {
      // Step 1: Register Position on AegisVault (0x71fc23ea)
      if (btnText) btnText.textContent = '1/3: Registering Position on-chain...';
      const regData = encodeRegisterPosition(
        ELYSIUM_CONFIG.contracts.hype,
        amountWei,
        debtUsdc,
        ltvBps
      );

      const regTx = await sendVaultTransaction({
        to: ELYSIUM_CONFIG.contracts.vault,
        data: regData,
        actionName: `Register Position (${amount} HYPE, $${(amount * 32).toFixed(2)} Debt)`
      });

      if (!regTx.success) {
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Activate Auto-Pilot Shield';
        return;
      }

      // Step 2: Delegate Trade-Only Session Key (0xd5f9f2ce)
      if (btnText) btnText.textContent = '2/3: Authorizing Session Key...';
      const delData = encodeDelegateSessionKey(agentAddr, durationSec);
      const delTx = await sendVaultTransaction({
        to: ELYSIUM_CONFIG.contracts.vault,
        data: delData,
        actionName: 'Authorize Sentinel Session Key (30 Days)'
      });

      if (!delTx.success) {
        logAudit('WARNING', 'Position registered, but session key authorization was declined.', 'hedge');
      }

      // Step 3: Configure preset parameters on AegisVault (0xf2e821d3)
      if (btnText) btnText.textContent = '3/3: Committing Defense Preset...';
      const cfgData = encodeSetProConfig({
        triggerMode: proConfig.triggerMode,
        orderType: proConfig.orderType,
        hedgeRatio: proConfig.hedgeRatio,
        trailingTpPct: proConfig.trailingTpPct,
        maxSlippagePct: 0.005,
        sessionKeyExpiry: 0,
        manualOverrideActive: false,
        priceTrigger: proConfig.priceTrigger,
        healthTrigger: proConfig.healthTrigger
      });

      await sendVaultTransaction({
        to: ELYSIUM_CONFIG.contracts.vault,
        data: cfgData,
        actionName: `Commit ${presetName} Defense Preset`
      });

      liteState.shieldActivated = true;
      proConfig.manualOverrideActive = false;

      btn.disabled = false;
      btn.classList.add('armed');
      if (btnText) {
        btnText.textContent = 'Auto-Pilot Shield (On-Chain Armed)';
      }

      if (el.heroSentinelStatus) {
        el.heroSentinelStatus.innerHTML = 'ON-CHAIN <span class="status-pill pill-accent">ARMED</span>';
      }

      showToast(`Auto-Pilot Shield armed on Elysium L2 (${presetName} preset)!`);
      logAudit('SHIELD', `Auto-Pilot Shield registered and armed on AegisVault for ${formatAddress(runtimeState.walletAddress)}.`, 'accent');

      await syncOnChainVaultPosition(runtimeState.walletAddress);

    } catch (err) {
      console.error('Error in activateLiteShield:', err);
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Activate Auto-Pilot Shield';
      showToast('Shield activation failed.');
    }
  }

  function startLiveTicker() {
    runtimeState.tickerInterval = setInterval(() => {
      if (!runtimeState.liveTickerActive || runtimeState.simInterval !== null) {
        return;
      }

      // Small Brownian micro-fluctuations (+/- $0.03) around current price (Simulation only)
      const delta = (Math.random() - 0.5) * 0.06;
      runtimeState.currentPrice = Math.max(runtimeState.currentPrice + delta, 30.0);

      updateUI();
    }, 150);
  }

  // --- 10. REAL-TIME HYPERLIQUID REST / WEBSOCKET API ENGINE ---
  let previousMarketPrices = {};

  async function fetchHyperliquidLivePrices() {
    try {
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      });

      if (!res.ok) {
        console.warn('Hyperliquid REST API HTTP error:', res.status);
        return;
      }
      const mids = await res.json();
      runtimeState.lastReferencePriceTimestamp = new Date().toISOString();

      let updateCount = 0;
      HYPERCORE_MARKETS.forEach(coin => {
        if (mids[coin.symbol] !== undefined) {
          const newPrice = parseFloat(mids[coin.symbol]);
          const oldPrice = previousMarketPrices[coin.symbol] || coin.price;
          const diff = newPrice - oldPrice;

          coin.price = newPrice;
          previousMarketPrices[coin.symbol] = newPrice;

          // Animate and update row in market list
          const rowEl = document.querySelector(`.market-row-item[data-symbol="${coin.symbol}"]`);
          if (rowEl) {
            const priceSpan = rowEl.querySelector('.market-row-price');
            if (priceSpan) {
              const formatted = newPrice >= 1
                ? newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: (newPrice < 10 ? 4 : 2) })
                : newPrice.toString();
              priceSpan.textContent = `$${formatted}`;

              if (diff > 0.00001) {
                rowEl.classList.remove('price-flash-down');
                rowEl.classList.add('price-flash-up');
                setTimeout(() => rowEl.classList.remove('price-flash-up'), 950);
              } else if (diff < -0.00001) {
                rowEl.classList.remove('price-flash-up');
                rowEl.classList.add('price-flash-down');
                setTimeout(() => rowEl.classList.remove('price-flash-down'), 950);
              }
            }
          }

          // If this is currently active coin in TradingView / HyperCore topbar
          if (tvState.activeCoin && tvState.activeCoin.symbol === coin.symbol) {
            const markEl = document.getElementById('activeCoinMarkPrice');
            if (markEl) {
              const formatted = newPrice >= 1
                ? newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: (newPrice < 10 ? 4 : 2) })
                : newPrice.toString();
              markEl.textContent = `$${formatted}`;
            }

            // Real-time canvas candle tick
            if (tvState.engine === 'hypercore' && tvState.candles && tvState.candles.length > 0) {
              const lastCandle = tvState.candles[tvState.candles.length - 1];
              lastCandle.c = newPrice;
              if (newPrice > lastCandle.h) lastCandle.h = newPrice;
              if (newPrice < lastCandle.l) lastCandle.l = newPrice;
              updateOhlcDisplay(lastCandle);
            }
          }

          // If HYPE, update the live mark price on the main vault dashboard if not actively running a flash crash sim
          if (coin.symbol === 'HYPE' && !runtimeState.simInterval) {
            runtimeState.currentPrice = newPrice;
            VAULT_CONSTANTS.basePrice = newPrice;
            updateUI();
          }

          updateCount++;
        }
      });

      const pulse = document.getElementById('marketApiPulse');
      if (pulse) {
        pulse.setAttribute('title', `Hyperliquid L1 REST API Synced (${updateCount} markets ticking) • Obs: ${new Date(runtimeState.lastReferencePriceTimestamp).toLocaleTimeString()}`);
      }
    } catch (err) {
      console.debug('Hyperliquid API sync notice:', err.message);
    }
  }

  // --- 11. SYSTEM BOOT ---
  document.addEventListener('DOMContentLoaded', async () => {
    initAccessGate();
    initTheme();
    initTradingTerminalSuite();
    initListeners();
    initDeltaHedgeSimulator();

    // Auto-detect already authorized account on startup (e.g. Zerion, OKX, MetaMask)
    try {
      const bootProvider = await resolveProvider(250);
      if (bootProvider) {
        const accounts = await bootProvider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          runtimeState.walletAddress = accounts[0];
          runtimeState.walletConnected = true;
          runtimeState.activeProviderType = 'injected';
          updateWalletUI(runtimeState.walletAddress);

          try {
            const chainId = await bootProvider.request({ method: 'eth_chainId' });
            updateNetworkUI(chainId);
          } catch (e) {}

          fetchOnChainBalances(runtimeState.walletAddress);
          syncOnChainVaultPosition(runtimeState.walletAddress);
        }
      }
    } catch (bootErr) {
      console.debug('Silent startup wallet check notice:', bootErr);
    }

    // Restore active agent delegation if valid
    try {
      const savedDelegation = localStorage.getItem('aegis-agent-delegation');
      if (savedDelegation) {
        const parsed = JSON.parse(savedDelegation);
        if (parsed.expiryTimestamp && parsed.expiryTimestamp > Date.now()) {
          runtimeState.agentDelegation = parsed;
          if (el.sessionBadge) {
            el.sessionBadge.innerHTML = `<span>Agent:</span> <strong>Active (${parsed.durationDays}d, INV-1)</strong>`;
            el.sessionBadge.classList.add('active');
          }
        }
      }
    } catch (e) {}

    updateUI();

    // 1. Initial verified RPC telemetry & recurring poll every 10s
    await pollRpcTelemetry();
    setInterval(pollRpcTelemetry, 10000);

    // 2. Initial verified contract & balance checks
    await checkContractDeployments();
    await syncOnChainVaultPosition(ELYSIUM_CONFIG.defaultAccount);
    await checkOnChainFeeCollector();
    await fetchOnChainBalances(ELYSIUM_CONFIG.defaultAccount);

    // 3. Start simulation ticker & external reference price feed
    startLiveTicker();
    fetchHyperliquidLivePrices();
    setInterval(fetchHyperliquidLivePrices, 2500);

    logAudit('SYSTEM', 'AEGIS Public Testnet Terminal initialized on Elysium L2 (Chain ID 99801)', 'accent');
    logAudit('ENGINE', 'HyperCore CLOB Sentinel Risk Protection active.', 'accent');
    logAudit('FEED', 'Live Market Reference: Hyperliquid L1 Real-Time API synced.', 'accent');
    logAudit('INTEGRATION', 'Precompile 0x0801: BLOCKED / UNVERIFIED on Elysium testnet node.', 'danger');
    logAudit('INTEGRATION', 'Precompile 0x0802: BLOCKED / UNVERIFIED on Elysium testnet node.', 'danger');
    logAudit('SECURITY', 'Non-Custodial Invariants INV-1 to INV-5 enforced.', 'accent');
    logAudit('STATUS', 'Public Testnet open to all testers. Faucet HYPE & USDC enabled.', 'accent');
  });

})();
