import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";
import { ensureLatestVersion, clearAllCaches, unregisterAllSW, clearReactQueryCache } from "./lib/version-check";

const BUILD_TS_KEY = "upplin_build_ts";

/**
 * Detects if we're in a Lovable preview environment
 */
function isLovablePreview(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes("lovableproject.com") ||
    hostname.includes("id-preview--")
  );
}

/**
 * Ensures fresh build by comparing BUILD_TIMESTAMP.
 * If mismatch detected, clears all caches and reloads.
 */
async function ensureFreshBuild(): Promise<boolean> {
  const currentTs = (window as unknown as { __BUILD_TIMESTAMP__?: string }).__BUILD_TIMESTAMP__;
  if (!currentTs) return false; // Not in dev or not injected
  
  const storedTs = sessionStorage.getItem(BUILD_TS_KEY);
  
  if (storedTs && storedTs !== currentTs) {
    console.log("[Build] New version detected, clearing cache...", { stored: storedTs, current: currentTs });
    sessionStorage.setItem(BUILD_TS_KEY, currentTs);
    
    await clearAllCaches();
    await unregisterAllSW();
    clearReactQueryCache();
    
    window.location.reload();
    return true; // Indicates reload triggered
  }
  
  if (!storedTs) {
    sessionStorage.setItem(BUILD_TS_KEY, currentTs);
    console.log("[Build] First visit, stored timestamp:", currentTs);
  }
  
  return false;
}

/**
 * Aggressive cleanup for preview environment
 */
async function cleanupPreview(): Promise<void> {
  try {
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      if (keys.length > 0) console.log("[Preview] Cleared browser caches:", keys.length);
    }
    
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      if (registrations.length > 0) console.log("[Preview] Unregistered service workers:", registrations.length);
    }
  } catch (e) {
    console.warn("[Preview] Cleanup error:", e);
  }
}

// Check for debug reset trigger
if (window.location.search.includes("debug=reset")) {
  import("./lib/version-check").then(({ forceReset }) => {
    forceReset();
  });
}

// Main initialization
(async () => {
  // In Lovable preview: check build timestamp for freshness
  if (isLovablePreview()) {
    const reloaded = await ensureFreshBuild();
    if (reloaded) return; // Don't continue, page is reloading
    
    // Also do cleanup on first load
    await cleanupPreview();
  }
  
  // Production: check version.json
  if (!import.meta.env.DEV) {
    await ensureLatestVersion();
  }
  
  setupPWAUpdates();
  createRoot(document.getElementById("root")!).render(<App />);
})();
