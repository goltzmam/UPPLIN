import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.22b45c0d4c504b2a96fdf42cde095566',
  appName: 'upplin',
  webDir: 'dist',
  // IMPORTANTE: NÃO adicionar bloco `server: { url: ... }` aqui.
  // Em builds de produção (App Store / Play Store) o app DEVE carregar os
  // arquivos empacotados em `dist/` (webDir). Apontar `server.url` para a
  // URL do sandbox da Lovable faz o app abrir uma tela em branco quando
  // a URL não está acessível no dispositivo do revisor (foi a causa da
  // rejeição 2.1(a) da Apple no iPad Air M3 / iPadOS 26.5).
  //
  // Para hot-reload durante desenvolvimento local, adicione o bloco
  // `server` apenas temporariamente e NUNCA faça commit dele.
  ios: {
    contentInset: 'always',
    // Criptografia padrão (HTTPS/TLS, JWT, Bcrypt) — isenta sob 5D992.c.
    // Evita a pergunta de export compliance da Apple a cada build.
    ITSAppUsesNonExemptEncryption: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
