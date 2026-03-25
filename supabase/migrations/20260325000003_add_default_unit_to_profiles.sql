-- Unidade de medida padrão do usuário: 'cm' ou 'mm'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_unit TEXT NOT NULL DEFAULT 'mm';
