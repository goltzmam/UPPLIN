/**
 * Version checking - only active in production (upplin.com).
 * Completely disabled in preview/development to prevent reload loops.
 */

function isProductionDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "upplin.com" || hostname === "www.upplin.com";
}

export async function ensureLatestVersion(): Promise<void> {
  // Only run in production
  if (!isProductionDomain()) return;

  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const { buildId } = await response.json();
    const storedVersion = localStorage.getItem("app_version");

    if (storedVersion && storedVersion !== buildId) {
      localStorage.setItem("app_version", buildId);
      await clearAllCaches();
      window.location.reload();
      return;
    }

    if (!storedVersion) {
      localStorage.setItem("app_version", buildId);
    }
  } catch {
    // Silently fail
  }
}

export async function clearAllCaches(): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Silently fail
  }
}

export async function unregisterAllSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  } catch {
    // Silently fail
  }
}

export function clearReactQueryCache(): void {
  // No-op in most cases
}

export async function forceReset(): Promise<void> {
  localStorage.clear();
  sessionStorage.clear();
  await clearAllCaches();
  await unregisterAllSW();
  window.location.reload();
}

// Expose for debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).forceAppReset = forceReset;
}
