# Política geral de privacidade e Google OAuth

A página pública /privacidade contém a política geral sem seleção de perfil. O texto é compartilhado entre React e o HTML estático do build em src/content/privacy-policy.ts. A rewrite existente em vercel.json entrega dist/seo/privacidade.html; não depende de JavaScript, cookie ou sessão. O app substitui esse conteúdo por sua interface ao montar. As páginas específicas permanecem disponíveis e os links de termos/privacidade já existem no rodapé público.

## Inspeção e lacunas sinalizadas antes da implementação

- O hub anterior apresentava somente um seletor; o gerador SEO inseria metadados, sem conteúdo no corpo.
- Google/Apple, os dados recebidos e serviços de mapas não estavam descritos no hub.
- A política do participante afirmava permanência de comentários/curtidas/avaliações, mas a rotina SQL de exclusão os remove. Corrigido o texto, sem alterar a rotina.
- A garantia HIBP não foi confirmada na configuração atual. Retirada da política do participante; mantidas apenas medidas observáveis na implementação.
- A política do organizador trata a UPPLIN exclusivamente como operadora dos dados de compradores. O aplicativo também decide finalidades próprias de segurança, suporte e retenção. O documento específico foi preservado; a política geral explica essas finalidades. A qualificação jurídica de cada tratamento deve ser revisada pelo responsável.
- Não foi informado nome de encarregado formal, região dos servidores ou mecanismo contratual específico de transferência internacional. Não inventados. Usa suporte@upplin.com, canal já confirmado pelo responsável, e informa a possibilidade de processamento fora do Brasil.
- O responsável respondeu “ok” ao uso desse canal e dos prazos previamente aprovados; isso não confirma nomeação de encarregado nem a inexistência de exportações externas. Inventário de cópias manuais, contratos e eventuais transferências continua sendo uma responsabilidade operacional a confirmar.
- O limite de backups de 90 dias, resposta de exclusão em 2 dias úteis e conclusão em 30 dias corridos foram aprovados anteriormente. A inspeção documentada em EXCLUSAO_CONTA.md não mostrou backups/PITR ativos. O texto informa limite de retenção, sem prometer a existência de backups diários.

## Evidências de implementação

- src/lib/oauth.ts, src/lib/auth.tsx e src/integrations/supabase/client.ts: OAuth, sessões locais, Supabase Auth e encaminhamento do token Apple para armazenamento restrito.
- supabase/functions/store-apple-token e _shared/account-deletion.ts: validação, armazenamento criptografado e revogação Apple.
- supabase/migrations/20261030080000_account_deletion_and_retention.sql e migrações de moderação 20261031*: exclusão, retenção financeira/acesso e evidências de denúncia.
- supabase/functions/mp-process-payment, mp-connect, mp-subscribe e create-order: transações e autorização Mercado Pago.
- supabase/functions/_shared/email-provider.ts: Resend.
- src/lib/geocode.ts, reverse-geocode.ts, components/map/BaseMapTiles.tsx e pages/organizador/ConfiguracoesContent.tsx: OpenStreetMap/Nominatim e ViaCEP.
- vercel.json: hospedagem e entrega de HTML público.

Esta alteração não habilita provedores nem muda autenticação, cadastro, pagamentos, banco de dados ou projetos nativos. Publicar a política não garante aprovação automática: o Google precisa reavaliar a URL.
