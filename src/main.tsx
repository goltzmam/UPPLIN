import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function cleanupStaleServiceWorkersAndCaches() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  const regs = await navigator.serviceWorker.getRegistrations();
  if (!regs.length) return false;

  await Promise.all(regs.map((r) => r.unregister()));

  // If a previous PWA/service worker cached old bundles, this guarantees
  // the next load fetches the latest deploy.
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  return true;
}

(async () => {
  const ROOT = document.getElementById("root");
  if (!ROOT) return;

  // One-time cleanup per tab/session to prevent infinite reload loops.
  const FLAG = "__upplin_sw_cleanup_done__";
  if (import.meta.env.PROD && !sessionStorage.getItem(FLAG)) {
    sessionStorage.setItem(FLAG, "1");
    const cleaned = await cleanupStaleServiceWorkersAndCaches();
    if (cleaned) {
      window.location.reload();
      return;
    }
  }

  createRoot(ROOT).render(<App />);
})();
