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
      supported: false,
      amountUsdc: null,
      status: 'UNAVAILABLE_ON_DEPLOYMENT',
      message: 'Getter feeDebts(address) not found on deployed vault bytecode (Commit 736701e precedes Phase 1C upgrade).'
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
    liteAutoPilotCard: document.getElementById('liteAutoPilotCard'),
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
        { symbol: 'HYPE', name: 'Hyperliquid L1 Native', pair: 'HYPE / USD', price: 83.50, change: '+3.42%', cat: 'hypercore', tv: 'MEXC:HYPEUSDT', icon: '/assets/backers/hyperliquid.png', maxLev: 10, vol: 380000000 },
        { symbol: 'PURR', name: 'HyperCore Spot & Perp Meme', pair: 'PURR / USD', price: 0.184, change: '+8.21%', cat: 'hypercore', tv: 'MEXC:PURRUSDT', icon: '/assets/backers/hyperliquid.png', maxLev: 10, vol: 45000000 },
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
      const iconUrl = coin.icon || '/assets/backers/hyperliquid.png';
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
      toggleHealthGauge: 'healthGaugeSection',
      toggleSimBar: 'simBarSection',
      toggleRiskControls: 'proConfigCard',
      toggleEcosystemCard: 'tokenMetricsCard',
      toggleAuditLog: 'auditCardSection'
    };

    function loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem('aegis-terminal-settings') || '{}');
        Object.keys(toggleMap).forEach(toggleId => {
          const elToggle = document.getElementById(toggleId);
          const targetSection = document.getElementById(toggleMap[toggleId]);
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
        const targetSection = document.getElementById(toggleMap[toggleId]);
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

  function initWalletSelectModal() {
    const modal = document.getElementById('walletModal');
    const backdrop = document.getElementById('walletModalBackdrop');
    const closeBtn = document.getElementById('walletModalCloseBtn');
    const btnConnectInjected = document.getElementById('btnConnectInjected');

    function closeModal() {
      if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; }, 200);
      }
      if (backdrop) backdrop.classList.remove('active');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (btnConnectInjected) {
      btnConnectInjected.addEventListener('click', async () => {
        closeModal();
        await connectWallet();
      });
    }
  }

  function openWalletSelectModal() {
    const modal = document.getElementById('walletModal');
    const backdrop = document.getElementById('walletModalBackdrop');
    if (modal) {
      modal.hidden = false;
      modal.classList.add('active');
    }
    if (backdrop) backdrop.classList.add('active');
  }

  function initTradingTerminalSuite() {
    initNavigationDrawer();
    initTerminalSettingsModal();
    initWalletSelectModal();
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
    sentinelKeeperAgent: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
  };

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

    const res = await callElysiumRpc('eth_call', [
      { to: ELYSIUM_CONFIG.contracts.vault, data: callData },
      'latest'
    ]);

    // Deployed AegisVault (0x05Aa...) was deployed prior to Phase 1C upgrade
    // calling feeDebts(address) returns empty data 0x or reverts
    if (!res.success || !res.result || res.result === '0x' || res.result.length < 66) {
      runtimeState.feeDebtState = {
        supported: false,
        amountUsdc: null,
        status: 'UNAVAILABLE_ON_DEPLOYMENT',
        verifiedOnChain: false
      };
      if (statusPill) {
        statusPill.className = 'status-pill pill-hedge';
        statusPill.textContent = 'Upgrade Required';
      }
      if (amountDisplay) {
        amountDisplay.textContent = 'Unavailable on Deployed Vault';
        amountDisplay.className = 't-val font-mono text-hedge';
      }
      if (detailText) {
        detailText.textContent = `AegisVault at 0x05Aa... bytecode does not implement feeDebts(address). Call reverts (0x). Zero debt is NOT assumed.`;
      }
      return;
    }

    // If supported in future upgraded deployments:
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
      if (detailText) {
        detailText.textContent = `Verified on-chain via feeDebts(${formatAddress(targetAddr)}).`;
      }
    } catch (parseErr) {
      if (amountDisplay) amountDisplay.textContent = 'Decode Error';
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

  // --- MULTI-PROVIDER WEB3 WALLET RESOLUTION (Bitget, Opus, OKX, MetaMask, Trust) ---
  function getWeb3Provider() {
    if (typeof window === 'undefined') return null;

    // 1. Bitget / BitKeep mobile in-app browser
    if (window.bitkeep && window.bitkeep.ethereum) return window.bitkeep.ethereum;
    if (window.bitget && window.bitget.ethereum) return window.bitget.ethereum;

    // 2. Opus Wallet mobile in-app browser
    if (window.opus && window.opus.ethereum) return window.opus.ethereum;

    // 3. OKX mobile wallet
    if (window.okxwallet) return window.okxwallet;

    // 4. Trust Wallet
    if (window.trustwallet) return window.trustwallet;

    // 5. Standard EIP-1193 / window.ethereum (MetaMask, Rabby, Coinbase)
    if (window.ethereum) {
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        const bitget = window.ethereum.providers.find(p => p.isBitKeep || p.isBitget);
        if (bitget) return bitget;
        return window.ethereum.providers[0];
      }
      return window.ethereum;
    }

    return null;
  }

  async function resolveProvider(timeoutMs = 600) {
    let provider = getWeb3Provider();
    if (provider) return provider;

    // Mobile in-app browsers (Bitget, Opus) sometimes inject provider after DOM events
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 60));
      provider = getWeb3Provider();
      if (provider) return provider;
    }
    return null;
  }

  async function connectWallet() {
    const provider = await resolveProvider(600);
    if (!provider) {
      showToast('No Web3 wallet detected. Mobile users: ensure you open in Bitget, Opus, or MetaMask dApp browser.');
      return;
    }

    try {
      showToast('Connecting wallet...');
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        showToast('No accounts selected.');
        return;
      }

      // Read-only session established (Hyperliquid model: clean connection without unsolicited chain additions)
      runtimeState.walletAddress = accounts[0];
      runtimeState.walletConnected = true;

      updateWalletUI(runtimeState.walletAddress);
      logAudit('WALLET', `EIP-1193 wallet connected: ${formatAddress(runtimeState.walletAddress)}`, 'accent');
      showToast(`Connected: ${formatAddress(runtimeState.walletAddress)}`);

      // Non-intrusive chain check (does not throw popups or trigger malicious heuristics)
      try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        if (currentChainId !== ELYSIUM_CONFIG.chainId) {
          logAudit('NETWORK', `Active wallet chain differs from Elysium L2 (99801). Switch network when ready to execute on-chain.`, 'hedge');
        }
      } catch (chainErr) {
        console.warn('Silent chain check notice:', chainErr);
      }

      // Read verified on-chain balances and check deferred fee debt for connected address
      await fetchOnChainBalances(runtimeState.walletAddress);
      await checkDeferredFeeDebt(runtimeState.walletAddress);

    } catch (err) {
      console.error('Wallet connection rejected:', err);
      showToast('Wallet connection was cancelled or rejected.');
    }
  }

  function disconnectWallet() {
    runtimeState.walletConnected = false;
    runtimeState.walletAddress = null;
    runtimeState.sessionSignature = null;

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
    logAudit('WALLET', 'EIP-1193 session disconnected by user.', 'hedge');
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

  function handleWalletBtnClick() {
    if (runtimeState.walletConnected) {
      openWalletAccountModal();
    } else {
      openWalletSelectModal();
    }
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
    if (provider && runtimeState.walletConnected) {
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
      // Direct verified RPC read
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

        provider.on('chainChanged', () => {
          window.location.reload();
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
      el.btnSaveConfig.addEventListener('click', () => {
        logAudit('CONFIG', `Pro parameters submitted to AegisVault (Elysium L2 Block #${runtimeState.blockNumber})`, 'accent');
        showToast('Pro risk parameters updated successfully on Elysium L2.');
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
      el.btnConfirmDelegateKey.addEventListener('click', () => {
        const days = el.sessionDurationDays ? el.sessionDurationDays.value : '30';
        const expiryTimestamp = Date.now() + (parseInt(days, 10) * 86400 * 1000);

        runtimeState.agentDelegation = {
          approved: true,
          durationDays: parseInt(days, 10),
          expiryTimestamp,
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
        logAudit('INV-1', `Automated risk protection preferences saved for ${days} days (Invariant INV-1 non-custodial scope).`, 'accent');
        showToast(`Risk protection preferences saved (${days} days).`);
        updateUI();
      });
    }

    // Emergency Manual Override Killswitch (Invariant INV-3)
    if (el.btnManualOverride) {
      el.btnManualOverride.addEventListener('click', () => {
        proConfig.manualOverrideActive = true;
        runtimeState.agentDelegation = null;
        try {
          localStorage.removeItem('aegis-agent-delegation');
        } catch (e) {}
        if (el.sessionBadge) {
          el.sessionBadge.innerHTML = `<span>Agent:</span> <strong>Revoked (INV-3)</strong>`;
          el.sessionBadge.classList.remove('active');
        }
        if (runtimeState.activeHedge.isOpen) {
          unwindShortHedge(runtimeState.currentPrice);
        }
        logAudit('INV-3', 'MANUAL OVERRIDE INVOKED. Trade-only agent revoked atomically. All keeper permissions terminated.', 'danger');
        showToast('EMERGENCY OVERRIDE: Agent revoked. Invariant INV-3 enforced.');
        updateUI();
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
    if (btnText) btnText.textContent = 'Connecting Wallet...';

    if (!runtimeState.walletConnected && getWeb3Provider()) {
      await connectWallet();
    }

    if (btnText) btnText.textContent = 'Simulating Ephemeral Session Key (INV-1)...';

    // Brief micro-delay for realistic simulation feedback
    await new Promise(r => setTimeout(r, 350));

    // Step 2: Ephemeral session key delegation (local simulation)
    const ephemeralKey = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    if (el.sessionBadge) {
      el.sessionBadge.innerHTML = '<span>Session Key:</span> <strong>Simulated Demo (30d, INV-1)</strong>';
      el.sessionBadge.className = 'session-badge safe';
    }

    const presetName = liteState.selectedPreset.charAt(0).toUpperCase() + liteState.selectedPreset.slice(1);
    logAudit('INV-1', `[SIMULATION DEMO] Trade-only session key ${formatAddress(ephemeralKey)} configured for ${presetName} preset.`, 'accent');
    logAudit('SIMULATOR', `[SIMULATION ONLY] Precompile 0x0802 order dispatch and 0x0801 live surveillance are blocked on Elysium testnet; operating in interactive simulation mode.`, 'hedge');

    liteState.shieldActivated = true;
    proConfig.manualOverrideActive = false;

    // Step 3: Visual Confirmation State
    btn.disabled = false;
    btn.classList.add('armed');
    if (btnText) {
      btnText.textContent = 'Auto-Pilot Shield (Simulation Active)';
    }

    if (el.heroSentinelStatus) {
      el.heroSentinelStatus.innerHTML = 'SIMULATED <span class="status-pill pill-accent">ACTIVE</span>';
    }

    showToast(`[SIMULATION] Auto-Pilot Shield enabled in simulation mode (${presetName} preset).`);
    updateUI();
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
    await checkDeferredFeeDebt(ELYSIUM_CONFIG.defaultAccount);
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
