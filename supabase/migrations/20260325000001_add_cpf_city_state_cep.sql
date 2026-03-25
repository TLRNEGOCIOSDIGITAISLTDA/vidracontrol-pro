-- Adiciona CPF na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT NOT NULL DEFAULT '';

-- Adiciona cidade, estado e CEP na tabela company_info
ALTER TABLE public.company_info
  ADD COLUMN IF NOT EXISTS city  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cep   TEXT NOT NULL DEFAULT '';
