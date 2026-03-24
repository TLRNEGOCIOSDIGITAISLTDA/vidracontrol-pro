-- Adiciona número sequencial de orçamento (ex: 001/26)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- Índice para busca eficiente por usuário + ano
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(user_id, quote_number);
