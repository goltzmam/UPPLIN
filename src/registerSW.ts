/**
 * PWA registration - completely disabled in preview environments.
 * Only activates in production (upplin.com).
 */

function isProductionDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "upplin.com" || hostname === "www.upplin.com";
}

export function setupPWAUpdates(): void {
  // Only enable PWA in production domain
  if (!isProductionDomain()) {
    console.log("[PWA] Not production - skipping service worker");
    return;
  }

  // Dynamically import PWA registration only in production
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log("[PWA] Update available, refreshing...");
        updateSW(true);
        window.location.reload();
      },
      onOfflineReady() {
        console.log("[PWA] Ready for offline use");
      },
    });
  });
}
