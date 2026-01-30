import { registerSW } from "virtual:pwa-register";

/**
 * Keeps users on the latest UI by avoiding mixed/cached chunks.
 * This prevents intermittent runtime crashes like:
 *   "TypeError: Component is not a function"
 * which commonly happens when old cached assets are combined with a new deployment.
 */
export function setupPWAUpdates() {
  // Avoid SW in dev to prevent HMR/cache issues.
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Activate the new SW and reload so we don't run with mixed versions.
      // Also clear caches to eliminate any stale assets that could resurrect an old UI.
      updateSW(true);

      const clearCaches = async () => {
        try {
          if (!('caches' in window)) return;
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          // ignore
        }
      };

      void clearCaches().finally(() => {
        // Small delay to let SW take control before reloading.
        window.setTimeout(() => window.location.reload(), 200);
      });
    },
  });
}
