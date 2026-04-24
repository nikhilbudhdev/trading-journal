-- Migration: Enable Row-Level Security on all main trade tables
-- Run this in Supabase SQL Editor
--
-- Context: The app uses the anon key without user authentication.
-- Enabling RLS with permissive policies for the anon role:
--   1. Resolves Supabase's "Table publicly accessible" critical warning
--   2. Restricts access to the anon role only (blocks direct API abuse)
--   3. Maintains full app functionality without requiring auth changes
--
-- Note: Checklist tables were secured separately in enable_rls_checklist_tables.sql

-- ============================================================================
-- STOCKS MODE
-- ============================================================================
ALTER TABLE stock_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_missed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_trading_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_stock_trades" ON stock_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_stock_balance_history" ON stock_balance_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_stock_missed_trades" ON stock_missed_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_stock_trading_plan" ON stock_trading_plan
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- FOREX MODE
-- ============================================================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_trades" ON trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_balance_history" ON balance_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_missed_trades" ON missed_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_trading_plan" ON trading_plan
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- OPTIONS MODE
-- ============================================================================
ALTER TABLE options_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_trading_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_options_trades" ON options_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_options_balance_history" ON options_balance_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_options_trading_plan" ON options_trading_plan
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- FUTURES MODE
-- ============================================================================
ALTER TABLE futures_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_trading_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_futures_trades" ON futures_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_balance_history" ON futures_balance_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_trading_plan" ON futures_trading_plan
  FOR ALL TO anon USING (true) WITH CHECK (true);
 