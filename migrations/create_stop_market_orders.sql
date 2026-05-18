CREATE TABLE IF NOT EXISTS stop_market_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  option_type text NOT NULL,
  strike_price numeric,
  expiry_date date,
  contracts integer,
  premium numeric,
  delta numeric,
  gamma numeric,
  stop_option_price numeric,
  target_underlying_price numeric,
  max_risk numeric,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  executed_at timestamptz
);

ALTER TABLE stop_market_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_stop_market_orders" ON stop_market_orders
  FOR ALL TO anon USING (true) WITH CHECK (true);
