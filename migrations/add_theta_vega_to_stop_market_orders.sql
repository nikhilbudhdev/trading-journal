ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS theta numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS vega numeric;
