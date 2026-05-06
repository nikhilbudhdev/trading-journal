ALTER TABLE options_trades
  ADD COLUMN IF NOT EXISTS delta numeric,
  ADD COLUMN IF NOT EXISTS gamma numeric,
  ADD COLUMN IF NOT EXISTS entry_stock_price numeric;
