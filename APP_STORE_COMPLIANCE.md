# UPPLIN — Preparação dos aplicativos nativos

- Identificador informado pelo responsável para os apps registrados: `com.despia.upplin`. A configuração e a publicação nativa são mantidas pelo desenvolvedor nativo; tarefas web não devem alterar os arquivos nativos nem executar cap sync.
- Arquivos locais empacotados de `dist/`; sem servidor de desenvolvimento remoto.
- HTTPS/TLS e autenticação Supabase; uso de criptografia padrão, com `ITSAppUsesNonExemptEncryption=false` no Info.plist.
- Android declara câmera e localização opcionais, sem exigir câmera para instalar; backup do aplicativo desabilitado.
- iOS informa a finalidade de câmera, fotos e localização durante o uso.
- OAuth nativo abre o navegador do sistema e retorna por deep link com PKCE.

O APK de depuração foi compilado. Não foi realizada publicação nas lojas nem teste em dispositivo Apple. A versão de release exige macOS/Xcode para iOS, certificados, equipe Apple e configuração de assinatura Android/Play Console.

Antes de submeter, valide em aparelhos os fluxos de login, recuperação, câmera/QR Code, localização, upload, checkout e retorno ao app. Revise ícones e metadados. Informe uma conta de demonstração nas configurações seguras da loja, com serviços realmente disponíveis; não inclua credenciais neste repositório.

O status técnico e os requisitos de provedores estão em [docs/PRODUCAO.md](docs/PRODUCAO.md).
