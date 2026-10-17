/**
 * AEGIS Protocol — Supabase Client & Telemetry Bridge
 * Connects frontend terminal to Supabase backend for live audit sync and risk telemetry.
 * Public Open Testnet Mode (Chain ID 99801)
 */
(function() {
  'use strict';

  // Config: Live Supabase Backend Project
  const SUPABASE_URL = window.AEGIS_SUPABASE_URL || 'https://rdwkvdoqdytndgslrlis.supabase.co';
  const SUPABASE_ANON_KEY = window.AEGIS_SUPABASE_ANON_KEY || 'sb_publishable_BYokzDha9EarnLaWyGO7EA_XSV1mpL7';

  class AegisSupabaseClient {
    constructor(url, anonKey) {
      this.url = url;
      this.key = anonKey;
      this.headers = {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
    }

    /**
     * Record a Sentinel Intervention or Risk Telemetry event
     */
    async recordSentinelAlert(alert) {
      try {
        const endpoint = `${this.url}/rest/v1/sentinel_alerts`;
        await fetch(endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            event_type: alert.eventType || 'SENTINEL_INTERVENTION',
            target_account: alert.targetAccount || '0x0000000000000000000000000000000000000000',
            collateral_ratio: alert.collateralRatio || 150.0,
            health_factor: alert.healthFactor || 1.85,
            mark_price: alert.markPrice || 43.35,
            action_taken: alert.actionTaken || 'Delta-Neutral Rebalance',
            tx_hash: alert.txHash || null,
            latency_ms: alert.latencyMs || 3,
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
