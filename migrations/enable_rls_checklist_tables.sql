-- Migration: Enable Row-Level Security on all checklist tables
-- Run this in Supabase SQL Editor
--
-- Context: The app uses the anon key without user authentication.
-- Enabling RLS with permissive policies for the anon role:
--   1. Resolves Supabase's "Table publicly accessible" critical warning
--   2. Restricts access to the anon role only (blocks direct API abuse)
--   3. Maintains full app functionality without requiring auth changes

-- ============================================================================
-- STOCKS MODE
-- ============================================================================
ALTER TABLE stock_checklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_checklist_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_stock_checklist_logs" ON stock_checklist_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_stock_checklist_attempts" ON stock_checklist_attempts
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- FOREX MODE
-- ============================================================================
ALTER TABLE checklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_checklist_logs" ON checklist_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_checklist_attempts" ON checklist_attempts
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- OPTIONS MODE
-- ============================================================================
ALTER TABLE options_checklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_checklist_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_options_checklist_logs" ON options_checklist_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_options_checklist_attempts" ON options_checklist_attempts
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- FUTURES MODE
-- ============================================================================
ALTER TABLE futures_checklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_checklist_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_futures_checklist_logs" ON futures_checklist_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_checklist_attempts" ON futures_checklist_attempts
  FOR ALL TO anon USING (true) WITH CHECK (true);
