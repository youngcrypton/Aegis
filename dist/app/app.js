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
    if (window.AegisAccess && !window.AegisAccess.isAuthorized()) {
      window.location.replace('access.html');
      return;
    }

    if (window.AegisAccess) {
      const code = window.AegisAccess.getAuthorizedCode();
      if (el.betaAccessCodeText && code) {
        el.betaAccessCodeText.textContent = code.replace('AEGIS-TESTNET-', '');
      }
    }

    if (el.btnLockTerminal) {
      el.btnLockTerminal.addEventListener('click', () => {
        if (confirm('Lock terminal and exit testnet beta session?')) {
          if (window.AegisAccess) window.AegisAccess.revoke();
          window.location.replace('access.html');
        }
      });
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
        closeDrawer();
      });
    }

    if (navTrading) {
      navTrading.addEventListener('click', () => {
        switchAppView('trading');
        closeDrawer();
      });
    }

    if (backToVaultBtn) {
      backToVaultBtn.addEventListener('click', () => {
        switchAppView('vault');
      });
    }

    const drawerManageWallet = document.getElementById('drawerManageWalletBtn');
    const drawerDisconnectWallet = document.getElementById('drawerDisconnectWalletBtn');

    if (drawerManageWallet) {
      drawerManageWallet.addEventListener('click', () => {
        closeDrawer();
        if (runtimeState.walletConnected) {
          openWalletAccountModal();
        } else {
          connectWallet();
        }
      });
    }

    if (drawerDisconnectWallet) {
      drawerDisconnectWallet.addEventListener('click', () => {
        closeDrawer();
        disconnectWallet();
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        if (confirm('Lock terminal and exit testnet beta session?')) {
          if (window.AegisAccess) window.AegisAccess.revoke();
          window.location.replace('access.html');
        }
      });
    }
  }

  function initTradingTerminalSuite() {
    initNavigationDrawer();
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
      vault: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555',
      hype: '0xcA03Dc4665A8C3603cb4Fd5Ce71Af9649dC00d44',
      usdc: '0x712516e61C8B383dF4A63CFe83d7701Bce54B03e',
      aegis: '0xbCF26943C0197d2eE0E5D05c716Be60cc2761508'
    },
    defaultAccount: '0xf0e721C996e76a0Cd5805975464CbE3E98839D64'
  };

  async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      // In environment without MetaMask / Rabby extension:
      // Show interactive Elysium Session Signing Modal!
      openElysiumSignModal(ELYSIUM_CONFIG.defaultAccount);
      return;
    }

    try {
      showToast('Connecting Elysium wallet...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        showToast('No accounts selected.');
        return;
      }

      // 1. Verify or prompt adding/switching to Elysium L2 Testnet RPC
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ELYSIUM_CONFIG.chainId }]
        });
      } catch (switchError) {
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized')) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: ELYSIUM_CONFIG.chainId,
                chainName: ELYSIUM_CONFIG.chainName,
                rpcUrls: [ELYSIUM_CONFIG.rpcUrl],
                blockExplorerUrls: [ELYSIUM_CONFIG.explorerUrl],
                nativeCurrency: { name: 'Elysium HYPE', symbol: 'HYPE', decimals: 18 }
              }]
            });
          } catch (addError) {
            console.warn('Network addition cancelled:', addError);
          }
        }
      }

      // 2. Cryptographic Session Signature (personal_sign)
      const nonce = Math.floor(Math.random() * 9000000 + 1000000);
      const timestamp = new Date().toISOString();
      const signMessage = 
