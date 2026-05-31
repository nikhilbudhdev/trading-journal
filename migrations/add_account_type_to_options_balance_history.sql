ALTER TABLE options_balance_history ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'non-registered';
