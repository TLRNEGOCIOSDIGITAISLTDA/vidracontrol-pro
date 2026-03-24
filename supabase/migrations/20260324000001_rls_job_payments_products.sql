-- Garante RLS nas tabelas job_payments e products
ALTER TABLE job_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;

-- ── job_payments ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "job_payments: user crud"  ON job_payments;
CREATE POLICY "job_payments: user crud"
  ON job_payments
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── products ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products: user crud" ON products;
CREATE POLICY "products: user crud"
  ON products
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
