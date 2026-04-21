import { useCallback, useEffect, useState } from "react";

export type LocationStatus =
  | "idle"
  | "prompt"
  | "loading"
  | "granted"
  | "denied"
  | "unavailable";

export interface UserCoords {
  lat: number;
  lng: number;
  accuracy?: number;
  updatedAt: number;
}

const STORAGE_KEY = "upplin:user-location:v1";
const DECISION_KEY = "upplin:location-decision:v1"; // "granted" | "dismissed" | "denied"
const PROMPT_SHOWN_KEY = "upplin:location-prompt-shown:v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours

function readStoredCoords(): UserCoords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserCoords;
    if (!parsed?.lat || !parsed?.lng) return null;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredCoords(coords: UserCoords | null) {
  try {
    if (!coords) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

function readDecision(): "granted" | "dismissed" | "denied" | null {
  try {
    return (localStorage.getItem(DECISION_KEY) as any) || null;
  } catch {
    return null;
  }
}

function writeDecision(value: "granted" | "dismissed" | "denied") {
  try {
    localStorage.setItem(DECISION_KEY, value);
    localStorage.setItem(PROMPT_SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Hook unificado de localização do usuário.
 *
 * - Persiste a última posição válida (6h) em localStorage.
 * - Persiste a decisão do usuário (concedido / dispensado / negado)
 *   para evitar perguntar de novo na mesma sessão / dispositivo.
 * - Exibe `shouldPrompt = true` quando ainda não há decisão e o
 *   browser suporta geolocalização.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(() => readStoredCoords());
  const [status, setStatus] = useState<LocationStatus>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";
    if (readStoredCoords()) return "granted";
    const decision = readDecision();
    if (decision === "denied") return "denied";
    if (decision === "dismissed") return "idle";
    return "prompt";
  });
  const [error, setError] = useState<string | null>(null);

  // Sync com Permissions API quando disponível
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted" && !coords) {
          // Já permitido pelo navegador — buscar silenciosamente
          requestLocation();
        } else if (result.state === "denied") {
          setStatus("denied");
        }
        result.onchange = () => {
          if (result.state === "denied") {
            setStatus("denied");
            writeDecision("denied");
          }
        };
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: UserCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: Date.now(),
        };
        setCoords(next);
        writeStoredCoords(next);
        setStatus("granted");
        writeDecision("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          writeDecision("denied");
        } else {
          setStatus("idle");
        }
        setError(err.message || "Não foi possível obter sua localização");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 * 60 * 5 }
    );
  }, []);

  const dismissPrompt = useCallback(() => {
    writeDecision("dismissed");
    setStatus((prev) => (prev === "prompt" ? "idle" : prev));
  }, []);

  const clearLocation = useCallback(() => {
    writeStoredCoords(null);
    setCoords(null);
  }, []);

  const shouldPrompt = status === "prompt";

  return {
    coords,
    status,
    error,
    shouldPrompt,
    requestLocation,
    dismissPrompt,
    clearLocation,
  };
}
