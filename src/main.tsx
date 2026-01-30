import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupPWAUpdates } from "./registerSW";
import { ensureLatestVersion, clearAllCaches, unregisterAllSW } from "./lib/version-check";

/**
 * Detects if we're in a preview/development environment
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
 */
async function cleanupPreview(): Promise<void> {
  try {
    await unregisterAllSW();
    await clearAllCaches();
    console.log("[Preview] Cleaned up caches and service workers");
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
  // In preview: always clean up stale caches first
  if (isPreviewEnvironment()) {
    await cleanupPreview();
  }
  
  // Then check version and render
  await ensureLatestVersion();
  setupPWAUpdates();
  createRoot(document.getElementById("root")!).render(<App />);
})();
