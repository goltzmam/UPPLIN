import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";
import { ensureLatestVersion, clearAllCaches, unregisterAllSW } from "./lib/version-check";

/**
 * Detects if we're in a Lovable preview environment
 * This works even in DEV mode when running inside Lovable's preview iframe
 */
function isLovablePreview(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes("lovableproject.com") ||
    hostname.includes("id-preview--")
  );
}

/**
 * Detects if we're in any preview/development environment
 */
function isPreviewEnvironment(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes("id-preview--") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1")
  );
}

/**
 * Aggressive cleanup for preview environment to prevent stale UI
 * This runs ALWAYS in Lovable preview, even in DEV mode
 */
async function cleanupPreview(): Promise<void> {
  try {
    // Clear React Query cache if available
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      console.log("[Preview] Cleared browser caches:", keys.length);
    }
    
    // Unregister any service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      if (registrations.length > 0) {
        console.log("[Preview] Unregistered service workers:", registrations.length);
      }
    }
    
    console.log("[Preview] Cleanup complete");
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

// Main initialization - runs cleanup in Lovable preview ALWAYS (even in DEV mode)
(async () => {
  // In Lovable preview: ALWAYS clean up to prevent stale UI
  // This is critical because Lovable rebuilds the app frequently
  if (isLovablePreview()) {
    await cleanupPreview();
  } else if (isPreviewEnvironment()) {
    // Other preview environments (localhost, etc.)
    await cleanupPreview();
  }
  
  // Only run version check in production (not DEV mode)
  if (!import.meta.env.DEV) {
    await ensureLatestVersion();
  }
  
  setupPWAUpdates();
  createRoot(document.getElementById("root")!).render(<App />);
})();
