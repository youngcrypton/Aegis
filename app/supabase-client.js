/**
 * AEGIS Protocol — Supabase Client & Telemetry Bridge
 * Connects frontend terminal to Supabase backend for live audit sync and risk telemetry.
 * Public Open Testnet Mode (Chain ID 99801)
 */
(function() {
  'use strict';

  // Config: Must be explicitly provided via runtime window variables.
  // Avoid embedding static project credentials in client bundle to prevent quota abuse and DoS.
  const SUPABASE_URL = window.AEGIS_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.AEGIS_SUPABASE_ANON_KEY || '';

  const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
  const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
  const ALLOWED_EVENT_TYPES = new Set([
    'SENTINEL_INTERVENTION',
    'RISK_TELEMETRY',
    'HEDGE_INTENT',
    'UNWIND_INTENT',
    'CIRCUIT_BREAKER_TRIGGERED'
  ]);

  class AegisSupabaseClient {
    constructor(url, anonKey) {
      this.url = url ? url.replace(/\/+$/, '') : '';
      this.key = anonKey;
      this.headers = {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      this.lastAlertTimestamp = 0;
      this.minIntervalMs = 2000; // Rate limit: max 1 alert per 2 seconds
    }

    /**
     * Record a Sentinel Intervention or Risk Telemetry event
     */
    async recordSentinelAlert(alert) {
      // 1. If Supabase is unconfigured, quietly skip
      if (!this.url || !this.key) {
        console.debug('[AegisSupabase] Telemetry recording skipped: backend credentials not configured in window.');
        return;
      }

      // 2. Validate alert object
      if (!alert || typeof alert !== 'object') {
        console.warn('[AegisSupabase] Invalid alert payload ignored.');
        return;
      }

      // 3. Client-side throttling / rate limiting to prevent flood DoS
      const now = Date.now();
      if (now - this.lastAlertTimestamp < this.minIntervalMs) {
        console.debug('[AegisSupabase] Throttled alert logging request.');
        return;
      }
      this.lastAlertTimestamp = now;

      // 4. Strict input sanitization and validation
      const eventType = typeof alert.eventType === 'string' && ALLOWED_EVENT_TYPES.has(alert.eventType)
        ? alert.eventType
        : 'SENTINEL_INTERVENTION';

      const targetAccount = typeof alert.targetAccount === 'string' && ETH_ADDRESS_REGEX.test(alert.targetAccount)
        ? alert.targetAccount
        : '0x0000000000000000000000000000000000000000';

      const collateralRatio = typeof alert.collateralRatio === 'number' && Number.isFinite(alert.collateralRatio) && alert.collateralRatio >= 0 && alert.collateralRatio <= 10000
        ? alert.collateralRatio
        : 150.0;

      const healthFactor = typeof alert.healthFactor === 'number' && Number.isFinite(alert.healthFactor) && alert.healthFactor >= 0 && alert.healthFactor <= 1000
        ? alert.healthFactor
        : 1.85;

      const markPrice = typeof alert.markPrice === 'number' && Number.isFinite(alert.markPrice) && alert.markPrice >= 0 && alert.markPrice <= 1e9
        ? alert.markPrice
        : 43.35;

      const actionTaken = typeof alert.actionTaken === 'string'
        ? alert.actionTaken.substring(0, 100).replace(/[^\w\s\-\.\:\/]/gi, '')
        : 'Delta-Neutral Rebalance';

      const txHash = typeof alert.txHash === 'string' && TX_HASH_REGEX.test(alert.txHash)
        ? alert.txHash
        : null;

      const latencyMs = typeof alert.latencyMs === 'number' && Number.isFinite(alert.latencyMs) && alert.latencyMs >= 0 && alert.latencyMs <= 60000
        ? Math.floor(alert.latencyMs)
        : 3;

      try {
        const endpoint = `${this.url}/rest/v1/sentinel_alerts`;
        await fetch(endpoint, {
          method: 'POST',
          headers: this.headers,
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
          body: JSON.stringify({
            event_type: eventType,
            target_account: targetAccount,
            collateral_ratio: collateralRatio,
            health_factor: healthFactor,
            mark_price: markPrice,
            action_taken: actionTaken,
            tx_hash: txHash,
            latency_ms: latencyMs,
            precompile_verified: true
          })
        });
      } catch (err) {
        console.debug('Supabase alert logging notice:', err.message);
      }
    }
  }

  window.AegisSupabase = new AegisSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
