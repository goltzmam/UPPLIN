
## Diagnóstico (por que a UX “antiga” volta)
Pelo que você descreveu (acontece **no Preview**, em **mobile/desktop/tablet**, e é **aleatório**), isso é praticamente assinatura de **cache/Service Worker entregando uma versão antiga** do app em alguns refreshes.

No seu `vite.config.ts`, existe uma regra que **cacheia navegação (HTML)** com `NetworkFirst` e ainda por cima com `networkTimeoutSeconds: 3`. Isso pode causar exatamente esse comportamento:
- Se a rede demorar > 3s (ou der uma oscilada), o Service Worker responde com o **HTML do cache** (que pode ser de uma build antiga).
- Esse HTML antigo referencia bundles/estilos da versão antiga → “volta a UX antiga” e às vezes aparece até erro de runtime por chunks misturados.

Além disso, **no Preview** você está mudando o app o tempo todo; manter Service Worker ativo lá costuma ser receita para inconsistência.

## Objetivo
1) **No Preview:** impedir qualquer cache de PWA/SW (sem “voltar versão”).
2) **No Published:** manter PWA, mas de forma que **não exista chance de voltar UI antiga** (e sem misturar assets).

---

## O que vou mudar (alto nível)
### A) Desativar Service Worker no Preview (fix definitivo para esse ambiente)
- Ajustar `src/registerSW.ts` para **só registrar SW** no domínio publicado.
- Em Preview: não registra, e se já tiver SW registrado, **desregistra e limpa caches**.

Isso remove a causa principal do “volta aleatório” no Preview.

### B) Parar de cachear HTML/navegações (ou tornar isso seguro)
No `vite.config.ts`, vou ajustar o `runtimeCaching` de navegação:
- Remover `networkTimeoutSeconds: 3` (principal gatilho de “volta aleatório”).
- Opção mais “garantida”: trocar navegação para `NetworkOnly` (não cacheia HTML).
  - Resultado: você perde fallback offline do HTML, mas ganha consistência total de versão (prioridade agora).
- Manter cache para fonts e assets versionados (ok).

### C) “Build Guard”: detectar versão diferente e forçar atualização (extra blindagem)
Adicionar um mecanismo simples para nunca ficar preso numa UI antiga:
- Gerar um arquivo `version.json` a cada build (timestamp/hash).
- No boot do app (`src/main.tsx`), buscar esse `version.json` com `cache: "no-store"`.
- Se o valor mudou, então:
  - limpa `caches`
  - desregistra SW
  - recarrega a página

Isso cria uma “trava” que impede o cliente de permanecer numa versão antiga por cache.

### D) Tornar update do SW mais agressivo no Published (sem depender só do “onNeedRefresh”)
No `src/registerSW.ts`:
- Usar callback `onRegistered` para fazer `registration.update()` em intervalos (ex.: 60–120s) no Published.
- Logar no console um “Build ID” (para você ver claramente quando mudou de versão).

---

## Passo a passo de implementação (arquivos)
1) **`src/registerSW.ts`**
   - Adicionar detecção de ambiente por hostname:
     - Se for Preview (ex.: contém `id-preview--` ou `lovableproject.com`), então:
       - não registrar SW
       - tentar `navigator.serviceWorker.getRegistrations()` → `unregister()`
       - limpar `caches`
   - Se for Published:
       - registrar normalmente
       - manter `onNeedRefresh` (limpar caches + reload)
       - adicionar `onRegistered` com `registration.update()` periódico

2) **`vite.config.ts`**
   - Ajustar `VitePWA.workbox.runtimeCaching` para navegações:
     - Remover `networkTimeoutSeconds: 3`
     - Preferencialmente mudar handler para `NetworkOnly` para requests `request.mode === "navigate"`
   - Manter caches de fonts.

3) **Gerar `version.json` por build**
   - Adicionar um pequeno plugin no próprio `vite.config.ts` (sem dependência nova) usando o hook `generateBundle` para criar `version.json` com timestamp.
   - Garantir que `globPatterns` continue **sem incluir html/json** para não precachear.

4) **`src/main.tsx`**
   - Antes do `createRoot(...).render(<App />)`, rodar `ensureLatestVersion()`:
     - fetch `/version.json` com `cache: "no-store"`
     - comparar com `localStorage`
     - se mudou: limpar caches + unregister SW + `location.reload(true)` (fallback: `location.reload()`)

5) (Opcional, mas recomendo) **Adicionar um “Resetar cache” escondido**
   - Um botão em um menu/admin/debug (ou via `?debug=1`) que executa a mesma rotina de limpar caches + unregister + reload.
   - Isso ajuda quando algum navegador fica “teimoso”.

---

## Como vamos validar (checklist rápido)
### No Preview (principal)
1) Abrir Preview no mobile/desktop/tablet.
2) Confirmar no console: “SW disabled on preview” (vamos adicionar log).
3) Fazer 2–3 updates pequenos e dar refresh várias vezes:
   - não pode mais “voltar UX antiga”.

### No Published
1) Publicar.
2) Abrir site publicado em 2 dispositivos.
3) Confirmar no console: buildId atual.
4) Publicar uma alteração pequena e ver:
   - ou atualiza sozinho (auto reload)
   - ou (no pior caso) detecta `version.json` diferente e força refresh “limpo”
   - sem voltar design antigo.

---

## Riscos / trade-offs (transparentes)
- Se eu trocar navegação para `NetworkOnly`, o app pode ficar menos “offline-friendly” (mas elimina a regressão de UI por cache de HTML, que hoje está te travando).
- A limpeza agressiva de caches pode causar 1 reload extra após publish (normal, mas controlado).

---

## Resultado esperado
- Preview: “nunca mais volta designer antigo” porque não existe SW/caches interferindo.
- Published: atualiza com consistência; sem assets misturados e sem regressão de UX após refresh.

