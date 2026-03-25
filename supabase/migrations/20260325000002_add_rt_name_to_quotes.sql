-- Adiciona nome do Responsável Técnico na tabela quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS rt_name TEXT;
