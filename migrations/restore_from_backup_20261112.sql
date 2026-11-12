-- Incident recovery: the original broad migration (retag non-registered -> rrsp,
-- then recompute a single blended running balance) was run against live data by
-- mistake, before it was replaced with the surgical 2-row fix. This restores
-- account_type and balance on both tables from the pre-incident backup tables
-- (options_balance_history_bak_20261112 / options_trades_bak_20261112), which
-- were created at the very start of that run, before anything was changed.
--
-- Run the safety check first. If the counts don't match, STOP and report back
-- before running the restore -- it would mean something else (a new trade, a
-- delete) happened in between and needs a closer look.

-- 0. Safety check
SELECT
  (SELECT count(*) FROM options_balance_history) AS live_balance_count,
  (SELECT count(*) FROM options_balance_history_bak_20261112) AS backup_balance_count,
  (SELECT count(*) FROM options_trades) AS live_trades_count,
  (SELECT count(*) FROM options_trades_bak_20261112) AS backup_trades_count;

-- 1. Restore (only run after checking the counts above look sane)
BEGIN;

UPDATE options_trades t
   SET account_type = b.account_type
  FROM options_trades_bak_20261112 b
 WHERE t.id = b.id;

UPDATE options_balance_history h
   SET account_type = b.account_type,
       balance = b.balance
  FROM options_balance_history_bak_20261112 b
 WHERE h.id = b.id;

COMMIT;

-- 2. Verify the restore worked: these two should look exactly like the original
--    three-chain breakdown again (non-registered, rrsp, tfsa all distinct).
SELECT account_type, count(*), min(created_at), max(created_at)
FROM options_balance_history GROUP BY 1 ORDER BY 1;

-- Chain A's last known-good row (AAPL/NFLX sequence) should show account_type
-- 'non-registered' again, and Chain B's last row before the incident should be
-- back to 5704.99 / rrsp.
SELECT id, created_at, change_reason, change_amount, balance, account_type
FROM options_balance_history
WHERE created_at >= '2026-06-01'
ORDER BY created_at, id;
