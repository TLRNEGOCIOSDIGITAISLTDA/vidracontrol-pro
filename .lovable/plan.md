

## Plano: Configurar PWA (Progressive Web App)

O app será instalável no celular como um aplicativo real, com ícone na tela inicial, tela cheia (sem barra do navegador) e carregamento offline básico.

### Arquivos a criar/modificar

1. **`public/manifest.json`** — Manifesto PWA com nome, cores, ícones e configuração de tela cheia (display: standalone)

2. **`public/sw.js`** — Service Worker básico para cache de assets estáticos e funcionamento offline

3. **`public/icons/`** — Gerar ícones PWA nos tamanhos padrão (192x192 e 512x512) usando o favicon existente como base, com fundo azul (#1e40af) e as iniciais "VC"

4. **`index.html`** — Adicionar:
   - `<link rel="manifest" href="/manifest.json">`
   - `<meta name="theme-color" content="#1e40af">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<link rel="apple-touch-icon" href="/icons/icon-192.png">`

5. **`src/main.tsx`** — Registrar o Service Worker na inicialização do app

### Resultado

- O navegador vai mostrar o botão "Instalar" automaticamente
- No Android: menu → "Adicionar à tela inicial" instala como app
- No iPhone: Compartilhar → "Adicionar à Tela de Início"
- O app abre em tela cheia com a cor tema azul do VidraControl

