import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  extractChunkUrl,
  getBootRequestId,
  logBootEvent,
} from "./lib/boot-diagnostics";
import "./index.css";

logBootEvent("boot_start", { request_id_source: "session" });


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

function renderFallback(message: string, reason = "unknown", details: Record<string, unknown> = {}) {
  const root = document.getElementById("root");
  if (!root) return;
  logBootEvent("fallback_shown", { surface: "html_fallback", reason, message, ...details });
  const requestId = getBootRequestId();
  root.innerHTML = `
    <div style="min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;text-align:center">
      <div style="max-width:360px">
        <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">UPPLIN</div>
        <p style="font-size:14px;opacity:.7;margin:0 0 24px">${message}</p>
        <button id="upplin-boot-retry" style="background:linear-gradient(135deg,#FF6A00,#FF2D2D,#FF007A);color:#fff;border:none;border-radius:999px;padding:12px 28px;font-size:14px;font-weight:600">Recarregar</button>
        <p style="font-size:10px;opacity:.35;margin:20px 0 0;font-family:ui-monospace,monospace">ID: ${requestId}</p>
      </div>
    </div>`;
  const btn = document.getElementById("upplin-boot-retry");
  btn?.addEventListener("click", () => {
    logBootEvent("fallback_manual_retry", { surface: "html_fallback", reason });
    window.location.reload();
  });
}


/**
 * Retry único para falhas de carregamento de chunk (dynamic import).
 * Em redes instáveis / WebView do iOS, um chunk pode falhar e a tela
 * fica presa no loading. Recarregamos NO MÁXIMO uma vez a cada 60s
 * (nunca em loop); se falhar de novo, o ErrorBoundary/fallback assume.
 */
const RELOAD_FLAG = "__upplin_chunk_reload_at__";
const RELOAD_COOLDOWN_MS = 60_000;
let chunkFailureHandled = false;

function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

function handleChunkFailure(err: unknown) {
  if (chunkFailureHandled) return;
  chunkFailureHandled = true;

  let canReload = false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
    canReload = !last || Date.now() - last > RELOAD_COOLDOWN_MS;
    if (canReload) sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    canReload = false;
  }

  if (canReload) {
    window.location.reload();
    return;
  }

  console.error("[boot] chunk load failed:", err);
  // Se o React já montou, o ErrorBoundary exibe a tela de erro — não
  // mexemos no DOM controlado por ele (evita conflito de removeChild).
  if (mounted) return;
  renderFallback(
    "Não conseguimos carregar todos os arquivos do app. Verifique sua conexão e tente novamente."
  );
}


// Watchdog: se o React não montar, nunca deixar tela em branco.
let mounted = false;
const bootWatchdog = window.setTimeout(() => {
  if (mounted) return;
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) {
    renderFallback("O app está demorando mais que o normal para abrir.");
  }
}, 10000);

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
    mounted = true;
    window.clearTimeout(bootWatchdog);
  } catch (err) {
    window.clearTimeout(bootWatchdog);
    console.error("[boot] fatal:", err);
    renderFallback("Não conseguimos iniciar o app. Tente recarregar.");
  }
})();

// Captura erros globais não tratados (especialmente úteis no WebView do iOS).
if (typeof window !== "undefined") {
  // Vite dispara este evento quando o preload de um chunk falha.
  // NÃO usar preventDefault aqui: isso faria o import resolver `undefined`
  // e quebrar o render. Deixamos o erro propagar para o ErrorBoundary e só
  // registramos a tentativa de recarregar.
  window.addEventListener("vite:preloadError", (e: Event) => {
    handleChunkFailure((e as Event & { payload?: unknown }).payload);
  });

  window.addEventListener("error", (e) => {
    console.error("[window.error]", e.error || e.message);
    if (isChunkLoadError(e.error || e.message)) handleChunkFailure(e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("[unhandledrejection]", e.reason);
    if (isChunkLoadError(e.reason)) handleChunkFailure(e.reason);
  });
}