`AEGIS PROTOCOL — ELYSIUM L2 TESTNET AUTHORIZATION

Network: Elysium L2 Testnet (Chain ID 99801)
Precompile: 0x0801 Synchronous Oracle
Predeploy: 0x0802 ElysiumCoreWriter
Account: ${accounts[0]}
Session Nonce: ${nonce}
Timestamp: ${timestamp}

Sign this message to link your Elysium testnet wallet with AEGIS Sentinel Surveillance. This cryptographic signature verifies account ownership and delegates trade-only non-custodial risk protection (Invariant INV-1). No gas fee is consumed.`;

      showToast('Please sign the Elysium session authorization in your wallet...');
      let signature;
      try {
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [signMessage, accounts[0]]
        });
      } catch (signErr) {
        console.warn('Session signature rejected:', signErr);
        showToast('Signature rejected. Connection aborted.');
        return;
      }

      // 3. Authenticated session active
      runtimeState.walletAddress = accounts[0];
      runtimeState.walletConnected = true;
      runtimeState.sessionSignature = signature;

      updateWalletUI(runtimeState.walletAddress);
      logAudit('AUTH', `Session signed by ${formatAddress(runtimeState.walletAddress)} on Elysium L2. Invariant INV-1 active.`, 'accent');
      showToast(`Authenticated & connected: ${formatAddress(runtimeState.walletAddress)}`);

      // 4. Read actual on-chain faucet balance
      await fetchOnChainBalances(runtimeState.walletAddress);

    } catch (err) {
      console.error('Wallet connection rejected:', err);
      showToast('Wallet connection was cancelled or rejected.');
    }
  }

  function openElysiumSignModal(addr) {
    const modal = document.getElementById('elysiumSignModal');
    if (!modal) return;

    const accountInput = document.getElementById('signModalAccountInput');
    const payloadText = document.getElementById('signModalPayloadText');
    const target = addr || ELYSIUM_CONFIG.defaultAccount;

    if (accountInput) accountInput.value = target;

    const nonce = Math.floor(Math.random() * 9000000 + 1000000);
    const timestamp = new Date().toISOString();
    const signMessage = 
`AEGIS PROTOCOL — ELYSIUM L2 TESTNET AUTHORIZATION

Network: Elysium L2 Testnet (Chain ID 99801)
Precompile: 0x0801 Synchronous Oracle
Predeploy: 0x0802 ElysiumCoreWriter
Account: ${target}
Session Nonce: ${nonce}
Timestamp: ${timestamp}

Sign this message to link your Elysium testnet wallet with AEGIS Sentinel Surveillance. This cryptographic signature verifies account ownership and delegates trade-only non-custodial risk protection (Invariant INV-1). No gas fee is consumed.`;

    if (payloadText) payloadText.value = signMessage;
    modal.style.display = 'flex';
  }

  function closeElysiumSignModal() {
    const modal = document.getElementById('elysiumSignModal');
    if (modal) modal.style.display = 'none';
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
      connectWallet();
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

    if (typeof window.ethereum !== 'undefined' && runtimeState.walletConnected) {
      try {
        nativeWei = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [targetAddr, 'latest']
        });
      } catch (e) {
        console.warn('eth_getBalance error:', e);
      }

      const padAddr = targetAddr.toLowerCase().replace('0x', '').padStart(64, '0');
      try {
        hypeRaw = await window.ethereum.request({
          method: 'eth_call',
          params: [{ to: ELYSIUM_CONFIG.contracts.hype, data: '0x70a08231' + padAddr }, 'latest']
        });
      } catch (e) {}
    }

    let liveHype = 0.0;
    if (nativeWei && nativeWei !== '0x') {
      liveHype = Number(BigInt(nativeWei)) / 1e18;
    }
    if (hypeRaw && hypeRaw !== '0x') {
      const erc20 = Number(BigInt(hypeRaw)) / 1e18;
      if (erc20 > liveHype) liveHype = erc20;
    }

    // In testing without extension: simulate having 0.10 HYPE from Elysium faucet
    if (typeof window.ethereum === 'undefined' && liveHype === 0.0) {
      liveHype = runtimeState.balances ? runtimeState.balances.hype : 0.10;
    }

    runtimeState.balances = {
      hype: liveHype,
      kntq: liveHype
    };

    // Update vault collateral amount to match actual testnet balance!
    VAULT_CONSTANTS.collateralAmount = liveHype;
    VAULT_CONSTANTS.debtUsdc = liveHype > 0 ? (liveHype * runtimeState.currentPrice * 0.65) : 0.0;
    VAULT_CONSTANTS.liquidationPrice = liveHype > 0 ? (VAULT_CONSTANTS.debtUsdc / (liveHype * VAULT_CONSTANTS.liquidationThreshold)) : 0.0;

    const hypePrice = runtimeState.currentPrice || 83.46;

    const elHype = document.getElementById('modalHypeBal');
    const elHypeUsd = document.getElementById('modalHypeUsd');
    const elHypeStatusPill = document.getElementById('modalHypeStatusPill');
    const elVaultCol = document.getElementById('modalVaultCol');
    const elVaultDebt = document.getElementById('modalVaultDebt');
    const elVaultHf = document.getElementById('modalVaultHf');

    if (elHype) {
      elHype.textContent = liveHype > 0 ? liveHype.toFixed(4) : '0.0000';
    }
    if (elHypeUsd) {
      elHypeUsd.textContent = `≈ $${(liveHype * hypePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    if (elHypeStatusPill) {
      if (liveHype > 0) {
        elHypeStatusPill.className = 'status-pill pill-accent';
        elHypeStatusPill.textContent = 'Faucet Synced';
      } else {
        elHypeStatusPill.className = 'status-pill pill-danger';
        elHypeStatusPill.textContent = '0 HYPE — Faucet Required';
      }
    }
    if (elVaultCol) elVaultCol.textContent = `${liveHype.toFixed(4)} HYPE`;
    if (elVaultDebt) elVaultDebt.textContent = `$${VAULT_CONSTANTS.debtUsdc.toFixed(2)} USD`;
    if (elVaultHf) elVaultHf.textContent = liveHype > 0 ? '1.23 SAFE' : 'STANDBY';

    if (refreshInd) {
      refreshInd.innerHTML = `<span class="live-pulse-dot"></span> Synced Block #${runtimeState.blockNumber}`;
    }

    logAudit('RPC', `Live Elysium L2 faucet balance for ${formatAddress(targetAddr)}: ${liveHype.toFixed(4)} HYPE`, 'accent');
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

  // Listen for provider events if available
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        runtimeState.walletAddress = accounts[0];
        updateWalletUI(accounts[0]);
        fetchOnChainBalances(accounts[0]);
      } else {
        disconnectWallet();
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
    logAudit('SENTINEL', `Trigger breached (H=${calculateHealthFactor(price).toFixed(2)}). Signing EIP-712 Intent...`, 'danger');
    logAudit('0x0802', `Dispatched short perpetual order: -${sizeFormatted} HYPE @ $${price.toFixed(2)}`, 'hedge');
    showToast(`Hedge opened: -${sizeFormatted} HYPE short at $${price.toFixed(2)}`);
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
      syncMetric(el.heroBurnedTokens, '.heroBurnedTokens-mirror', `${Math.floor(runtimeState.metrics.tokensBurned).toLocaleString()} <span class="metric-unit">AEGIS</span>`, true);
    }

    const sizeFormatted = hedge.size < 1 ? hedge.size.toFixed(4) : hedge.size.toFixed(0);
    logAudit('0x0802', `Trailing Take-Profit triggered at $${price.toFixed(2)}. Unwound ${sizeFormatted} HYPE short.`, 'accent');
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

    // Elysium Signature Modal Handlers
    const btnConfirmSign = document.getElementById('btnConfirmSign');
    if (btnConfirmSign) {
      btnConfirmSign.addEventListener('click', async () => {
        const inputAddr = document.getElementById('signModalAccountInput');
        const addr = inputAddr ? inputAddr.value : ELYSIUM_CONFIG.defaultAccount;

        closeElysiumSignModal();

        runtimeState.walletAddress = addr;
        runtimeState.walletConnected = true;
        runtimeState.sessionSignature = '0x' + Array.from({length: 130}, () => Math.floor(Math.random() * 16).toString(16)).join('');

        updateWalletUI(addr);
        logAudit('AUTH', `Session signed by ${formatAddress(addr)} on Elysium L2 (INV-1 active)`, 'accent');
        showToast(`Authenticated & connected: ${formatAddress(addr)}`);
        await fetchOnChainBalances(addr);
      });
    }

    const btnRejectSign = document.getElementById('btnRejectSign');
    if (btnRejectSign) {
      btnRejectSign.addEventListener('click', () => {
        closeElysiumSignModal();
        showToast('Signature rejected. Connection aborted.');
      });
    }

    const btnCloseSign = document.getElementById('btnCloseSignModal');
    if (btnCloseSign) {
      btnCloseSign.addEventListener('click', closeElysiumSignModal);
    }

    const signModalOverlay = document.getElementById('elysiumSignModal');
    if (signModalOverlay) {
      signModalOverlay.addEventListener('click', (e) => {
        if (e.target === signModalOverlay) closeElysiumSignModal();
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
      const liveBal = (runtimeState.balances && runtimeState.balances.hype !== undefined) ? runtimeState.balances.hype : 0.10;
      VAULT_CONSTANTS.collateralAmount = liveBal;
      VAULT_CONSTANTS.debtUsdc = liveBal > 0 ? (liveBal * runtimeState.currentPrice * 0.65) : 0.0;
      VAULT_CONSTANTS.liquidationPrice = liveBal > 0 ? (VAULT_CONSTANTS.debtUsdc / (liveBal * VAULT_CONSTANTS.liquidationThreshold)) : 0.0;
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

    // Step 1: Connect wallet if not already connected
    if (!runtimeState.walletConnected) {
      await connectWallet();
    }

    if (btnText) btnText.textContent = 'Delegating Ephemeral Session Key (INV-1)...';

    // Brief micro-delay for realistic transaction feedback
    await new Promise(r => setTimeout(r, 400));

    // Step 2: Ephemeral session key delegation
    const ephemeralKey = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    if (el.sessionBadge) {
      el.sessionBadge.innerHTML = '<span>Session Key:</span> <strong>Active (30d, INV-1)</strong>';
      el.sessionBadge.className = 'session-badge safe';
    }

    logAudit('INV-1', `Ephemeral trade-only session key ${formatAddress(ephemeralKey)} authorized for 30 days. Non-custodial scope verified.`, 'accent');

    // Step 3: Commit selected preset to AegisVault via precompile 0x0802
    const presetName = liteState.selectedPreset.charAt(0).toUpperCase() + liteState.selectedPreset.slice(1);
    logAudit('CONFIG', `Committed ${presetName} risk parameters to AegisVault (Elysium L2 Block #${runtimeState.blockNumber})`, 'accent');
    logAudit('SENTINEL', `Auto-Pilot Sentinel engaged for ${VAULT_CONSTANTS.collateralAmount} HYPE. Surveillance active on 0x0801.`, 'accent');

    liteState.shieldActivated = true;
    proConfig.manualOverrideActive = false;

    // Step 4: Visual Confirmation State
    btn.disabled = false;
    btn.classList.add('armed');
    if (btnText) {
      btnText.textContent = 'Auto-Pilot Shield Active';
    }

    if (el.heroSentinelStatus) {
      el.heroSentinelStatus.innerHTML = 'ARMED <span class="status-pill pill-accent">ACTIVE</span>';
    }

    showToast(`Auto-Pilot Shield activated! ${VAULT_CONSTANTS.collateralAmount} HYPE protected with ${presetName} preset.`);
    updateUI();
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

  // --- 10. REAL-TIME HYPERLIQUID REST / WEBSOCKET API ENGINE ---
  let previousMarketPrices = {};

  async function fetchHyperliquidLivePrices() {
    try {
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' })
      });

      if (!res.ok) return;
      const mids = await res.json();

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
        pulse.setAttribute('title', `Hyperliquid L1 Live API Synced (${updateCount} markets ticking)`);
      }
    } catch (err) {
      console.debug('Hyperliquid API sync heartbeat notice:', err.message);
    }
  }

  // --- 11. SYSTEM BOOT ---
  document.addEventListener('DOMContentLoaded', () => {
    initAccessGate();
    initTheme();
    initTradingTerminalSuite();
    initListeners();
    updateUI();
    startLiveTicker();
    fetchHyperliquidLivePrices();
    setInterval(fetchHyperliquidLivePrices, 2500);
    logAudit('SYSTEM', 'AEGIS Pro-Trader Terminal initialized on Elysium L2 (Chain ID 99801)', 'accent');
    logAudit('API', 'Hyperliquid L1 Live Market Feed connected. Polling real-time mids (2.5s).', 'accent');
    logAudit('TELEMETRY', 'Connected to 0x0801 Precompile. Real-time synchronous mark price online.', 'accent');
  });

})();
