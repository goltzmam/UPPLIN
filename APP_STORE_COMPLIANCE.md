# UPPLIN — Conformidade App Store (Criptografia)

## Resumo
O UPPLIN usa **apenas criptografia padrão** já incluída no iOS/Android:
- HTTPS/TLS (comunicação com a API e Lovable Cloud)
- JWT para autenticação
- Bcrypt para hashing de senhas (gerenciado pelo Supabase Auth)

Tudo isso está **isento** sob a categoria **5D992.c** do US Export Administration Regulations (EAR). **Não é necessário enviar ERN nem CCATS.**

---

## Respostas no App Store Connect

Pergunta: **"Seu app usa criptografia?"**
Resposta: **SIM**

Pergunta: **"Seu app se qualifica para alguma das exceções fornecidas na Categoria 5, Parte 2 do US Export Administration Regulations?"**
Resposta: **SIM**

Justificativa: O app usa apenas algoritmos de criptografia padrão fornecidos pelo sistema operacional (iOS/Android) e por bibliotecas amplamente disponíveis (HTTPS/TLS, JWT, Bcrypt). Nenhuma criptografia proprietária foi implementada.

---

## Configuração técnica

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

Com essa flag presente, a Apple **não pergunta sobre criptografia em cada build** enviado ao TestFlight/App Store.

---

## Próximos passos
1. `git pull` do repositório
2. `npm install`
3. `npx cap sync ios`
4. Verificar que o `Info.plist` contém a chave `ITSAppUsesNonExemptEncryption = false`
5. Build e upload normalmente
