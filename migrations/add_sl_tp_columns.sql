ALTER TABLE options_trades
  ADD COLUMN IF NOT EXISTS sl_stock_price numeric,
  ADD COLUMN IF NOT EXISTS tp_stock_price numeric;
