import { Capacitor } from "@capacitor/core";

const PREVIEW_HOST_PATTERNS = [".lovableproject.com", ".lovable.app"];

const PUBLIC_APP_ORIGIN = "https://www.upplin.com";

export const getPublicAppOrigin = () => {
  if (typeof window === "undefined") {
    return PUBLIC_APP_ORIGIN;
  }

  // No app nativo a origem é https://localhost ou capacitor://localhost, que não abre no celular.
  if (Capacitor.isNativePlatform()) {
    return PUBLIC_APP_ORIGIN;
  }

  const { origin, hostname } = window.location;
  const isPreviewHost = PREVIEW_HOST_PATTERNS.some((pattern) => hostname.includes(pattern));

  return isPreviewHost ? PUBLIC_APP_ORIGIN : origin;
};

export const buildPublicAppUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
};