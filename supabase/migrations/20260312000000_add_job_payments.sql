-- Tabela de recebimentos por obra
CREATE TABLE IF NOT EXISTS public.job_payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id         UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount         NUMERIC NOT NULL DEFAULT 0,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Pix',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job_payments"
  ON public.job_payments
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
