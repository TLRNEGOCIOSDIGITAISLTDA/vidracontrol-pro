
-- Company Info table
CREATE TABLE public.company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  cnpj_cpf TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to company_info" ON public.company_info FOR ALL USING (true) WITH CHECK (true);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  job_type TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'orcado',
  company_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

-- Quote Items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vidro_comum',
  description TEXT NOT NULL DEFAULT '',
  location TEXT,
  width NUMERIC,
  height NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quote_items" ON public.quote_items FOR ALL USING (true) WITH CHECK (true);

-- Quote Costs table
CREATE TABLE public.quote_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  value NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quote_costs" ON public.quote_costs FOR ALL USING (true) WITH CHECK (true);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sale_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);

-- Job Items table
CREATE TABLE public.job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vidro_comum',
  description TEXT NOT NULL DEFAULT '',
  width NUMERIC,
  height NUMERIC,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  area NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to job_items" ON public.job_items FOR ALL USING (true) WITH CHECK (true);

-- Job Expenses table
CREATE TABLE public.job_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  value NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to job_expenses" ON public.job_expenses FOR ALL USING (true) WITH CHECK (true);
