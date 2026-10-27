import { defineConfig, loadEnv } from "vite";
import { assertClientEnvironment, resolveClientEnvironment } from "./scripts/client-env";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const client = resolveClientEnvironment({ ...loadEnv(mode, process.cwd(), ""), ...process.env });
  if (command === "build") assertClientEnvironment(client);
  return {
  define: Object.fromEntries(Object.entries(client).filter(([, value]) => value !== undefined).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
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
  };
});
