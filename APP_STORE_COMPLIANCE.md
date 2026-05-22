# UPPLIN — Conformidade App Store

## 1. Criptografia (Export Compliance)

O UPPLIN usa **apenas criptografia padrão** já incluída no iOS/Android:
- HTTPS/TLS (comunicação com a API e Lovable Cloud)
- JWT para autenticação
- Bcrypt para hashing de senhas (gerenciado pelo backend)

Tudo isso está **isento** sob a categoria **5D992.c** do US Export Administration Regulations (EAR). **Não é necessário enviar ERN nem CCATS.**

### Respostas no App Store Connect

- **"Seu app usa criptografia?"** → **SIM**
- **"Seu app se qualifica para alguma das exceções da Categoria 5, Parte 2 do EAR?"** → **SIM**

**Justificativa:** O app usa apenas algoritmos de criptografia padrão fornecidos pelo sistema operacional (iOS/Android) e por bibliotecas amplamente disponíveis (HTTPS/TLS, JWT, Bcrypt). Nenhuma criptografia proprietária foi implementada.

### Configuração técnica

No `capacitor.config.ts`:
```ts
ios: {
  ITSAppUsesNonExemptEncryption: false,
}
```

Isso gera no `Info.plist`:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Com essa flag, a Apple **não pergunta sobre criptografia em cada build** enviado ao TestFlight/App Store.

---

## 2. Notas para o Revisor da Apple (App Review)

Cole o texto abaixo no campo **"Notas para o revisor"** no App Store Connect:

```
=== UPPLIN — Plataforma social de eventos (PT-BR) ===

O UPPLIN é uma plataforma em PRODUÇÃO usada por organizadores e
participantes de eventos reais no Brasil. Não há contas de teste
nem ambiente sandbox — todos os dados e pagamentos são reais.

--- COMO TESTAR ---

1) FEED SOCIAL (sem login)
   Toda a navegação principal funciona sem cadastro. Basta abrir
   o app e explorar o feed estilo TikTok, eventos em destaque,
   busca, mapa e perfis públicos de organizadores.

2) CADASTRO (opcional)
   Para testar funções autenticadas (curtir, comentar, salvar,
   comprar), o revisor pode criar uma conta gratuita usando um
   email próprio. A verificação de email é obrigatória.

3) CHECKOUT (pagamento real via Mercado Pago)
   Estamos em produção, sem sandbox. Caso o revisor queira testar
   o fluxo completo de compra, há ingressos a partir de R$ 5,00
   (ex: evento "Copa Bar"). A compra é REAL e o valor pode ser
   estornado a pedido pelo email contato@upplin.com.
   Alternativa: o fluxo de checkout pode ser observado até a tela
   de pagamento sem concluir a transação.

4) ÁREA DO ORGANIZADOR
   Requer onboarding completo (CPF, endereço via CEP, conexão
   com conta Mercado Pago). Não é necessário para revisão das
   funcionalidades principais do app de participante.

--- PERMISSÕES ---

- Câmera: opcional (foto de perfil, check-in via QR Code)
- Localização: opcional (eventos próximos / mapa)
- Notificações: opcional (alertas de ingressos e eventos)

--- INFORMAÇÕES TÉCNICAS ---

- Idioma: Português (Brasil)
- Pagamentos: Mercado Pago (Pix e Cartão de Crédito) — produção
- Moderação: conteúdo gerado por usuários moderado em até 24h
  com ferramentas de denúncia e bloqueio disponíveis no app
- Segurança: HTTPS/TLS, JWT, Bcrypt (5D992.c — criptografia
  padrão isenta)

--- CONTATO ---

- Email: contato@upplin.com
- WhatsApp: (85) 2010-3399
- Site: https://upplin.com
- Suporte no app: tela /suporte
```

---

## 3. Sugestões para acelerar aprovação (opcional)

- **Ingresso simbólico:** criar um evento com ingresso de R$ 1,00 facilita o teste do fluxo completo pelo revisor com risco financeiro mínimo.
- **Vídeo de demonstração:** gravar um screencast (60–90s) do fluxo principal e hospedar como YouTube não listado, colando o link nas notas do revisor.
- **Conta organizador demo:** se quiser permitir que o revisor explore a área do organizador, criar uma conta com CPF/CNPJ válido e Mercado Pago já conectado, com credenciais nas notas.

---

## 4. Próximos passos no projeto local

1. `git pull`
2. `npm install`
3. `npx cap sync ios`
4. Verificar que o `Info.plist` contém `ITSAppUsesNonExemptEncryption = false`
5. Build e upload normalmente
