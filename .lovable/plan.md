## Objetivo
Adicionar ao `capacitor.config.ts` a flag que diz à Apple que o app usa apenas criptografia padrão (isenta), evitando a pergunta sobre criptografia em todo build. Também criar documento de conformidade para referência futura.

## Contexto
- UPPLIN usa criptografia padrão: HTTPS/TLS, JWT, Bcrypt — tudo isento sob a categoria 5D992.c do US Export Administration Regulations.
- Resposta no App Store Connect: **SIM** para "O app implementa algum recurso de criptografia?" e **NÃO** para "O app se qualifica para alguma das exceções?" (na verdade se qualifica, mas na prática a Apple aceita a flag `ITSAppUsesNonExemptEncryption = false` para criptografia padrão).
- A flag evita o formulário de export compliance a cada build.

## Passos
1. **Editar `capacitor.config.ts`**
   - Adicionar `ITSAppUsesNonExemptEncryption: false` dentro do bloco `ios`

2. **Criar `APP_STORE_COMPLIANCE.md`**
   - Documento com respostas prontas para as perguntas da Apple sobre criptografia
   - Incluir justificativa (HTTPS/TLS padrão, JWT, Bcrypt)

3. **(Opcional) Verificar `Info.plist` gerado**
   - Após `npx cap sync`, confirmar que `ITSAppUsesNonExemptEncryption` aparece no plist do iOS

## Arquivos a modificar
- `capacitor.config.ts` — adicionar flag
- `APP_STORE_COMPLIANCE.md` — novo arquivo de referência

## Nota para o usuário
Depois dessa alteração, rode `npx cap sync` para aplicar a mudança no projeto iOS nativo. O arquivo `Info.plist` será atualizado automaticamente.