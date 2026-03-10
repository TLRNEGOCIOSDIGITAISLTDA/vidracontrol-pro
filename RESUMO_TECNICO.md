# Histórico de Correções — VidraControl

---

## Sessão 1 — Fluxo de Cadastro e Confirmação de E-mail

### Problema inicial
Após o usuário se cadastrar e clicar no link de confirmação de e-mail enviado pelo Supabase,
a URL de redirecionamento abria a raiz do app (`/`) em vez da página de login (`/login`).
Em seguida, ao tentar acessar `/login` diretamente via URL, o Vercel retornava **404 NOT_FOUND**.

---

### Causas encontradas

1. **`emailRedirectTo` incorreto** — a chamada `supabase.auth.signUp()` usava
   `window.location.origin` como destino do redirect, o que aponta para a raiz (`/`) do site.

2. **Ausência de `vercel.json`** — o projeto é um SPA (Vite + React Router). O Vercel,
   sem configuração de rewrite, tenta servir arquivos físicos para cada rota e retorna 404
   para qualquer rota que não seja `/`.

---

### Correções feitas no Supabase

- No painel do Supabase > **Authentication > URL Configuration**:
  - **Site URL:** `https://vidro-lucro-control.vercel.app`
  - **Redirect URLs:** adicionar `https://vidro-lucro-control.vercel.app/login`
  - *(Sem isso o Supabase bloqueia o redirecionamento para URLs não autorizadas)*

---

### Correções feitas no código

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

### Correções feitas no Vercel

**Arquivo criado:** `vercel.json` (raiz do projeto)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Esse rewrite garante que qualquer rota (`/login`, `/app`, `/orcamento-publico/:id`, etc.)
seja servida pelo `index.html`, deixando o React Router resolver a navegação no browser.

---

### Arquivos alterados

| Arquivo | Tipo | Alteração |
|---|---|---|
| `src/pages/Signup.tsx` | Modificado | `emailRedirectTo` corrigido |
| `vercel.json` | Criado | Rewrite SPA adicionado |

---

### Checklist de teste — fluxo de cadastro

- [ ] Criar nova conta com e-mail válido
- [ ] Verificar que o e-mail de confirmação chega
- [ ] Clicar no link do e-mail e confirmar que redireciona para `/login`
- [ ] Confirmar que não aparece 404 no Vercel
- [ ] Fazer login com a conta recém-criada e acessar o app normalmente
- [ ] Testar em modo anônimo/aba privada para evitar cache

---

---

## Sessão 2 — Erro "Signups not allowed" e Divergência Lovable vs Vercel

### Problema: "Signups not allowed for this instance"

Ao tentar criar uma conta diretamente pelo Vercel, o Supabase retornava o erro:

```
Signups not allowed for this instance
```

**Causa:** No painel do Supabase > **Authentication > Providers > Email**, a opção
**"Enable Email Signup"** estava desativada. Isso bloqueia qualquer novo cadastro,
mesmo com as outras configurações corretas.

**Correção:** Ativar "Enable Email Signup" no painel do Supabase.

---

### Descoberta: Lovable preview ≠ deploy Vercel

O ambiente de preview do Lovable (ex: `*.lovable.app`) usa um **Supabase project separado**
ou configurações diferentes de Auth. Por isso, funcionalidades que parecem funcionar no
preview do Lovable podem falhar no deploy real do Vercel — e vice-versa.

**Regra prática:** sempre testar o fluxo de cadastro/login pelo domínio Vercel
(`https://vidro-lucro-control.vercel.app`), nunca confiar só no preview do Lovable
para validar comportamento de Auth.

---

### Ajuste de Site URL e Redirect URLs no Supabase

Configuração completa necessária em **Supabase > Authentication > URL Configuration**:

| Campo | Valor |
|---|---|
| Site URL | `https://vidro-lucro-control.vercel.app` |
| Redirect URLs | `https://vidro-lucro-control.vercel.app/login` |

> **Por que `/login` e não `/`?**
> O link de confirmação de e-mail abre a URL configurada em `emailRedirectTo`.
> Redirecionar para `/login` é mais direto — o usuário já cai na tela de login,
> sem depender do React Router redirecionar da raiz.

---

### Como testar o fluxo de cadastro e confirmação no futuro

1. Acesse `https://vidro-lucro-control.vercel.app/cadastro` em aba anônima
2. Preencha nome, e-mail, WhatsApp e senha válidos
3. Clique em "Criar Conta"
4. Verifique a caixa de entrada do e-mail (incluindo spam)
5. Clique no link de confirmação
6. Deve redirecionar para `https://vidro-lucro-control.vercel.app/login` (sem 404)
7. Faça login — deve entrar no `/app` normalmente

**Se der erro "Signups not allowed":**
- Supabase > Authentication > Providers > Email > ativar "Enable Email Signup"

**Se redirecionar para URL errada:**
- Verificar `emailRedirectTo` em `src/pages/Signup.tsx`
- Verificar Redirect URLs em Supabase > Authentication > URL Configuration

**Se der 404 no Vercel após redirect:**
- Verificar se `vercel.json` existe na raiz com o rewrite `/(.*) → /index.html`

---

---

## Sessão 3 — PWA Mobile-First: Manifest, Service Worker, Code Splitting

