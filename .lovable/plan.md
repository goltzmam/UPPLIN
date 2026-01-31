
# Plano: Corrigir Todos os Bugs da Plataforma

## Problemas Identificados

### 1. Feed nao rola / trava (PC, Android, iPhone)
**Causa**: O componente TikTokFeed.tsx tem 842 linhas com logica excessivamente complexa. O scroll esta sendo interceptado pelo handler `handleScroll` que chama `setPauseAll(true)` a cada frame, causando re-renders constantes.

### 2. Audio do video tocando sozinho
**Causa**: Existem DUAS implementacoes de video player separadas:
- `FeedRow` no TikTokFeed.tsx (mobile) - tem logica de video inline
- `FeedVideoPlayer.tsx` (desktop) - componente separado

A logica de `hardStop` nao esta sendo propagada corretamente entre as duas implementacoes.

### 3. Secoes travando (Eventos, Explorar, Perfil)
**Causa**: O AnimatePresence no Index.tsx e App.tsx esta causando conflitos de re-render. A cada mudanca de aba, todos os componentes sao desmontados/remontados.

### 4. Navbar cobrindo o feed
**Causa**: O calculo de `--app-bottom-offset` esta com timing incorreto. O valor padrao de `80px` nao e suficiente, e o ResizeObserver esta atrasando a medicao.

## Solucao Tecnica

### Fase 1: Simplificar o Feed (Prioridade Maxima)

**TikTokFeed.tsx** - Refatoracao cirurgica:
- Remover o `pauseAll` state que causa travamentos
- Usar IntersectionObserver ao inves de scroll handler para detectar item ativo
- Delegar TODA logica de video para FeedVideoPlayer
- Remover video inline do FeedRow

```text
ANTES (bugado):
+------------------+
|   TikTokFeed     |
|   - pauseAll     | <-- Estado que causa re-renders
|   - handleScroll | <-- Throttle 16ms muito frequente
|   - FeedRow      |
|     - <video>    | <-- Video duplicado inline
|     - hardStop   | <-- Logica duplicada
+------------------+

DEPOIS (corrigido):
+------------------+
|   TikTokFeed     |
|   - activeIndex  | <-- Apenas um estado
|   - Intersection | <-- Observer passivo
|   - FeedRow      |
|     - FeedVideo  | <-- Componente unico
|       Player     |    
+------------------+
```

### Fase 2: Unificar Video Player

**FeedVideoPlayer.tsx** - Unica fonte de verdade para audio/video:
- Garantir que `hardStop` limpe completamente o pipeline de audio
- Adicionar `pauseAll` como prop externa (nao estado interno)
- Mover toda logica de visibilitychange para ca

### Fase 3: Corrigir Layout da Navbar

**BottomNav.tsx**:
- Aumentar offset padrao para `100px` (mais seguro)
- Usar `calc(env(safe-area-inset-bottom) + 80px)` como fallback CSS puro
- Remover dependencia de ResizeObserver para valor inicial

**TikTokFeed.tsx** - Ajustar posicionamento:
- Usar `pb-[120px]` fixo no container do conteudo
- Garantir que action bar e info overlay usem offset correto

### Fase 4: Simplificar Transicoes de Pagina

**Index.tsx**:
- Remover AnimatePresence desnecessario nas abas
- Usar transicao CSS simples ao inves de Framer Motion

**App.tsx**:
- Manter AnimatePresence apenas para rotas, nao para conteudo interno

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/components/feed/TikTokFeed.tsx` | Remover pauseAll, usar IntersectionObserver, delegar video para FeedVideoPlayer |
| `src/components/feed/FeedVideoPlayer.tsx` | Adicionar prop forceStop, melhorar hardStop |
| `src/components/layout/BottomNav.tsx` | Aumentar offset padrao, CSS fallback |
| `src/pages/Index.tsx` | Simplificar transicoes, remover AnimatePresence das abas |
| `src/index.css` | Adicionar --app-bottom-offset fallback global |

## Detalhes de Implementacao

### TikTokFeed.tsx - Mudancas Principais

1. Substituir scroll handler por IntersectionObserver:

```typescript
// REMOVER: pauseAll state e pauseAllTimeoutRef
// REMOVER: handleScrollRaw com setPauseAll

// ADICIONAR: IntersectionObserver para detectar item ativo
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          const index = parseInt(entry.target.getAttribute("data-index") || "0");
          setActiveIndex(index);
        }
      });
    },
    { threshold: 0.7 }
  );
  // Observar cada item do feed
}, []);
```

2. Simplificar FeedRow para usar FeedVideoPlayer:

```typescript
// REMOVER: videoRef, hardStop inline, useEffect de video
// USAR: <FeedVideoPlayer isActive={isActive} forceStop={false} />
```

### BottomNav.tsx - CSS Fallback

```css
/* Fallback global em index.css */
:root {
  --app-bottom-offset: 100px;
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  :root {
    --app-bottom-offset: calc(80px + env(safe-area-inset-bottom, 0px));
  }
}
```

### FeedVideoPlayer.tsx - forceStop Prop

```typescript
interface FeedVideoPlayerProps {
  videoUrl: string;
  coverUrl: string | null;
  isActive: boolean;
  forceStop?: boolean; // Nova prop para controle externo
  className?: string;
}

// No useEffect principal:
if (!isActive || forceStop) {
  hardStop(video);
  return;
}
```

### Index.tsx - Transicoes Simplificadas

```typescript
// REMOVER: AnimatePresence nas abas
// USAR: transicao CSS simples
<div className={cn(
  "h-full w-full transition-opacity duration-150",
  activeTab === "foryou" ? "opacity-100" : "opacity-0 absolute"
)}>
  <TikTokFeed ... />
</div>
```

## Ordem de Execucao

1. index.css - Adicionar CSS fallback para offset
2. BottomNav.tsx - Aumentar offset padrao
3. FeedVideoPlayer.tsx - Adicionar forceStop prop
4. TikTokFeed.tsx - Refatorar para usar IntersectionObserver e FeedVideoPlayer
5. Index.tsx - Simplificar transicoes

## Beneficios Esperados

- Feed rola suavemente sem travamentos
- Audio para imediatamente ao trocar de video
- Navbar nao cobre mais o conteudo
- Transicoes de pagina fluidas
- Menor uso de CPU/memoria
