import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

/**
 * Remove Service Workers e caches antigos sem recarregar a página.
 * O reload automático foi removido para evitar loops em iOS Safari /
 * WebView do Capacitor — causa de rejeição "tela em branco" no review da Apple.
 */
async function cleanupStaleServiceWorkersAndCaches() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
  } catch (err) {
    console.warn("[boot] cleanup failed (ignored):", err);
  }
}

function renderFallback(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;text-align:center">
      <div style="max-width:360px">
        <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">UPPLIN</div>
        <p style="font-size:14px;opacity:.7;margin:0 0 24px">${message}</p>
        <button onclick="window.location.reload()" style="background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);color:#fff;border:none;border-radius:999px;padding:12px 28px;font-size:14px;font-weight:600">Recarregar</button>
      </div>
    </div>`;
}

(async () => {
  try {
    const ROOT = document.getElementById("root");
    if (!ROOT) {
      console.error("[boot] #root not found");
      return;
    }

    // Cleanup em background — NUNCA bloqueia ou recarrega.
    // Em produção, faz uma vez por sessão.
    if (import.meta.env.PROD) {
      const FLAG = "__upplin_sw_cleanup_done__";
      try {
        if (!sessionStorage.getItem(FLAG)) {
          sessionStorage.setItem(FLAG, "1");
          // fire-and-forget; não esperamos para renderizar
          void cleanupStaleServiceWorkersAndCaches();
        }
      } catch {
        // sessionStorage pode falhar em modo privado do Safari — ignora
        void cleanupStaleServiceWorkersAndCaches();
      }
    }

    createRoot(ROOT).render(
      <ErrorBoundary>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("[boot] fatal:", err);
    renderFallback("Não conseguimos iniciar o app. Tente recarregar.");
  }
})();

// Captura erros globais não tratados (especialmente úteis no WebView do iOS).
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    console.error("[window.error]", e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("[unhandledrejection]", e.reason);
  });
}
