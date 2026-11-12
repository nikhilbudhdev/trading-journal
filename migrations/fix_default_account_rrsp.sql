-- Fix: new trades/balances were defaulting to "non-registered" instead of RRSP.
--
-- Live-data investigation (2026-11-12) found the historical data is NOT broadly
-- mistagged: since 2026-06-02 Nikhil has run three real accounts (rrsp,
-- non-registered, tfsa) and they are correctly tagged throughout, confirmed
-- row-by-row against his Wealthsimple RRSP activity. A blanket "retag
-- non-registered -> rrsp" migration would have been WRONG here -- it would have
-- overwritten genuine Non-Registered and TFSA history. That approach was
-- abandoned after the dry run; this migration only does two things:
--
--   1. Flip the column default so future inserts that omit account_type land on
--      rrsp instead of non-registered, matching the new app default
--      (MODE_CONFIG.options.defaultAccount = 'rrsp').
--   2. Correct one confirmed live mistake: the "NOW long" trade closed today
--      (2026-11-12) was tagged non-registered by the exact bug this fix
--      addresses, but Nikhil confirmed it was actually an RRSP trade. Its
--      balance-history row is the single most recent row in the whole table
--      (nothing downstream needs recomputing), and the correction amount was
--      verified against Nikhil's real current RRSP balance ($19,342, one open
--      trade outstanding): prior rrsp balance 20226.65 + (-884) = 19342.65.
--
-- Everything else (the MSFT trade tagged tfsa on 2026-08-03) was confirmed
-- correct as-is and is left untouched.

-- NOTE: no fresh backup tables here -- options_balance_history_bak_20261112 and
-- options_trades_bak_20261112 already exist from restore_from_backup_20261112.sql.
-- Run that restore FIRST if you haven't already, then run this.

BEGIN;

-- 1. Stop the database from defaulting to non-registered going forward
ALTER TABLE options_trades ALTER COLUMN account_type SET DEFAULT 'rrsp';
ALTER TABLE options_balance_history ALTER COLUMN account_type SET DEFAULT 'rrsp';

-- 2. Correct the one confirmed mistake: today's "NOW long" trade belongs in RRSP
UPDATE options_trades
   SET account_type = 'rrsp'
 WHERE id = 'a51ab03e-be10-4cea-8294-cc2d98e023da';

UPDATE options_balance_history
   SET account_type = 'rrsp',
       balance = 19342.65
 WHERE id = '7bfddecd-91cf-46c7-9061-71ab7d5eb79f';

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify after running:
--
-- SELECT id, created_at, change_reason, change_amount, balance, account_type
-- FROM options_balance_history
-- WHERE account_type = 'rrsp'
-- ORDER BY created_at DESC LIMIT 3;
--
-- The top row should now be the NOW trade, balance 19342.65.
-- ---------------------------------------------------------------------------
