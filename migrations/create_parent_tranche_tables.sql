CREATE TABLE IF NOT EXISTS parent_tranche_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_month text NOT NULL DEFAULT '2026-06',
  start_nav numeric NOT NULL DEFAULT 10,
  start_account_value numeric NOT NULL DEFAULT 0,
  default_parent_contrib numeric NOT NULL DEFAULT 0,
  default_self_contrib numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0.4,
  proj_rate numeric NOT NULL DEFAULT 0.08,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_tranche_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value_pre_flows numeric,
  parent_contrib numeric DEFAULT 0,
  self_contrib numeric DEFAULT 0,
  self_extraction numeric DEFAULT 0,
  parent_tax_redemption numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parent_tranche_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_tranche_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_parent_tranche_settings" ON parent_tranche_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_parent_tranche_months" ON parent_tranche_months
  FOR ALL TO anon USING (true) WITH CHECK (true);
