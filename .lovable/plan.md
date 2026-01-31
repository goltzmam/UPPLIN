
# Plano: Corrigir Bug de UI Antiga Persistindo no Preview Após Publish

## Problema Identificado

O Preview do Lovable usa Vite em modo desenvolvimento (DEV), onde:
- Nao existe `version.json` (so e gerado no build de producao)
- A logica de limpeza de cache em `main.tsx` pula quando `import.meta.env.DEV === true`
- Quando voce alterna entre Preview e Published, o navegador mantem cache de modulos/estado antigo

## Solucao Tecnica

### Abordagem: "Build Timestamp Reload"

1. Injetar um timestamp de build via Vite que muda a cada hot reload
2. Comparar esse timestamp com o armazenado em sessionStorage
3. Se diferente, limpar React Query cache e forcar reload da pagina

### Arquivos a Modificar

#### 1. `vite.config.ts`
Adicionar um plugin que injeta `BUILD_TIMESTAMP` como variavel global em tempo de desenvolvimento:

```text
+----------------------------------+
|  Vite Dev Server (HMR)           |
|  - Gera BUILD_TIMESTAMP a cada   |
|    reload do modulo              |
+----------------------------------+
          |
          v
+----------------------------------+
|  main.tsx                        |
|  - Compara BUILD_TIMESTAMP com   |
|    sessionStorage                |
|  - Se diferente: limpa tudo      |
|    e recarrega                   |
+----------------------------------+
```

#### 2. `src/main.tsx`
Adicionar logica de verificacao de timestamp:
- Ler `window.__BUILD_TIMESTAMP__` (injetado pelo Vite)
- Comparar com `sessionStorage.getItem('upplin_build_ts')`
- Se diferente: limpar caches e forcar `window.location.reload()`

#### 3. `src/lib/version-check.ts`
Adicionar funcao para limpar React Query cache globalmente:
- Acessar o QueryClient via referencia global
- Chamar `queryClient.clear()` para limpar cache em memoria

### Fluxo de Funcionamento

```text
Usuario faz alteracao no codigo
              |
              v
Lovable rebuilda o projeto
              |
              v
Vite injeta novo BUILD_TIMESTAMP
              |
              v
main.tsx detecta mudanca de timestamp
              |
              v
Limpa: Cache Storage + SW + React Query + sessionStorage
              |
              v
window.location.reload() - UI fresca
```

## Detalhes de Implementacao

### `vite.config.ts`
- Criar plugin `devBuildTimestampPlugin` que:
  - So roda em modo desenvolvimento
  - Injeta `window.__BUILD_TIMESTAMP__` no HTML via `transformIndexHtml`

### `src/main.tsx`
- Antes de `createRoot()`:
  - Verificar se `window.__BUILD_TIMESTAMP__` existe
  - Comparar com valor em `sessionStorage`
  - Se diferente, executar limpeza completa e reload

### `src/App.tsx`
- Expor o `queryClient` como variavel global para limpeza externa:
  - `window.__QUERY_CLIENT__ = queryClient`

### `src/lib/version-check.ts`
- Adicionar `clearReactQueryCache()`:
  - Acessar `window.__QUERY_CLIENT__`
  - Chamar `.clear()` se disponivel

## Beneficios

1. **Corrige o bug definitivamente**: UI sempre atualizada no Preview
2. **Funciona em modo DEV**: Nao depende de `version.json`
3. **Minimo overhead**: So executa quando ha mudanca real
4. **Sem impacto em producao**: Plugin so ativo em desenvolvimento

## Secao Tecnica

### Codigo do Plugin Vite (vite.config.ts)

```typescript
function devBuildTimestampPlugin(): Plugin {
  return {
    name: "dev-build-timestamp",
    apply: "serve", // Apenas em modo desenvolvimento
    transformIndexHtml() {
      const timestamp = Date.now().toString();
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: `window.__BUILD_TIMESTAMP__ = "${timestamp}";`,
          injectTo: "head-prepend",
        },
      ];
    },
  };
}
```

### Codigo de Verificacao (main.tsx)

```typescript
const BUILD_TS_KEY = "upplin_build_ts";

async function ensureFreshBuild(): Promise<void> {
  const currentTs = (window as any).__BUILD_TIMESTAMP__;
  if (!currentTs) return; // Nao em dev ou nao injetado
  
  const storedTs = sessionStorage.getItem(BUILD_TS_KEY);
  
  if (storedTs && storedTs !== currentTs) {
    console.log("[Build] Nova versao detectada, limpando cache...");
    sessionStorage.setItem(BUILD_TS_KEY, currentTs);
    
    await clearAllCaches();
    await unregisterAllSW();
    clearReactQueryCache();
    
    window.location.reload();
    return;
  }
  
  if (!storedTs) {
    sessionStorage.setItem(BUILD_TS_KEY, currentTs);
  }
}
```

### Arquivos Modificados

| Arquivo | Tipo de Alteracao |
|---------|------------------|
| `vite.config.ts` | Adicionar plugin `devBuildTimestampPlugin` |
| `src/main.tsx` | Adicionar `ensureFreshBuild()` no inicio |
| `src/App.tsx` | Expor `queryClient` como `window.__QUERY_CLIENT__` |
| `src/lib/version-check.ts` | Adicionar `clearReactQueryCache()` |
