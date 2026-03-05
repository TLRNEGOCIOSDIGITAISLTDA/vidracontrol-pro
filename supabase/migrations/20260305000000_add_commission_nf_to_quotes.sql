-- Add commission and NF percentage fields to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS commission_pct NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS nf_pct NUMERIC NOT NULL DEFAULT 0;
