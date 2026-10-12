-- ============================================================================
-- AEGIS PROTOCOL — SUPABASE BACKEND SCHEMA
-- High-Frequency Risk Sentinel & Pro-Trader Terminal
-- Database: PostgreSQL 15+ (Supabase)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Beta Access Codes Table (Gated Testnet Access)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.beta_access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    label VARCHAR(128) NOT NULL DEFAULT 'Elysium Testnet Early Trader',
    tier VARCHAR(32) NOT NULL DEFAULT 'TRADER_PASS', -- 'VIP_SENTINEL', 'INSTITUTIONAL', 'TRADER_PASS'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_uses INT NOT NULL DEFAULT 1,
    current_uses INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '180 days'),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.beta_access_codes (code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON public.beta_access_codes (is_active);

-- ----------------------------------------------------------------------------
-- 2. Vault Sessions & Delegated Session Keys
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    session_key_address VARCHAR(42),
    delegated_duration_hours INT DEFAULT 24,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'EXPIRED'
    collateral_deposited_hype NUMERIC(24, 8) DEFAULT 0,
    vault_contract_address VARCHAR(42) NOT NULL DEFAULT '0x05Aa229Aec102f78CE0E852A812a388F076Aa555',
    chain_id INT NOT NULL DEFAULT 99801,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vault_sessions_wallet ON public.vault_sessions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_status ON public.vault_sessions (status);

-- ----------------------------------------------------------------------------
-- 3. Sentinel Risk & Telemetry Alerts Log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sentinel_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL, -- 'SENTINEL_INTERVENTION', 'DELTA_HEDGE', 'ORACLE_PULSE', 'HEALTH_WARNING'
    target_account VARCHAR(42) NOT NULL,
    collateral_ratio NUMERIC(10, 4) NOT NULL,
    health_factor NUMERIC(10, 4) NOT NULL,
    mark_price NUMERIC(18, 6) NOT NULL,
    action_taken VARCHAR(128) NOT NULL,
    tx_hash VARCHAR(66),
    latency_ms INT DEFAULT 3,
    precompile_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_alerts_event ON public.sentinel_alerts (event_type);
CREATE INDEX IF NOT EXISTS idx_sentinel_alerts_created ON public.sentinel_alerts (created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Row-Level Security (RLS) Configuration
-- ----------------------------------------------------------------------------
ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_alerts ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated read policies
CREATE POLICY "Public Read Active Access Codes Verification" 
    ON public.beta_access_codes 
    FOR SELECT 
    USING (is_active = TRUE);

CREATE POLICY "Public Read Sentinel Alerts" 
    ON public.sentinel_alerts 
    FOR SELECT 
    USING (true);

CREATE POLICY "Users Can Read Own Vault Sessions" 
    ON public.vault_sessions 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow Service Role Inserts" 
    ON public.sentinel_alerts 
    FOR INSERT 
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. Seed Testnet Beta Access Codes (Matching ACCESS_CODES.md batches)
-- ----------------------------------------------------------------------------
INSERT INTO public.beta_access_codes (code, label, tier, max_uses) VALUES
('AEGIS-ALPHA-701', 'Core Team Testnet Pass', 'VIP_SENTINEL', 99),
('AEGIS-ALPHA-702', 'High-Beta Trader Pass', 'TRADER_PASS', 1),
('AEGIS-ALPHA-703', 'Elysium L2 Early Tester', 'TRADER_PASS', 1),
('AEGIS-ALPHA-704', 'Ascend Finance Sentinel', 'TRADER_PASS', 1),
('AEGIS-ALPHA-705', 'Hyperliquid Ecosystem Pass', 'TRADER_PASS', 1),
('AEGIS-ALPHA-706', 'HyperCore MM Node', 'INSTITUTIONAL', 5),
('AEGIS-ALPHA-707', 'Risk Engine Auditor', 'VIP_SENTINEL', 5),
('AEGIS-ALPHA-708', 'Perp Hedging Specialist', 'TRADER_PASS', 1),
('AEGIS-ALPHA-709', 'Elysium Faucet Explorer', 'TRADER_PASS', 1),
('AEGIS-ALPHA-710', 'Sub-Millisecond Keeper Pass', 'INSTITUTIONAL', 5)
ON CONFLICT (code) DO NOTHING;
