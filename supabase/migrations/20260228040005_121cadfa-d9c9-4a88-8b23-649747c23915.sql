
-- Add ON DELETE CASCADE to all child tables so deleting a job/quote auto-removes children

ALTER TABLE public.job_expenses DROP CONSTRAINT job_expenses_job_id_fkey;
ALTER TABLE public.job_expenses ADD CONSTRAINT job_expenses_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.job_items DROP CONSTRAINT job_items_job_id_fkey;
ALTER TABLE public.job_items ADD CONSTRAINT job_items_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.quote_items DROP CONSTRAINT quote_items_quote_id_fkey;
ALTER TABLE public.quote_items ADD CONSTRAINT quote_items_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

ALTER TABLE public.quote_costs DROP CONSTRAINT quote_costs_quote_id_fkey;
ALTER TABLE public.quote_costs ADD CONSTRAINT quote_costs_quote_id_fkey 
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;
