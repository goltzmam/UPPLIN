import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Plugin to inject BUILD_TIMESTAMP in development mode.
 * This enables the app to detect code changes in Lovable preview.
 */
function devBuildTimestampPlugin(): Plugin {
  return {
    name: "dev-build-timestamp",
    apply: "serve", // Only in development
    transformIndexHtml() {
      const timestamp = Date.now().toString();
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: `window.__BUILD_TIMESTAMP__ = "${timestamp}";`,
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

/**
 * Plugin to generate version.json on each build.
 * This enables the app to detect when a new version is deployed.
 */
function versionPlugin(): Plugin {
  return {
    name: "version-plugin",
    apply: "build",
    generateBundle() {
      const buildId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ buildId, timestamp: new Date().toISOString() }),
      });
      console.log(`[Build] Generated version.json with buildId: ${buildId}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    devBuildTimestampPlugin(),
    versionPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "UPPLIN - Descubra Eventos",
        short_name: "UPPLIN",
        description: "Descubra os melhores eventos do Brasil. Shows, festas, conferências e muito mais.",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        // Prevent stale caches from older deployments causing mixed asset versions.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Avoid precaching HTML to reduce the chance of serving an older UI shell.
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        // Explicitly exclude version.json from precaching
        globIgnores: ["**/version.json"],
        runtimeCaching: [
          {
            // SPA navigations: ALWAYS fetch from network, never cache HTML.
            // This eliminates the "old UI returns" bug caused by stale HTML.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
