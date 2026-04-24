-- Migration: Create custom tags system for Options and Futures trades
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS trade_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS options_trade_tag_links (
  trade_id UUID REFERENCES options_trades(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES trade_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);

CREATE TABLE IF NOT EXISTS futures_trade_tag_links (
  trade_id UUID REFERENCES futures_trades(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES trade_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, tag_id)
);

-- RLS
ALTER TABLE trade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE options_trade_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_trade_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_trade_tags" ON trade_tags
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_options_tag_links" ON options_trade_tag_links
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_futures_tag_links" ON futures_trade_tag_links
  FOR ALL TO anon USING (true) WITH CHECK (true);
