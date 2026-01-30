/**
 * Version checking utility to ensure users always see the latest build.
 * Prevents stale cached versions from being served.
 */

const VERSION_KEY = "upplin_build_version";

/**
 * Checks if the current build matches the server version.
 * If not, clears all caches and reloads to get the latest version.
 */
export async function ensureLatestVersion(): Promise<void> {
  // Skip version check in development
  if (import.meta.env.DEV) {
    console.log("[Version] Skipping version check in development");
    return;
  }

  try {
    // Fetch version.json with cache busting
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      console.warn("[Version] Could not fetch version.json:", response.status);
      return;
    }

    const { buildId } = await response.json();
    const storedVersion = localStorage.getItem(VERSION_KEY);

    console.log(`[Version] Current: ${storedVersion}, Server: ${buildId}`);

    if (storedVersion && storedVersion !== buildId) {
      console.log("[Version] New version detected! Clearing caches and reloading...");
      
      // Store new version first to prevent reload loops
      localStorage.setItem(VERSION_KEY, buildId);
      
      // Clear all caches
      await clearAllCaches();
      
      // Unregister all service workers
      await unregisterAllSW();
      
      // Force reload
      window.location.reload();
      return;
    }

    // Store current version
    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, buildId);
      console.log("[Version] First visit, stored version:", buildId);
    }
  } catch (error) {
    console.warn("[Version] Error checking version:", error);
  }
}

/**
 * Clears all browser caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!("caches" in window)) return;
  
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    console.log("[Version] Cleared all caches:", keys);
  } catch (error) {
    console.warn("[Version] Error clearing caches:", error);
  }
}

/**
 * Unregisters all service workers
 */
export async function unregisterAllSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
    console.log("[Version] Unregistered all service workers:", registrations.length);
  } catch (error) {
    console.warn("[Version] Error unregistering SW:", error);
  }
}

/**
 * Force reset: clears everything and reloads.
 * Can be triggered via ?debug=reset or programmatically.
 */
export async function forceReset(): Promise<void> {
  console.log("[Version] Force reset triggered");
  localStorage.removeItem(VERSION_KEY);
  await clearAllCaches();
  await unregisterAllSW();
  window.location.reload();
}

// Expose force reset globally for debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).forceAppReset = forceReset;
}
