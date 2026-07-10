-- Separate the chain quote from the actual entry cost.
-- 'premium' (existing) keeps its meaning: what the trader actually paid.
-- 'quoted_premium' is today's chain mid used only for implied-volatility solving.
-- Rows where quoted_premium IS NULL fall back to premium for the IV solve.
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS entry_order_type text DEFAULT 'market';
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS quoted_premium numeric;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS entry_trigger_stock_price numeric;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS assumed_days_to_entry integer DEFAULT 0;
