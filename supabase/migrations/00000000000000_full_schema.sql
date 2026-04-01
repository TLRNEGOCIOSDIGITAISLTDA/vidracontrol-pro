-- =============================================================
-- VidraControl - Migration Completa (estado final do banco)
-- Rode este arquivo no SQL Editor do Supabase
-- =============================================================

-- -------------------------------------------------------
-- 1. TABELA: company_info
-- -------------------------------------------------------
CREATE TABLE public.company_info (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  cnpj_cpf    TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  address     TEXT        NOT NULL DEFAULT '',
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own company_info" ON public.company_info
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read company_info" ON public.company_info
  FOR SELECT
  USING (true);

-- -------------------------------------------------------
-- 2. TABELA: quotes
-- -------------------------------------------------------
CREATE TABLE public.quotes (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name    TEXT        NOT NULL,
  client_phone   TEXT        NOT NULL DEFAULT '',
  job_type       TEXT,
  total          NUMERIC     NOT NULL DEFAULT 0,
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'orcado',
  company_info   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  commission_pct NUMERIC     NOT NULL DEFAULT 0,
  nf_pct         NUMERIC     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read quotes by id" ON public.quotes
  FOR SELECT
  USING (true);

-- -------------------------------------------------------
-- 3. TABELA: quote_items
-- -------------------------------------------------------
CREATE TABLE public.quote_items (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id    UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'vidro_comum',
  description TEXT        NOT NULL DEFAULT '',
  location    TEXT,
  width       NUMERIC,
  height      NUMERIC,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  unit_price  NUMERIC     NOT NULL DEFAULT 0,
  total       NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quote_items" ON public.quote_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read quote_items" ON public.quote_items
  FOR SELECT
  USING (true);

-- -------------------------------------------------------
-- 4. TABELA: quote_costs
-- -------------------------------------------------------
CREATE TABLE public.quote_costs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id    UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'outros',
  value       NUMERIC     NOT NULL DEFAULT 0,
  date        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quote_costs" ON public.quote_costs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 5. TABELA: jobs
-- -------------------------------------------------------
CREATE TABLE public.jobs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  sale_value  NUMERIC     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'em_andamento',
  quote_id    UUID        REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 6. TABELA: job_items
-- -------------------------------------------------------
CREATE TABLE public.job_items (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'vidro_comum',
  description TEXT        NOT NULL DEFAULT '',
  width       NUMERIC,
  height      NUMERIC,
  quantity    INTEGER     NOT NULL DEFAULT 1,
  unit_price  NUMERIC     NOT NULL DEFAULT 0,
  total       NUMERIC     NOT NULL DEFAULT 0,
  area        NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job_items" ON public.job_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 7. TABELA: job_expenses
-- -------------------------------------------------------
CREATE TABLE public.job_expenses (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'outros',
  value       NUMERIC     NOT NULL DEFAULT 0,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job_expenses" ON public.job_expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 8. TABELA: profiles
-- -------------------------------------------------------
CREATE TABLE public.profiles (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL UNIQUE,
  full_name  TEXT        NOT NULL DEFAULT '',
  whatsapp   TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 9. TABELA: audit_logs
-- -------------------------------------------------------
CREATE TABLE public.audit_logs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB       DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- 10. STORAGE BUCKETS
-- -------------------------------------------------------

-- Bucket privado para fotos de comprovantes de despesas
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users upload own receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket publico para PDFs de orcamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-pdfs', 'quote-pdfs', true);

CREATE POLICY "Users upload own quote pdfs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'quote-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read quote pdfs" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'quote-pdfs');

CREATE POLICY "Users delete own quote pdfs" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'quote-pdfs' AND auth.uid() IS NOT NULL);
