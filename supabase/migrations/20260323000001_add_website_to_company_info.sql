-- Adiciona campo website à tabela company_info
ALTER TABLE company_info ADD COLUMN IF NOT EXISTS website TEXT;
