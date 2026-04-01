-- Vincula cada obra ao orçamento que a originou.
-- ON DELETE SET NULL: se o orçamento for excluído, a obra permanece.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Índice para buscas rápidas por orçamento
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON public.jobs(quote_id);
