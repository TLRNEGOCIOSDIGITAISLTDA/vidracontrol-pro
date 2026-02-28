
-- Allow public (anon) read access to quotes for the public viewer page
CREATE POLICY "Public read quotes by id" ON public.quotes
  FOR SELECT
  USING (true);

-- Allow public (anon) read access to quote_items for the public viewer page  
CREATE POLICY "Public read quote_items" ON public.quote_items
  FOR SELECT
  USING (true);

-- Allow public read of company_info for branding on public page
CREATE POLICY "Public read company_info" ON public.company_info
  FOR SELECT
  USING (true);
