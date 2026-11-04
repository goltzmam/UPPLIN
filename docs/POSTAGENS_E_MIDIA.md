# Publicações, câmera, comentários e login

## Comportamento

- Um único MomentComposer atende o perfil e a ação Compartilhar momento. A câmera abre dentro da interface, com foto, gravação de até 60 segundos, alternância de lente, texto e botões separados para fotos/vídeos da galeria. Permissões e o seletor de arquivos são do navegador/sistema operacional; a web não tem acesso irrestrito à biblioteca inteira do aparelho.
- Fotos usam o editor existente (recorte, rotação, filtros e ajustes). Vídeos podem ter início/fim ajustados, áudio removido e recorte vertical centralizado, com exportação real via canvas/MediaRecorder quando suportado. O trecho editado tem limite de 2 minutos e a mídia continua limitada a 50 MB. A exportação ocorre no aparelho, mostra progresso e pode ser cancelada. Não há biblioteca de músicas licenciadas nem promessa de todos os recursos do TikTok.
- O arquivo original é preservado até confirmar a edição. URLs blob são liberadas, streams e microfone encerrados ao sair e alterações canceladas não são publicadas.
- SmartVideo atende posts e feeds: autoplay sem som, pausa ao sair da área visível/aba, um reprodutor ativo por vez, toque para pausar, som, volume, progresso e ampliação. Autoplay com áudio depende de interação e das regras do navegador. Alguns controles de áudio do iPhone são administrados pelo sistema.
- Comentários abrem em painel independente, com lista rolável, compositor fixo dentro do painel, fotos/nomes, envio e exclusão. O painel acompanha visualViewport quando o teclado reduz a área disponível. Exibe os 100 comentários mais recentes.
- O callback nativo deduplica eventos concorrentes e retornos já concluídos. Falhas de troca não exibem erro quando existe sessão válida; erros reais sem sessão continuam informados. Não registra códigos ou tokens.

## Banco e moderação

Aplicar a migração 20261104200000_instant_social_publication.sql para eliminar a aprovação prévia de conteúdo social comum. Texto proibido é rejeitado automaticamente com mensagem em português; denúncias, bloqueios, restrição de contas e decisões de ocultação do suporte permanecem. Mídia comum não cria pendência. Conteúdo anteriormente pendente e permitido é liberado, exceto autores/conteúdos com denúncias abertas e registros ocultos.

O autor não consegue alterar manualmente seu estado de moderação nem restaurar conteúdo oculto. A aprovação editorial de eventos não é alterada. Storage mantém regras de autoria, caminhos únicos e exclusão de conta. scripts/check-ugc-safety.py foi atualizado para testar publicação imediata e filtro, além de denúncia/bloqueio já existentes.

## Validação

`npm run typecheck`, `npm test`, `npm run build`.

O teste de callback cobre concorrência, replay com sessão válida, falha real e nova tentativa. A verificação de interface usa dados isolados no navegador, câmera/microfone simulados e mídia gerada localmente, sem enviar conteúdo de teste a usuários. Verifica autoplay, pausa/retomada, comentários, captura, envio e edição de vídeo. Esses testes não substituem um build real em iPhone/Android.

Pastas android/ e ios/, configurações Capacitor e identificadores dos aplicativos devem permanecer intactos. A integração e o build nativo continuam sob responsabilidade do desenvolvedor desses projetos.
