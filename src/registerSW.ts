import { registerSW } from "virtual:pwa-register";
import { clearAllCaches, unregisterAllSW } from "./lib/version-check";

/**
 * Detects if we're running in a preview environment
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
 * Cleans up any existing service workers and caches in preview environment
 */
async function cleanupPreviewEnvironment(): Promise<void> {
  console.log("[SW] Preview environment detected - disabling service worker");
  
  await unregisterAllSW();
  await clearAllCaches();
  
  console.log("[SW] Preview cleanup complete");
}

/**
 * Sets up PWA with aggressive update strategy for published environment
 */
function setupPublishedPWA(): void {
  console.log("[SW] Published environment - enabling service worker");

  const updateSW = registerSW({
    immediate: true,
    
    onRegistered(registration) {
      console.log("[SW] Service worker registered");
      
      if (!registration) return;
      
      // Check for updates every 2 minutes
      const UPDATE_INTERVAL = 2 * 60 * 1000;
      
      setInterval(() => {
        console.log("[SW] Checking for updates...");
        registration.update().catch((err) => {
          console.warn("[SW] Update check failed:", err);
        });
      }, UPDATE_INTERVAL);
    },
    
    onNeedRefresh() {
      console.log("[SW] New version available! Updating...");
      
      // Activate new SW
      updateSW(true);
      
      // Clear caches and reload
      clearAllCaches()
        .then(() => {
          console.log("[SW] Caches cleared, reloading...");
          setTimeout(() => window.location.reload(), 200);
        })
        .catch(() => {
          // Reload anyway
          window.location.reload();
        });
    },
    
    onOfflineReady() {
      console.log("[SW] App ready for offline use");
    },
    
    onRegisterError(error) {
      console.error("[SW] Registration error:", error);
    },
  });
}

/**
 * Main entry point for PWA setup.
 * - In preview: disables SW completely and cleans up any existing registrations
 * - In published: enables SW with aggressive update strategy
 */
export function setupPWAUpdates(): void {
  // Skip in non-browser environments
  if (typeof window === "undefined") return;
  
  // Skip in development mode (Vite HMR)
  if (import.meta.env.DEV) {
    console.log("[SW] Development mode - skipping PWA setup");
    return;
  }
  
  // Check if service workers are supported
  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service workers not supported");
    return;
  }
  
  if (isPreviewEnvironment()) {
    // Preview: clean up and disable
    cleanupPreviewEnvironment().catch(console.error);
  } else {
    // Published: enable with aggressive updates
    setupPublishedPWA();
  }
}
