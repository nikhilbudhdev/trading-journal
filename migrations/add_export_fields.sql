ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS exit_price numeric;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS fees numeric;
ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS risk_at_entry numeric;
ALTER TABLE options_partial_exits ADD COLUMN IF NOT EXISTS fees numeric;
