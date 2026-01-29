

# Plano: Remover "Por você" da BottomNav e Adicionar Maps/Copy na Barra Lateral

## Resumo

Vou remover o item "Por você" da navegação inferior (BottomNav) e adicionar dois novos botões na barra de ações lateral do TikTokFeed: um para abrir o Maps com a localização do evento e outro para copiar o link do evento.

---

## Alterações

### 1. Remover "Por você" da BottomNav

**Arquivo**: `src/components/layout/BottomNav.tsx`

- Remover o item `{ icon: Search, label: "Por você", path: "/eventos" }` do array `navItems`
- A navegação ficará com: Início, Criar, Salvos, Perfil

### 2. Adicionar Botões Maps e Copy na Barra Lateral

**Arquivo**: `src/components/feed/TikTokFeed.tsx`

- Adicionar ícone **MapPin** (Maps) que abre o Google Maps com o endereço do evento
- Adicionar ícone **Copy** que copia o link do evento para a área de transferência
- Ambos ficarão na barra lateral direita, junto com like, comentários, salvar e compartilhar

---

## Detalhes Técnicos

### Botão Maps
- Usa o ícone `MapPin` ou `Navigation` do lucide-react
- Ao clicar, abre `https://maps.google.com/?q={endereço}` em nova aba
- Só aparece se o evento tiver endereço (`item.addressText` ou `item.venueName`)

### Botão Copy
- Usa o ícone `Copy` ou `Link` do lucide-react  
- Ao clicar, copia a URL do evento (`/evento/{id}`) para o clipboard
- Mostra feedback visual/toast de confirmação "Link copiado!"

### Ordem dos ícones na barra lateral
1. Avatar do organizador (existente)
2. Like (existente)
3. Comentários (existente)
4. Salvar (existente)
5. **Maps (novo)**
6. **Copy (novo)**
7. Compartilhar (existente)

