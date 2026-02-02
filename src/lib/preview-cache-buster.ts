/**
 * Preview Cache Buster - Aggressive cache clearing for Lovable preview environments.
 * 
 * This module runs ONLY in Lovable preview domains to ensure the latest code
 * is always displayed after a publish, preventing "old UX" flash issues.
 */

function isLovablePreview(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname.includes("lovable.app") || hostname.includes("lovable.dev");
}

/**
 * Unregister ALL service workers immediately.
 * This is the primary fix for stale UI issues in preview.
 */
async function nukeServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      console.log(`[Preview] Unregistering ${registrations.length} service worker(s)...`);
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log("[Preview] All service workers unregistered");
    }
  } catch (e) {
    console.warn("[Preview] Failed to unregister service workers:", e);
  }
}

/**
 * Delete ALL caches to prevent stale assets.
 */
async function nukeCaches(): Promise<void> {
  if (!("caches" in window)) return;
  
  try {
    const keys = await caches.keys();
    if (keys.length > 0) {
      console.log(`[Preview] Deleting ${keys.length} cache(s):`, keys);
      await Promise.all(keys.map(key => caches.delete(key)));
      console.log("[Preview] All caches deleted");
    }
  } catch (e) {
    console.warn("[Preview] Failed to clear caches:", e);
  }
}

/**
 * Main initialization - runs on every page load in preview.
 * Aggressively clears SW and caches to ensure fresh content.
 */
export async function initPreviewCacheBuster(): Promise<void> {
  // Only run in Lovable preview environments
  if (!isLovablePreview()) {
    return;
  }

  console.log("[Preview] Cache buster initializing...");

  // Run cleanup immediately and in parallel
  await Promise.all([
    nukeServiceWorkers(),
    nukeCaches()
  ]);

  // Also prevent future SW registrations in preview
  if ("serviceWorker" in navigator) {
    // Override the register method to prevent new SWs
    const originalRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = async (...args) => {
      console.log("[Preview] Blocked service worker registration:", args[0]);
      // Return a mock registration that does nothing
      return Promise.reject(new Error("SW registration blocked in preview"));
    };
  }

  console.log("[Preview] Cache buster complete - serving fresh content");
}
