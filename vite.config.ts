import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Alvo compatível com WKWebView de iPadOS/iOS mais antigos.
  // Sintaxe moderna demais faz o Safari falhar no parse do bundle inteiro,
  // resultando em tela 100% branca (rejeição Apple 2.1(a)).
  build: {
    target: ["es2019", "safari14", "chrome87", "edge88", "firefox78"],
    sourcemap: false,
  },
  esbuild: {
    target: "es2019",
  },
  optimizeDeps: {
    force: true,
  },
}));
