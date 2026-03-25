-- Tabela de Responsáveis Técnicos cadastrados por usuário
CREATE TABLE public.responsaveis_tecnicos (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL DEFAULT '',
  whatsapp           TEXT        NOT NULL DEFAULT '',
  email              TEXT        NOT NULL DEFAULT '',
  default_percentage NUMERIC     NOT NULL DEFAULT 0,
  active             BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.responsaveis_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own RTs" ON public.responsaveis_tecnicos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
