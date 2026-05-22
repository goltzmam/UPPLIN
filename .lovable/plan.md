# Plano: Página de Suporte UPPLIN + textos da App Store

## 1. Criar rota `/suporte`
- Novo arquivo `src/pages/Suporte.tsx` no padrão visual UPPLIN (dark, gradiente neon, sem Header/Footer tradicional, layout mobile-first com BottomNav e TikTokDesktopSidebar).
- Seções:
  - **Hero**: "Estamos aqui pra te ajudar" + subtítulo curto.
  - **Canais de contato** (cards com gradient):
    - E-mail: `contato@upplin.com` (mailto)
    - WhatsApp: `(85) 2010-3399` (wa.me/558520103399)
    - Telefone: tel:+558520103399
  - **Para organizadores**: bloco com link para `/organizador` e e-mail de suporte premium.
  - **Acesso rápido**: links para FAQ (`/faq`), Termos, Privacidade.
  - **Horário de atendimento**: Seg–Sex, 9h–18h (BRT).
- SEO: `<title>` "Suporte UPPLIN — Fale com a gente", meta description, H1 único, canonical.

## 2. Registrar rota em `src/App.tsx`
- Adicionar `<Route path="/suporte" element={<Suporte />} />` na seção pública.

## 3. Atualizar Footer e llms.txt
- `src/components/layout/Footer.tsx`: adicionar link "Suporte" na coluna Suporte (acima de FAQ).
- `public/llms.txt`: adicionar entrada `/suporte` em Pages.
- `public/sitemap.xml` / `scripts/generate-sitemap.ts`: incluir `/suporte`.

## 4. Entregáveis de texto para App Store Connect
Já enviados na mensagem anterior e confirmados pelo usuário:
- **Texto promocional** (165 caracteres, com emojis)
- **Descrição completa** (tom jovem com emojis, ~3.500 caracteres)
- **Palavras-chave** (99 caracteres: `eventos,ingressos,festas,shows,balada,rolê,sympla,ingresso,festival,agenda,perto,cidade,bilhete`)
- **URL de suporte**: `https://upplin.com/suporte` (criada neste plano)
- **URL de marketing**: `https://upplin.com`
- **URL de privacidade**: `https://upplin.com/privacidade`
- **Categoria primária**: Entretenimento
- **Categoria secundária sugerida**: Estilo de Vida

## Detalhes técnicos
- Não mexer em lógica de backend nem em componentes existentes além do Footer.
- Reusar tokens semânticos (`bg-background`, `text-foreground`, `bg-gradient-to-r from-[hsl(var(--neon-1))]…`) já definidos em `index.css`.
- Sem toast notifications (regra de UX da plataforma para áreas públicas).
- Ícones via `lucide-react` (Mail, MessageCircle, Phone, HelpCircle, Clock).
- Responsivo: padding `lg:ml-[72px]` para conviver com a TikTokDesktopSidebar; `pb-20` para BottomNav.
