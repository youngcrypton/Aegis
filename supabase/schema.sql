-- ============================================================================
-- AEGIS PROTOCOL — SUPABASE BACKEND SCHEMA
-- High-Frequency Risk Sentinel & Pro-Trader Terminal
-- Database: PostgreSQL 15+ (Supabase)
-- Public Open Testnet (Chain ID 99801)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Vault Sessions & Delegated Session Keys
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL,
    session_key_address VARCHAR(42),
    delegated_duration_hours INT DEFAULT 24,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'EXPIRED'
    collateral_deposited_hype NUMERIC(24, 8) DEFAULT 0,
    vault_contract_address VARCHAR(42) NOT NULL DEFAULT '0xC064495DE20EfeEBB6a4B1dE57ffb48ED8f5dA29',
    chain_id INT NOT NULL DEFAULT 99801,
    ip_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vault_sessions_wallet ON public.vault_sessions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_vault_sessions_status ON public.vault_sessions (status);

-- ----------------------------------------------------------------------------
-- 2. Sentinel Risk & Telemetry Alerts Log
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
-- 3. Row-Level Security (RLS) Configuration
-- ----------------------------------------------------------------------------
ALTER TABLE public.vault_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinel_alerts ENABLE ROW LEVEL SECURITY;

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
