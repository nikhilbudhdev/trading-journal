CREATE TABLE IF NOT EXISTS forex_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument text NOT NULL,
  direction text NOT NULL,
  lot_size numeric,
  entry_price numeric,
  stop_loss_pips numeric,
  take_profit_pips numeric,
  pnl numeric,
  status text DEFAULT 'open',
  entry_date timestamptz DEFAULT now(),
  exit_date timestamptz,
  notes text,
  entry_url text,
  forecast_url text,
  exit_url text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forex_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance numeric NOT NULL,
  change_amount numeric DEFAULT 0,
  change_reason text,
  trade_id uuid REFERENCES forex_trades(id) ON DELETE SET NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forex_missed_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument text,
  direction text,
  before_url text,
  after_url text,
  pattern text,
  potential_return numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forex_trading_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text,
  updated_at timestamptz DEFAULT now()
);
