# Segurança do conteúdo social — 31/10/2026

## Operação do suporte

Acesse https://admin.upplin.com/moderation com a conta de suporte existente. A página e as RPCs exigem o papel administrativo no servidor. O painel é exclusivo da web. O menu Moderação e denúncias mostra a quantidade de denúncias abertas e conteúdos pendentes e consulta a fila a cada 15 segundos.

Cada denúncia tem motivo, detalhes opcionais, evidência disponível no momento do envio, status e prazo operacional de 24h. O suporte pode iniciar análise, registrar uma nota interna, ocultar o conteúdo e resolver ou encerrar sem remoção. O denunciante não é exibido aos usuários comuns. A evidência não é pública. Relatos repetidos do mesmo usuário sobre o mesmo alvo aberto são deduplicados; o envio é limitado a 10 novas denúncias por usuário por hora.

A equipe precisa acompanhar a fila e tomar as medidas dentro do prazo operacional. O código não substitui atendimento humano e não garante aprovação pelas lojas. Cada denúncia nova gera uma notificação no aplicativo e um email para as contas administrativas, com o link da fila. Denúncia repetida do mesmo usuário sobre o mesmo alvo aberto não gera novo alerta. Se o alerta falhar, a denúncia continua registrada; o alerta avisa, mas não substitui o acompanhamento da fila.

## Publicação imediata e filtro (atualização de 04/11/2026)

Após aplicar a migração 20261104200000_instant_social_publication, deixa de haver aprovação prévia de conteúdo social comum. Fotos, vídeos, capas e logos não exigem revisão antes de aparecer. O filtro lexical normaliza caixa, acentos e caracteres de compatibilidade; texto proibido é rejeitado automaticamente com mensagem em português. Isso não é classificação semântica por IA: denúncias e atendimento humano continuam necessários.

O usuário não pode alterar diretamente seu estado de moderação ou restaurar conteúdo ocultado. Conteúdo anteriormente pendente e permitido é liberado, exceto conteúdos/autores com denúncias abertas e registros ocultos. Eventos continuam com a fila editorial já existente, sem alteração de pagamentos ou taxas.

Avaliações e comentários de eventos também podem ser denunciados; conteúdo oculto não participa da média exibida. O suporte mantém as ferramentas de análise e ocultação após publicação. Arquivos continuam com caminhos únicos e proteção contra substituição de um endereço referenciado.


## Bloqueios

O menu de segurança está em publicações, comentários de publicações, comentários de eventos, avaliações e perfis (incluindo o perfil aberto pelo chat). O bloqueio oculta o conteúdo social entre as duas contas e impede novas conversas/mensagens no servidor, inclusive contra chamadas diretas à API. Pode ser desfeito em Configurações → Usuários bloqueados, tanto no perfil participante quanto no painel organizador. Históricos privados necessários ao atendimento e os pedidos/ingressos continuam preservados. O suporte oficial permanece acessível. O suporte pode acompanhar os chats.

Consultas de conteúdo personalizado usam a identidade da sessão no cache para não reutilizar conteúdo privado de outra conta.

## Privacidade e retenção

A política do participante remove telefone e data de nascimento da descrição de cadastro; a política do organizador não foi alterada. As evidências/detalhes pessoais e os bloqueios são apagados no fluxo de exclusão de conta já existente. Denúncias encerradas são eliminadas após 90 dias por rotina diária; denúncias abertas precisam de atendimento, não são encerradas automaticamente. O anonimato público do denunciante não significa ocultar o caso da equipe de suporte autorizada.

## Checkout e configurações conferidas

O card Seu ingresso, com segurança UPPLIN é informativo. Explica Mercado Pago, emissão do ingresso após confirmação, QR Code, solicitação de reembolso e suporte. Não vende seguro, não oferece cobertura por doença/desemprego e não adiciona cobrança ou promessa de reembolso automático. Os valores do pedido não foram alterados.

O filtro Esportes usa a categoria esportes, igual ao editor de eventos. Conferido no Supabase: https://www.upplin.com/** nas URLs de redirecionamento e APPLE_CLIENT_ID/APPLE_CLIENT_SECRET presentes nos secrets das Edge Functions. Nenhum segredo é exibido nem foi alterado para esta implementação.

## Verificação

```bash
npm run typecheck
npm test
npm run build
python scripts/check-ugc-safety.py --apply
```

O último comando exige SUPABASE_ACCESS_TOKEN nas configurações seguras. Cria exclusivamente usuários/dados técnicos temporários, valida triagem, permissões, denúncia, bloqueio nas duas direções, aprovação/ocultação e imutabilidade de mídia e remove os dados ao concluir. Não envia email nem chama um provedor financeiro. Interromper o processo abruptamente pode exigir limpar os usuários técnicos ugc-…@audit.invalid.

Também foram verificados os formulários de denúncia, a fila do suporte, bloquear/desbloquear, chat impedido de enviar, Esportes e o card em checkout móvel. A exclusão de conta denunciada/restrita preservou o histórico financeiro e apagou evidências pessoais. Android, iOS e Capacitor não foram modificados. O desenvolvedor nativo precisa integrar o commit e validar um build real antes do envio às lojas; a conferência automatizada nativa usa simulação de runtime.
