## Problema

A URL `/privacidade` não existe como rota no `src/App.tsx`. Como o componente `NotFound` faz `<Navigate to="/" replace />`, qualquer acesso a `/privacidade` (no web ou no app) é redirecionado para a home — exatamente o comportamento que você está vendo.

Os links no rodapé (`Footer.tsx`) e no `Suporte.tsx` apontam para `/privacidade`, mas a rota nunca foi criada. A única página de "política" existente é `/politica/:slug`, usada para políticas de planos, não para privacidade.

## Solução

1. **Criar `src/pages/Privacidade.tsx`** — página dedicada de Política de Privacidade com:
   - Layout no padrão TikTok/dark da Upplin (sem Header tradicional, com botão Voltar)
   - SEO completo: `<title>Política de Privacidade — Upplin</title>`, meta description, canonical `https://upplin.com/privacidade`, H1 único
   - Conteúdo LGPD-compliant em seções: Introdução, Dados coletados (cadastro, CPF, localização, pagamento, mídia), Finalidades, Compartilhamento (Mercado Pago, Resend, Lovable Cloud/Supabase), Cookies, Direitos do titular (acesso, correção, exclusão), Retenção, Segurança, Contato DPO (suporte@upplin.com), Data de atualização
   - Tipografia e tokens semânticos do design system (sem cores hardcoded)

2. **Registrar a rota em `src/App.tsx`** (junto às rotas públicas, próximo a `/suporte`):
   ```tsx
   <Route path="/privacidade" element={<Privacidade />} />
   ```

3. **Adicionar também `/termos`** (mesmo padrão) se desejar, já que o checkout também menciona "termos de uso" — posso incluir nesta mesma entrega ou deixar para depois.

4. **Atualizar `sitemap.xml`** incluindo `/privacidade` para indexação.

## Validação

- Acessar `/privacidade` no preview → deve renderizar a página (sem redirect para `/`)
- Acessar `https://upplin.com/privacidade` após publicar → mesma página
- Clique no link "Privacidade" do rodapé deve abrir a página

## Pergunta

Quer que eu inclua também `/termos` (Termos de Uso) nesta mesma entrega, ou só `/privacidade` por enquanto?
