-- Migration: Persistent, editable accounts list (replaces hardcoded MODE_CONFIG.accounts)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace text NOT NULL,              -- 'options' (matches config.key)
  value text NOT NULL,                  -- the slug stored in account_type columns
  label text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (workspace, value)
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_trading_accounts" ON trading_accounts
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed with the three accounts currently hardcoded for options, so existing trades
-- and balance rows keep resolving to a labeled account after this ships.
INSERT INTO trading_accounts (workspace, value, label, sort_order) VALUES
  ('options', 'non-registered', 'Non-Registered', 0),
  ('options', 'tfsa', 'TFSA (Alpha Generation)', 1),
  ('options', 'rrsp', 'RRSP', 2)
ON CONFLICT (workspace, value) DO NOTHING;
