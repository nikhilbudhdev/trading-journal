-- Enable RLS on new forex and daily journal tables (anon role, permissive)

ALTER TABLE forex_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE forex_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE forex_missed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE forex_trading_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_forex_trades" ON forex_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_forex_balance_history" ON forex_balance_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_forex_missed_trades" ON forex_missed_trades
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_forex_trading_plan" ON forex_trading_plan
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_daily_journal_entries" ON daily_journal_entries
  FOR ALL TO anon USING (true) WITH CHECK (true);
