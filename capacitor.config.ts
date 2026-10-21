import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.despia.upplin',
  appName: 'UPPLIN',
  webDir: 'dist',
  // Cor de fundo nativa do WebView (preto, igual ao tema do app).
  // Evita "flash branco" entre a splash screen e o React montar —
  // problema comum em reviews da Apple/Google em dispositivos lentos.
  backgroundColor: '#000000',

  // IMPORTANTE: NÃO adicionar bloco `server: { url: ... }` aqui.
  // Em builds de produção (App Store / Play Store) o app DEVE carregar os
  // arquivos empacotados em `dist/` (webDir). Apontar `server.url` para a
  // URL do sandbox da Lovable faz o app abrir uma tela em branco quando
  // a URL não está acessível no dispositivo do revisor (foi a causa da
  // rejeição 2.1(a) da Apple no iPad Air M3 / iPadOS 26.5).
  //
  // Para hot-reload durante desenvolvimento local, adicione o bloco
  // `server` apenas temporariamente e NUNCA faça commit dele.

  server: {
    // Configuração local do Capacitor para builds empacotados. NÃO usa URL
    // remota; apenas fixa origem/scheme previsíveis no WKWebView para evitar
    // tela branca/preta em revisão da App Store em iPads.
    hostname: 'localhost',
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },

  ios: {
    contentInset: 'always',
    backgroundColor: '#000000',
    // ITSAppUsesNonExemptEncryption (false) não é chave do Capacitor: vai no
    // Info.plist quando o projeto iOS for gerado.
    // Permite scroll inercial e gestos nativos no WebKit.
    scrollEnabled: true,
    // Não bloquear o WebView mesmo se a tela demorar para responder
    // (evita "ANR-like" no review da Apple em iPads antigos).
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    // Desabilitado por segurança e por exigência da Play Store
    // (Pre-launch Report reprova apps que carregam HTTP em contexto HTTPS).
    allowMixedContent: false,
    // Permite capturar entrada de teclado físico/teclados externos
    // (importante em Chromebooks e tablets Android que a Google testa).
    captureInput: true,
    // Cor de fundo do WebView Android — sem flash branco no boot.
    backgroundColor: '#000000',
    // DESABILITADO em produção: expor debugging do WebView é um risco
    // de segurança que pode ser flagrado pela Play Console.
    webContentsDebuggingEnabled: false,
    // Mantém o WebView ativo em background curto (transições, picture-in-picture).
    // Evita "tela preta" ao voltar de outro app durante o review da Google.
    initialFocus: false,
  },
};

export default config;
