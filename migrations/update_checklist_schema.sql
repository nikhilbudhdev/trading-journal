-- Migration: Create Checklist Schema for Falcon FX Flowchart System
-- This migration creates tables to support the 10-step flowchart checklist
-- Run this in Supabase SQL Editor

-- ============================================================================
-- CLEANUP: Drop existing partial tables from previous failed migrations
-- ============================================================================
DROP TABLE IF EXISTS stock_checklist_logs CASCADE;
DROP TABLE IF EXISTS stock_checklist_attempts CASCADE;
DROP TABLE IF EXISTS checklist_logs CASCADE;
DROP TABLE IF EXISTS checklist_attempts CASCADE;
DROP TABLE IF EXISTS options_checklist_logs CASCADE;
DROP TABLE IF EXISTS options_checklist_attempts CASCADE;
DROP TABLE IF EXISTS futures_checklist_logs CASCADE;
DROP TABLE IF EXISTS futures_checklist_attempts CASCADE;

-- ============================================================================
-- STOCKS MODE - Create stock_checklist_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_checklist_logs (
  id BIGSERIAL PRIMARY KEY,
  trade_id UUID REFERENCES stock_trades(id) ON DELETE CASCADE,
  answers JSONB,
  zone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT CHECK (step5_zone IN ('Green', 'Amber', 'Red')),
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_checklist_completed ON stock_checklist_logs(completed);
CREATE INDEX IF NOT EXISTS idx_stock_checklist_zone ON stock_checklist_logs(step5_zone);
CREATE INDEX IF NOT EXISTS idx_stock_checklist_trade_id ON stock_checklist_logs(trade_id);

-- ============================================================================
-- STOCKS MODE - Create stock_checklist_attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_checklist_attempts (
  id BIGSERIAL PRIMARY KEY,
  status TEXT,
  snapshot JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT,
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false
);

-- ============================================================================
-- FOREX MODE - Create checklist_logs table
-- Note: Forex uses 'checklist_logs' table (without prefix)
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_logs (
  id BIGSERIAL PRIMARY KEY,
  trade_id BIGINT REFERENCES trades(id) ON DELETE CASCADE,
  answers JSONB,
  zone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT CHECK (step5_zone IN ('Green', 'Amber', 'Red')),
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_checklist_completed ON checklist_logs(completed);
CREATE INDEX IF NOT EXISTS idx_checklist_zone ON checklist_logs(step5_zone);
CREATE INDEX IF NOT EXISTS idx_checklist_trade_id ON checklist_logs(trade_id);

-- ============================================================================
-- FOREX MODE - Create checklist_attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_attempts (
  id BIGSERIAL PRIMARY KEY,
  status TEXT,
  snapshot JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT,
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false
);

-- ============================================================================
-- OPTIONS MODE - Create options_checklist_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS options_checklist_logs (
  id BIGSERIAL PRIMARY KEY,
  trade_id UUID REFERENCES options_trades(id) ON DELETE CASCADE,
  answers JSONB,
  zone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT CHECK (step5_zone IN ('Green', 'Amber', 'Red')),
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_options_checklist_completed ON options_checklist_logs(completed);
CREATE INDEX IF NOT EXISTS idx_options_checklist_zone ON options_checklist_logs(step5_zone);
CREATE INDEX IF NOT EXISTS idx_options_checklist_trade_id ON options_checklist_logs(trade_id);

-- ============================================================================
-- OPTIONS MODE - Create options_checklist_attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS options_checklist_attempts (
  id BIGSERIAL PRIMARY KEY,
  status TEXT,
  snapshot JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT,
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false
);

-- ============================================================================
-- FUTURES MODE - Create futures_checklist_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS futures_checklist_logs (
  id BIGSERIAL PRIMARY KEY,
  trade_id UUID REFERENCES futures_trades(id) ON DELETE CASCADE,
  answers JSONB,
  zone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT CHECK (step5_zone IN ('Green', 'Amber', 'Red')),
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_futures_checklist_completed ON futures_checklist_logs(completed);
CREATE INDEX IF NOT EXISTS idx_futures_checklist_zone ON futures_checklist_logs(step5_zone);
CREATE INDEX IF NOT EXISTS idx_futures_checklist_trade_id ON futures_checklist_logs(trade_id);

-- ============================================================================
-- FUTURES MODE - Create futures_checklist_attempts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS futures_checklist_attempts (
  id BIGSERIAL PRIMARY KEY,
  status TEXT,
  snapshot JSONB,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- New 10-step fields
  step1_forecasted BOOLEAN,
  step2_in_plan BOOLEAN,
  step3_htf_checked BOOLEAN,
  step4_rule_of_three TEXT,
  step5_zone TEXT,
  step6_confirmation BOOLEAN,
  step7_position_sized BOOLEAN,
  step8_invalidation_known BOOLEAN,
  step9_rr_checked BOOLEAN,
  step10_documented BOOLEAN,
  blocking_messages JSONB,
  completed BOOLEAN DEFAULT false
);

-- ============================================================================
-- Add helpful comments to columns
-- ============================================================================
COMMENT ON COLUMN stock_checklist_logs.step1_forecasted IS 'Step 1: Did the trader forecast this trade beforehand?';
COMMENT ON COLUMN stock_checklist_logs.step2_in_plan IS 'Step 2: Is this setup in the trading plan?';
COMMENT ON COLUMN stock_checklist_logs.step3_htf_checked IS 'Step 3: Has the trader checked full HTF structure?';
COMMENT ON COLUMN stock_checklist_logs.step4_rule_of_three IS 'Step 4: Rule of Three approach type (Impulsive/Corrective/Structural)';
COMMENT ON COLUMN stock_checklist_logs.step5_zone IS 'Step 5: Zone selection (Green/Amber/Red)';
COMMENT ON COLUMN stock_checklist_logs.step6_confirmation IS 'Step 6: Is price action confirming?';
COMMENT ON COLUMN stock_checklist_logs.step7_position_sized IS 'Step 7: Correct position sizing at 1% risk?';
COMMENT ON COLUMN stock_checklist_logs.step8_invalidation_known IS 'Step 8: Does trader know invalidation point?';
COMMENT ON COLUMN stock_checklist_logs.step9_rr_checked IS 'Step 9: Is R:R minimum 1.5:1?';
COMMENT ON COLUMN stock_checklist_logs.step10_documented IS 'Step 10: Is everything documented?';
COMMENT ON COLUMN stock_checklist_logs.blocking_messages IS 'Array of blocking messages encountered during checklist';
COMMENT ON COLUMN stock_checklist_logs.completed IS 'Whether the checklist was fully completed';
COMMENT ON COLUMN stock_checklist_logs.completed_at IS 'Timestamp when checklist was completed';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- Uncomment and run these if you need to completely remove the checklist tables
-- WARNING: This will delete all checklist data!
-- ============================================================================
/*
-- Drop all checklist tables and indexes
DROP TABLE IF EXISTS stock_checklist_logs CASCADE;
DROP TABLE IF EXISTS stock_checklist_attempts CASCADE;
DROP TABLE IF EXISTS checklist_logs CASCADE;
DROP TABLE IF EXISTS checklist_attempts CASCADE;
DROP TABLE IF EXISTS options_checklist_logs CASCADE;
DROP TABLE IF EXISTS options_checklist_attempts CASCADE;
DROP TABLE IF EXISTS futures_checklist_logs CASCADE;
DROP TABLE IF EXISTS futures_checklist_attempts CASCADE;

-- Drop all indexes (if tables still exist)
DROP INDEX IF EXISTS idx_stock_checklist_completed;
DROP INDEX IF EXISTS idx_stock_checklist_zone;
DROP INDEX IF EXISTS idx_stock_checklist_trade_id;
DROP INDEX IF EXISTS idx_checklist_completed;
DROP INDEX IF EXISTS idx_checklist_zone;
DROP INDEX IF EXISTS idx_checklist_trade_id;
DROP INDEX IF EXISTS idx_options_checklist_completed;
DROP INDEX IF EXISTS idx_options_checklist_zone;
DROP INDEX IF EXISTS idx_options_checklist_trade_id;
DROP INDEX IF EXISTS idx_futures_checklist_completed;
DROP INDEX IF EXISTS idx_futures_checklist_zone;
DROP INDEX IF EXISTS idx_futures_checklist_trade_id;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- After running this migration:
-- 1. All checklist_logs tables will have the new 10-step fields
-- 2. All checklist_attempts tables will track the new fields
-- 3. Indexes are added for better query performance
-- 4. Comments explain what each field means
-- 5. The app will now save comprehensive checklist data with each trade
-- ============================================================================
