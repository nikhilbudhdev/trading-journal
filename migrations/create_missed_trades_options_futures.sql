-- Migration: Create missed trades tables for Options and Futures modes
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS options_missed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  direction TEXT,
  pattern TEXT,
  before_url TEXT,
  after_url TEXT,
  potential_return NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS futures_missed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  direction TEXT,
  pattern TEXT,
  before_url TEXT,
  after_url TEXT,
  potential_return NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE options_missed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_missed_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_options_missed_trades" ON options_missed_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_missed_trades" ON futures_missed_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);
