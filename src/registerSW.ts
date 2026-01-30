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
      updateSW(true);
      // Small delay to let SW take control before reloading.
      window.setTimeout(() => window.location.reload(), 150);
    },
  });
}
