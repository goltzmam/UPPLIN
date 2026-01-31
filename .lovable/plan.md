

# Plano: URLs Amigáveis para Eventos

## Visão Geral
Transformar as URLs de eventos de UUIDs técnicos para slugs amigáveis com código único, tornando os links mais legíveis e compartilháveis.

**Antes:** `/evento/cccccccc-cccc-cccc-cccc-cccccccccccc`
**Depois:** `/evento/tomorrowland-brasil-2026-5545`

---

## O Que Será Feito

### 1. Adicionar Campo Slug na Tabela de Eventos
- Novo campo `slug` único e indexado na tabela `events`
- Formato: nome-do-evento-XXXX (4 dígitos aleatórios)
- Exemplo: `festa-junina-sp-2746`

### 2. Geração Automática do Slug
- Trigger que gera o slug automaticamente quando o evento é criado/atualizado
- Converte título para URL-friendly (remove acentos, espaços → hífens)
- Adiciona 4 dígitos aleatórios para garantir unicidade
- Mesmo título → slugs diferentes (ex: `rock-in-rio-1234`, `rock-in-rio-5678`)

### 3. Atualizar Busca de Eventos
- Página do evento busca primeiro por slug, depois por UUID (compatibilidade)
- URLs antigas com UUID continuam funcionando

### 4. Atualizar Links em Todo o App
- Cards de eventos → usam slug
- Feed TikTok → usam slug  
- Notificações → usam slug
- Buscas → usam slug
- Todos os ~23 arquivos que linkam para `/evento/`

---

## Detalhes Técnicos

### Migração do Banco de Dados

```sql
-- Adiciona coluna slug
ALTER TABLE events ADD COLUMN slug TEXT UNIQUE;
CREATE INDEX idx_events_slug ON events(slug);

-- Função para gerar slug
CREATE FUNCTION generate_event_slug()
  -- Converte título para slug (remove caracteres especiais)
  -- Adiciona 4 dígitos aleatórios
  -- Verifica unicidade e ajusta se necessário
  
-- Trigger automático
CREATE TRIGGER generate_event_slug_trigger
BEFORE INSERT OR UPDATE ON events
```

### Exemplo de Geração
| Título do Evento | Slug Gerado |
|-----------------|-------------|
| Festa do Ano 2026 | festa-do-ano-2026-3847 |
| Tomorrowland Brasil | tomorrowland-brasil-9156 |
| Rock in Rio | rock-in-rio-2024-4721 |

### Componentes Atualizados
- `EventCard.tsx` - usa slug no Link
- `Evento.tsx` - busca por slug ou UUID
- `FeedEventCard.tsx`, `DesktopFeedCard.tsx` - links atualizados
- Todos os outros componentes que linkam para eventos

---

## Compatibilidade

- URLs antigas com UUID continuam funcionando indefinidamente
- Busca tenta slug primeiro, depois UUID como fallback
- Eventos existentes recebem slug automaticamente via migration
- Novos eventos geram slug no momento da criação

---

## Benefícios

- **SEO**: URLs descritivas melhoram indexação
- **Compartilhamento**: Links mais legíveis e confiáveis
- **Profissional**: Visual mais polido para organizadores
- **Curto**: 4 dígitos vs 36 caracteres do UUID

