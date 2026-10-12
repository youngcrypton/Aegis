/**
 * AEGIS Protocol — Supabase Client & Telemetry Bridge
 * Connects frontend terminal to Supabase backend for access code verification and live audit sync.
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
     * Validate an Access Code against Supabase table 'beta_access_codes'
     */
    async verifyAccessCode(code) {
      if (!code) return { valid: false, error: 'Empty code' };
      const cleanCode = code.trim().toUpperCase();

      try {
        const endpoint = `${this.url}/rest/v1/beta_access_codes?code=eq.${encodeURIComponent(cleanCode)}&is_active=eq.true&select=*`;
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: this.headers
        });

        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const match = rows[0];
            return {
              valid: true,
              tier: match.tier,
              label: match.label,
              source: 'supabase'
            };
          }
        }
      } catch (err) {
        console.debug('Supabase code verification fallback to local dataset:', err.message);
      }

      // Local offline fallback using window.AegisAccessCodes
      if (window.AegisAccessCodes && typeof window.AegisAccessCodes.isValid === 'function') {
        const isLocalValid = window.AegisAccessCodes.isValid(cleanCode);
        return {
          valid: isLocalValid,
          tier: 'TRADER_PASS',
          label: 'Elysium Testnet Verified Code',
          source: 'local_hash_index'
        };
      }

      return { valid: false, error: 'Invalid access code' };
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
            mark_price: alert.markPrice || 83.50,
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