### Objetivo
Transformar o app em um PWA instalável e otimizado para uso em campo por vidraceiros,
funcionando bem em conexão 3G/4G e com login persistente.

---

### Problemas encontrados e corrigidos

#### 1. `manifest.json` com `purpose` inválido
O campo `"purpose": "any maskable"` (numa string só) não é suportado por todos os browsers.
O correto é ter **duas entradas separadas** para o mesmo ícone.

#### 2. Fonte Google carregando de forma bloqueante
O `@import url(...)` no início do CSS é **bloqueante** — o browser não renderiza nada
enquanto não baixa a fonte. Em 3G, isso atrasa o primeiro render visivelmente.

#### 3. Timeout de inatividade de 30 minutos
`AuthContext.tsx` deslogava o usuário após 30 min sem interação. Para vidraceiros em campo
(que podem deixar o celular no bolso durante uma obra), isso causava re-login constante.

#### 4. Botões com altura insuficiente
Botões de ação principal (Login, Signup, Salvar) não tinham `size="lg"`, ficando abaixo
de 44px — difícil de tocar com luva ou dedo grande.

#### 5. Bundle JS único de 1.7MB
Sem code splitting, o Vite gerava um arquivo `index.js` de 1.7MB. Em 3G (~1Mbps),
isso leva ~13 segundos para carregar.

#### 6. iPhone sem `apple-mobile-web-app-title` e ícones extras
Sem essa meta tag, o nome do app na tela inicial do iPhone aparecia como a URL truncada.
Também faltavam variantes de ícone para as diferentes resoluções do iOS.

---

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `public/manifest.json` | `purpose` separado em duas entradas (`any` + `maskable`), adicionado `lang: "pt-BR"`, `prefer_related_applications: false`, `screenshots` |
| `public/sw.js` | Bump para v3; cache de fontes Google (gstatic.com); fallback 503 explícito para assets offline |
| `index.html` | `viewport-fit=cover` para notch/dynamic island; `apple-touch-icon` em 152/167/180px; `apple-mobile-web-app-title`; fonte movida para `<link>` não-bloqueante com `media="print"` trick |
| `src/index.css` | Removido `@import` bloqueante da fonte; adicionado `-webkit-tap-highlight-color: transparent`; `font-smoothing`; utilitário `safe-area-top` |
| `src/lib/AuthContext.tsx` | Timeout de inatividade **30 min → 4 horas** |
| `src/pages/Login.tsx` | `size="lg"` no botão; auto-redirect para `/app` se sessão já existe; `InstallBanner` visível antes de logar |
| `src/pages/Signup.tsx` | `size="lg"` no botão principal |
| `src/pages/Profile.tsx` | `size="lg"` no botão Salvar |
| `src/components/app/BottomNav.tsx` | Dot indicador de aba ativa; `active:scale-95` para feedback tátil; altura dinâmica com `env(safe-area-inset-bottom)` |
| `src/components/app/AppHeader.tsx` | Classe `safe-area-top` para suporte a notch e dynamic island |
| `vite.config.ts` | Code splitting manual: `vendor-react`, `vendor-ui`, `vendor-supabase`, `vendor-charts`, `vendor-pdf` — bundle 1.7MB dividido em chunks paralelos |

---

### Estrutura PWA atual (o que já estava funcionando antes desta sessão)

`ProtectedRoute.tsx` já encapsula todas as rotas autenticadas com:
- `<BottomNav />` — barra de navegação inferior fixa
- `<InstallBanner />` — banner de instalação (Android nativo + guia iOS)
- `<div className="pb-bottom-nav">` — padding para conteúdo não ficar sob a nav bar

`usePwaInstall.ts` detecta:
- `beforeinstallprompt` (Android/Chrome) → mostra botão de instalação nativo
- `navigator.standalone` (iOS) → exibe guia passo a passo para adicionar à tela inicial
- `appinstalled` → remove o banner após instalação

---

### Como testar instalação PWA

**Android (Chrome):**
1. Acesse o app pelo Chrome
2. Banner "Instalar VidraControl" aparece automaticamente
3. Toque em "Instalar App" → confirme
4. Ícone aparece na tela inicial; abre sem barra do navegador

**iPhone (Safari — obrigatório):**
1. Acesse pelo Safari (Chrome/Firefox no iOS não suportam instalação PWA)
2. O `InstallBanner` exibe as instruções automaticamente
3. Ícone de Compartilhar (□↑) → "Adicionar à Tela de Início" → Adicionar

**Verificar se o service worker está ativo:**
- Chrome DevTools > Application > Service Workers → deve mostrar `sw.js` como "activated"
- Application > Cache Storage → deve listar `vidracontrol-v3`

---

### O que ainda falta para publicar na Play Store

**Via PWA (Trusted Web Activity — mais simples):**
- Usar `PWABuilder` (pwabuilder.com) ou `Bubblewrap` para gerar o APK/AAB
- Criar `/.well-known/assetlinks.json` no Vercel para associar domínio ao app
- Ícones adicionais: 48px, 72px, 96px, 128px, 144px, 384px (exigidos pelo Google Play)
- Taxa única: USD $25 na Google Play Console

**Via Capacitor (app nativo completo):**
- `npm install @capacitor/core @capacitor/cli`
- `npx cap init VidraControl com.vidracontrol.app`
- `npx cap add android`
- Build Vite → `npx cap copy android` → Android Studio → gerar APK assinado
