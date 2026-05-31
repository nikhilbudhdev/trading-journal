ALTER TABLE options_trades ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'non-registered';
