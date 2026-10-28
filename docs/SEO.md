# SEO e identidade UPPLIN

- Favicon SVG e ICO, PNG de 48 px, apple-touch-icon, ícones de instalação e imagem social usam o símbolo UP com o gradiente da interface. Arquivos legados foram substituídos, inclusive nos caminhos antigos para clientes com cache.
- Domínio canônico: https://www.upplin.com. A Vercel redireciona o domínio sem www permanentemente.
- Quatorze páginas públicas entregam títulos, descrições, links e resumo sem depender do JavaScript. O aplicativo interativo continua montando no mesmo caminho. Não há conteúdo especial para bots.
- Páginas de eventos e perfis públicos recebem HTML e dados estruturados a partir do Supabase pela função api/seo.ts. Apenas eventos publicados e a view pública de organizadores são consultados, com chave anônima pública; nenhum service_role é utilizado.
- api/sitemap.ts mantém o sitemap atualizado com registros públicos sem exigir novo deploy quando um evento é publicado. Respostas têm cache curto. Falhas do banco retornam 503 para o crawler tentar novamente, sem declarar o conteúdo inexistente.
- URLs dinâmicas inexistentes retornam 404 e noindex. Autenticação, conta, administração, checkout e outras páginas privadas usam noindex. Isso não substitui autenticação/RLS.
- Organization/WebSite/Event utilizam dados reais. Não são publicadas estrelas, quantidades de avaliações ou disponibilidade fictícias. Os contadores artificiais da landing page foram removidos.
- A busca de eventos aceita o parâmetro q. Consultas filtradas usam canonical da listagem e noindex no cliente, evitando multiplicar páginas de busca.

## Validação

Executar npm run typecheck, npm test e npm run build. O postbuild gera o HTML estático e o sitemap de fallback. npm run sitemap atualiza o arquivo público usando o catálogo atual. As rotas dinâmicas e rewrites devem ser verificadas em uma implantação Vercel; vite preview não executa funções serverless.

## Indexação e conteúdo

A meta de verificação Google existente foi preservada. No Google Search Console, enviar https://www.upplin.com/sitemap.xml e inspecionar a home, a listagem e os primeiros eventos publicados. Atualização do favicon/snippet depende de novo rastreamento e do cache do navegador/Google.

Otimização técnica não garante posição no Google. Publicar eventos reais com título específico, cidade, local, data, descrição original, imagens e informações de ingresso; manter perfis completos e obter referências legítimas. Evitar páginas vazias por cidade/categoria, repetição artificial de palavras-chave e avaliações inventadas. Ainda não há catálogo publicado com coordenadas no banco no momento desta revisão.
