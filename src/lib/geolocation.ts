// No app nativo a localização vem do plugin: o navigator.geolocation do WebView
// abre um segundo pedido, assinado "localhost" no iOS.
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

export class LocationError extends Error {
  reason: "unavailable" | "denied" | "failed";
  constructor(reason: "unavailable" | "denied" | "failed", message?: string) {
    super(message ?? reason);
    this.name = "LocationError";
    this.reason = reason;
  }
}

export async function getLocationPermission(): Promise<LocationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { location } = await Geolocation.checkPermissions();
      if (location === "granted") return "granted";
      if (location === "denied") return "denied";
      return "prompt";
    } catch {
      return "unknown";
    }
  }
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state as LocationPermission;
  } catch {
    return "unknown";
  }
}

async function getNativeCoords(options: PositionOptions) {
  try {
    const current = await Geolocation.checkPermissions();
    if (current.location === "denied") throw new LocationError("denied");
    if (current.location !== "granted") {
      const asked = await Geolocation.requestPermissions();
      if (asked.location !== "granted") throw new LocationError("denied");
    }
  } catch (err) {
    if (err instanceof LocationError) throw err;
    throw new LocationError("unavailable", err instanceof Error ? err.message : undefined);
  }
  try {
    const pos = await Geolocation.getCurrentPosition(options);
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    const message = err instanceof Error ? err.message : undefined;
    throw new LocationError(code === "OS-PLUG-GLOC-0003" ? "denied" : "failed", message);
  }
}

export async function getCurrentCoords(
  options: PositionOptions,
): Promise<{ lat: number; lng: number }> {
  if (Capacitor.isNativePlatform()) return getNativeCoords(options);
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new LocationError("unavailable");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) =>
        reject(
          new LocationError(
            error.code === error.PERMISSION_DENIED ? "denied" : "failed",
            error.message,
          ),
        ),
      options,
    );
  });
}
