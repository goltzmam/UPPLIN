# Corrigir tela em branco no iPad (Apple 2.1(a))

A splash screen foi descartada como causa (não existe GIF nem plugin de splash). O plano abaixo ataca as causas restantes que produzem exatamente o sintoma "abre e fica em branco" só no aparelho do revisor.

## Causas prováveis (por ordem de risco)

1. **Sintaxe moderna demais para o WKWebView do revisor** — o build não define alvo de compatibilidade. Se um único pacote enviar sintaxe recente, o Safari falha ao *parsear* o bundle e nada renderiza: tela branca total, sem erro visível.
2. **Falha ao baixar um "chunk" da tela inicial** — as páginas são carregadas sob demanda. Se um desses arquivos falhar, a tela pode ficar presa no carregamento indefinidamente.
3. **Sem limite de tempo no boot** — hoje não existe nada que detecte "o app não montou" e mostre uma saída ao usuário.
4. **Layout de tablet** — precisa ser conferido na largura exata do iPad Air M3 (1180x820 e 820x1180), incluindo o modo Split View.

## O que vou fazer

### 1. Garantir compatibilidade do build
- Definir alvo de build compatível com Safari/iPadOS mais antigos (es2019 / safari14) e um `browserslist` equivalente, para que todo o código enviado seja parseável no WKWebView.
- Rodar o build e confirmar que nenhuma sintaxe fora do alvo sobra no bundle.

### 2. Boot à prova de falhas
- Tratar erro de carregamento de módulo dinâmico: uma tentativa automática de recarregar (uma única vez, com marcação em sessão para não virar loop) e, se ainda falhar, tela de erro com botão "Recarregar".
- Adicionar um "watchdog" de boot: se o React não montar em ~10s, substituir o placeholder por uma tela com logo, mensagem e botão de recarregar — nunca uma tela branca.
- Garantir que o fallback de `Suspense` e o `ErrorBoundary` cubram todas as rotas, inclusive a rota inicial.

### 3. Tela inicial resiliente
- Revisar a Home para que, mesmo sem rede ou com erro no backend, ela renderize cabeçalho, navegação e um estado vazio com "Tentar novamente" — nunca um container vazio.

### 4. Validação em viewport de iPad
- Rodar o app em navegador headless nas dimensões do iPad Air M3 (retrato e paisagem) e em Split View, com e sem rede para o backend, capturando telas de cada cenário e conferindo o console.

### 5. Ajustes do Capacitor
- Revisar o bloco `server` do `capacitor.config.ts` (hostname/scheme) e confirmar que não há URL remota — apenas os arquivos empacotados.
- Confirmar que os ícones/orientações permitem iPad em ambas as orientações.

## Detalhes técnicos

- `vite.config.ts`: adicionar `build: { target: ['es2019', 'safari14'], sourcemap: false }`.
- `src/main.tsx`: listener de `vite:preloadError` + `window.onerror` com retry único via `sessionStorage`, e `setTimeout` de watchdog cancelado quando o React monta.
- `src/App.tsx`: revisar o `Suspense` raiz e o `AppBootFallback`.
- Verificação: script Playwright em `/tmp/browser/ipad/` com `viewport 1180x820` e `820x1180`, screenshots + dump de console.

## Fora de escopo

Nenhuma mudança de regra de negócio, banco de dados ou visual do app além dos estados de erro/carregamento.
