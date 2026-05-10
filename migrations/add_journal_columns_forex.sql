ALTER TABLE forex_trades
  ADD COLUMN IF NOT EXISTS journal_notes text,
  ADD COLUMN IF NOT EXISTS journal_reviewed_at timestamptz;
