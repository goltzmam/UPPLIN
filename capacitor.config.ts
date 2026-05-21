import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.22b45c0d4c504b2a96fdf42cde095566',
  appName: 'upplin',
  webDir: 'dist',
  server: {
    url: 'https://22b45c0d-4c50-4b2a-96fd-f42cde095566.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
