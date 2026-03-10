# Histórico de Correções — Fluxo de Cadastro e Confirmação de E-mail

## Problema inicial
Após o usuário se cadastrar e clicar no link de confirmação de e-mail enviado pelo Supabase,
a URL de redirecionamento abria a raiz do app (`/`) em vez da página de login (`/login`).
Em seguida, ao tentar acessar `/login` diretamente via URL, o Vercel retornava **404 NOT_FOUND**.

---

## Causas encontradas

1. **`emailRedirectTo` incorreto** — a chamada `supabase.auth.signUp()` usava
   `window.location.origin` como destino do redirect, o que aponta para a raiz (`/`) do site.

2. **Ausência de `vercel.json`** — o projeto é um SPA (Vite + React Router). O Vercel,
   sem configuração de rewrite, tenta servir arquivos físicos para cada rota e retorna 404
   para qualquer rota que não seja `/`.

---

## Correções feitas no Supabase

- No painel do Supabase > **Authentication > URL Configuration**:
  - **Site URL:** `https://vidro-lucro-control.vercel.app`
  - **Redirect URLs:** adicionar `https://vidro-lucro-control.vercel.app/login`
  - *(Sem isso o Supabase bloqueia o redirecionamento para URLs não autorizadas)*

---

## Correções feitas no código

**Arquivo:** `src/pages/Signup.tsx` (linha 44)

Antes:
```ts
options: { emailRedirectTo: window.location.origin },
```

Depois:
```ts
options: { emailRedirectTo: "https://vidro-lucro-control.vercel.app/login" },
```

---

## Correções feitas no Vercel

**Arquivo criado:** `vercel.json` (raiz do projeto)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Esse rewrite garante que qualquer rota (`/login`, `/app`, `/orcamento-publico/:id`, etc.)
seja servida pelo `index.html`, deixando o React Router resolver a navegação no browser.

---

## Arquivos alterados

| Arquivo | Tipo | Alteração |
|---|---|---|
| `src/pages/Signup.tsx` | Modificado | `emailRedirectTo` corrigido |
| `vercel.json` | Criado | Rewrite SPA adicionado |

---

## Checklist de teste futuro

- [ ] Criar nova conta com e-mail válido
- [ ] Verificar que o e-mail de confirmação chega
- [ ] Clicar no link do e-mail e confirmar que redireciona para `/login`
- [ ] Confirmar que não aparece 404 no Vercel
- [ ] Fazer login com a conta recém-criada e acessar o app normalmente
- [ ] Testar em modo anônimo/aba privada para evitar cache
