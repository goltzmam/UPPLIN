
## Objetivo
Corrigir de forma definitiva a inconsistência visual (“voltou pro designer antigo”) e o problema de responsividade no mobile/tablet onde a BottomNav está cobrindo o botão/CTA do feed.

---

## O que está acontecendo hoje (diagnóstico)
1. **O offset do feed está “chutado”**:
   - O feed usa `--app-bottom-offset` para empurrar os overlays (info do evento + CTA e barra de ações) para cima.
   - Porém, em `src/pages/Index.tsx` esse valor está fixo em **72px**:
     ```ts
     style={{ "--app-bottom-offset": "calc(72px + env(safe-area-inset-bottom, 0px))" }}
     ```
   - Só que a BottomNav real (com `pt-4`, labels, safe-area, e principalmente o UP maior) pode ficar **maior que 72px**, então **ela cobre o CTA**.

2. **No desktop, o CTA ainda está no estilo antigo (branco)**:
   - Em `src/components/feed/DesktopTikTokFeed.tsx` o botão “Comprar” ainda está:
     ```tsx
     className="... bg-white text-black ..."
     ```
   - Isso dá a sensação de que “voltou pro designer antigo”, porque no PC não está com o degradê da marca.

---

## Estratégia de correção (robusta)
### A) Tornar o `--app-bottom-offset` dinâmico (medido de verdade)
Em vez de definir 72px no `Index.tsx`, vamos fazer a própria **BottomNav medir a altura real dela** e escrever isso em uma CSS variable global.

**Onde**: `src/components/layout/BottomNav.tsx`

**Como**:
- Adicionar `ref` no `<motion.nav ...>` para medir a altura real.
- Usar `ResizeObserver` (e fallback com `window.resize`) para atualizar em:
  - troca de orientação (portrait/landscape)
  - mudanças de safe-area
  - mudança de layout do botão UP
- Setar a variável global em `document.documentElement`:
  - `--app-bottom-offset: <altura-da-bottomnav>px`
- Quando a BottomNav estiver escondida (rotas hidden) ou desmontar, limpar/setar `--app-bottom-offset` para `0px` para não “sobrar espaço” em outras telas.

**Resultado**: qualquer overlay que use `var(--app-bottom-offset)` fica automaticamente acima da BottomNav, sem precisar ajustar “na mão” e sem quebrar quando você muda o tamanho do UP.

---

### B) Remover o hardcode de 72px no MobileFeed
**Onde**: `src/pages/Index.tsx`

**Mudança**:
- Remover o `style={{ "--app-bottom-offset": "calc(72px + ...)" }}` do wrapper do feed.
- Deixar o valor ser controlado globalmente pela BottomNav (passo A).

**Resultado**: evita conflito de variáveis (o valor “local” do Index hoje pode sobrescrever o global e manter o bug).

---

### C) Ajustar TikTokFeed para depender apenas do offset real
**Onde**: `src/components/feed/TikTokFeed.tsx`

**Ajustes**:
- Manter o uso de `var(--app-bottom-offset)` (já está certo), mas trocar os fallbacks “72px” por fallback “0px” (ou garantir que sempre exista).
- Revalidar os dois pontos principais:
  1) Barra de ações direita:
     ```ts
     bottom: calc(var(--app-bottom-offset) + 40px)
     ```
  2) Bloco de info + CTA:
     ```ts
     pb-[calc(var(--app-bottom-offset)+20px)]
     ```
- Ajustar os “+20px/+40px” se necessário (agora com offset correto, pode reduzir para ficar mais minimalista sem risco de sobrepor).

**Resultado**: no mobile/tablet o CTA nunca fica por baixo da BottomNav.

---

### D) Corrigir o “designer antigo” do CTA no DesktopTikTokFeed
**Onde**: `src/components/feed/DesktopTikTokFeed.tsx`

**Mudança**:
- Trocar o botão branco (`bg-white text-black`) por **CTA com degradê da marca**, preferencialmente reaproveitando o padrão do projeto:
  - classe `.btn-gradient` (já existe no `src/index.css`)
  - ou `Button variant="gradient"` (já existe em `src/components/ui/button.tsx`)
- Manter UX minimalista:
  - pill button (rounded-full)
  - texto branco
  - hover suave (sem ficar “pesado”)

**Resultado**: desktop fica consistente com o mobile e com a identidade visual (logo/UP).

---

## Arquivos que serão alterados
1. `src/components/layout/BottomNav.tsx`
   - Medição da altura real + escrita do `--app-bottom-offset` global.
2. `src/pages/Index.tsx`
   - Remover hardcode do `--app-bottom-offset`.
3. `src/components/feed/TikTokFeed.tsx`
   - Garantir cálculos usando offset real e ajustar espaçamentos finais.
4. `src/components/feed/DesktopTikTokFeed.tsx`
   - Atualizar CTA “Comprar” do desktop para degradê da marca (remover estilo branco antigo).

---

## Checklist de testes (para garantir que “resolveu de uma vez”)
1. **Mobile** (rota `/`):
   - Ver se o botão “Comprar/Participar” não é coberto pela BottomNav.
   - Testar em iPhone (safe-area) e Android.
2. **Tablet**:
   - Testar portrait e landscape (altura do BottomNav muda).
3. **Desktop**:
   - Confirmar que o CTA “Comprar” no DesktopTikTokFeed está com o degradê e não branco.
4. **Rotas onde BottomNav é escondida** (`/checkout`, `/organizador/...`, `/admin`):
   - Confirmar que o `--app-bottom-offset` vira 0 e não cria espaçamento/bug visual.

---

## Observações / decisões de UX (mantendo minimalismo)
- O degradê será aplicado no CTA principal (comprar) para reforçar ação primária.
- O sistema de offset dinâmico evita “ajustes manuais” a cada alteração do tamanho do UP, labels, paddings ou safe-area.

