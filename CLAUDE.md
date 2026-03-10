# VidraControl — Contexto Técnico para Claude Code

## Stack
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- React Router v6, React Hook Form + Zod, TanStack Query
- Deploy: Vercel (branch `main` → deploy automático)
- Pacote: **bun**

## Decisões técnicas importantes

### SPA + Vercel
O projeto é um SPA. O `vercel.json` na raiz contém um rewrite que redireciona toda
rota para `/index.html`, necessário para o React Router funcionar em deep links.

### Supabase Auth — emailRedirectTo
No `signUp()`, o `emailRedirectTo` aponta fixo para:
`https://vidro-lucro-control.vercel.app/login`
A URL deve estar cadastrada em Authentication > URL Configuration no painel do Supabase.

### Edge Function
`analyze-document` usa Google Gemini 2.5 Flash via Lovable AI Gateway para extrair
dados de notas fiscais a partir de imagens.

### Banco de dados
RLS ativo em todas as tabelas (isolamento por `user_id`).
Configurações da empresa ficam em `company_info` como JSONB (comissão, % NF, etc.).

## Convenções
- Código e comentários em PT-BR
- Não alterar mais do que o solicitado
- Sempre confirmar antes de push destrutivo
