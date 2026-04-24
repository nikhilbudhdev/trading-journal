-- Migration: Add journal columns to options_trades and futures_trades
-- Run this in Supabase SQL Editor

ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS journal_notes TEXT;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS journal_reviewed_at TIMESTAMPTZ;

ALTER TABLE futures_trades ADD COLUMN IF NOT EXISTS journal_notes TEXT;
ALTER TABLE futures_trades ADD COLUMN IF NOT EXISTS journal_reviewed_at TIMESTAMPTZ;
