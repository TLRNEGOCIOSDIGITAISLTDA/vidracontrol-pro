-- Adiciona número sequencial de orçamento (ex: 001/26)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- Índice para busca eficiente por usuário
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(user_id, quote_number);

-- Backfill: atribui números sequenciais aos orçamentos existentes sem número
WITH numbered_quotes AS (
  SELECT
    id,
    TO_CHAR(created_at AT TIME ZONE 'UTC', 'YY') AS yr,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY')
      ORDER BY created_at ASC
    ) AS seq
  FROM quotes
  WHERE quote_number IS NULL
)
UPDATE quotes
SET quote_number = LPAD(numbered_quotes.seq::text, 3, '0') || '/' || numbered_quotes.yr
FROM numbered_quotes
WHERE quotes.id = numbered_quotes.id;
