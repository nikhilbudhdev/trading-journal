-- Migration: Create partial exits tables for Options and Futures
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS options_partial_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES options_trades(id) ON DELETE CASCADE,
  exit_date TIMESTAMPTZ DEFAULT NOW(),
  contracts_exited INTEGER NOT NULL,
  exit_premium NUMERIC NOT NULL,
  pnl NUMERIC NOT NULL,
  notes TEXT,
  exit_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS futures_partial_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES futures_trades(id) ON DELETE CASCADE,
  exit_date TIMESTAMPTZ DEFAULT NOW(),
  contracts_exited INTEGER NOT NULL,
  exit_price NUMERIC NOT NULL,
  pnl NUMERIC NOT NULL,
  notes TEXT,
  exit_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE options_partial_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_partial_exits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_options_partial_exits" ON options_partial_exits
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_partial_exits" ON futures_partial_exits
  FOR ALL TO anon USING (true) WITH CHECK (true);
