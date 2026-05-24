ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS trailing_stop_price numeric;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS trailing_stop_set_date date;
