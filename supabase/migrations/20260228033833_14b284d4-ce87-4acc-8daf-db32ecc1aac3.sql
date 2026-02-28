
-- Create profiles table for WhatsApp number
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add client_phone to quotes
ALTER TABLE public.quotes ADD COLUMN client_phone TEXT NOT NULL DEFAULT '';

-- Create bucket for quote PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-pdfs', 'quote-pdfs', true);

-- Storage policies for quote-pdfs bucket
CREATE POLICY "Users upload own quote pdfs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read quote pdfs" ON storage.objects
  FOR SELECT USING (bucket_id = 'quote-pdfs');

CREATE POLICY "Users delete own quote pdfs" ON storage.objects
  FOR DELETE USING (bucket_id = 'quote-pdfs' AND auth.uid() IS NOT NULL);
