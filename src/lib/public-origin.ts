import { Capacitor } from "@capacitor/core";

const PUBLIC_APP_ORIGIN = import.meta.env.VITE_APP_URL || "https://www.upplin.com";

export const getPublicAppOrigin = () => {
  if (typeof window === "undefined" || Capacitor.isNativePlatform()) {
    return PUBLIC_APP_ORIGIN;
  }

  return window.location.origin;
};

export const buildPublicAppUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
};