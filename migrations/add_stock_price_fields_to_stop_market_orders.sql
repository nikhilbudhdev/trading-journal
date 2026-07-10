-- Fields the insert already writes but the table never had:
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS quoted_premium numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS entry_order_type text DEFAULT 'buy_stop';
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS entry_trigger_stock_price numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS assumed_days_to_entry integer;

-- New stock-price triplet, mirroring options_trades so both surfaces speak one language:
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS current_stock_price numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS sl_stock_price numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS tp_stock_price numeric;
ALTER TABLE stop_market_orders ADD COLUMN IF NOT EXISTS breakeven_stock_price numeric;
