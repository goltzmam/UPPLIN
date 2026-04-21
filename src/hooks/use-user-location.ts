import { useCallback, useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/reverse-geocode";

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

export interface UserCity {
  name: string;
  state: string | null;
  countryCode: string | null;
  /** Última confirmação (manual ou automática) */
  confirmedAt: number;
  /** Coordenadas em que foi resolvida */
  lat: number;
  lng: number;
}

const STORAGE_KEY = "upplin:user-location:v1";
const DECISION_KEY = "upplin:location-decision:v1"; // "granted" | "dismissed" | "denied"
const PROMPT_SHOWN_KEY = "upplin:location-prompt-shown:v1";
const ACTIVE_CITY_KEY = "upplin:active-city:v1";
const PENDING_CITY_KEY = "upplin:pending-city:v1";
const CITY_DISMISS_KEY = "upplin:city-change-dismissed:v1";
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

function readActiveCity(): UserCity | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CITY_KEY);
    return raw ? (JSON.parse(raw) as UserCity) : null;
  } catch {
    return null;
  }
}

function writeActiveCity(city: UserCity | null) {
  try {
    if (!city) localStorage.removeItem(ACTIVE_CITY_KEY);
    else localStorage.setItem(ACTIVE_CITY_KEY, JSON.stringify(city));
  } catch {
    /* ignore */
  }
}

function readPendingCity(): UserCity | null {
  try {
    const raw = localStorage.getItem(PENDING_CITY_KEY);
    return raw ? (JSON.parse(raw) as UserCity) : null;
  } catch {
    return null;
  }
}

function writePendingCity(city: UserCity | null) {
  try {
    if (!city) localStorage.removeItem(PENDING_CITY_KEY);
    else localStorage.setItem(PENDING_CITY_KEY, JSON.stringify(city));
  } catch {
    /* ignore */
  }
}

function normalizeCityName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Hook unificado de localização do usuário.
 *
 * - Persiste a última posição válida (6h) em localStorage.
 * - Persiste a decisão do usuário (concedido / dispensado / negado).
 * - Resolve a cidade via reverse-geocode (Nominatim) e detecta
 *   mudança de cidade (ex.: usuário viajou de Fortaleza para Recife).
 * - Quando detecta mudança, expõe `pendingCity` + `confirmCity()` /
 *   `rejectCity()` para o componente de UI perguntar ao usuário.
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
  const [activeCity, setActiveCity] = useState<UserCity | null>(() => readActiveCity());
  const [pendingCity, setPendingCity] = useState<UserCity | null>(() => readPendingCity());

  // Sync com Permissions API quando disponível
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted" && !coords) {
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

  // Resolve cidade e detecta mudança sempre que coords mudarem
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    reverseGeocode(coords.lat, coords.lng).then((res) => {
      if (cancelled || !res?.city) return;

      const detected: UserCity = {
        name: res.city,
        state: res.state,
        countryCode: res.countryCode,
        confirmedAt: Date.now(),
        lat: coords.lat,
        lng: coords.lng,
      };

      const current = readActiveCity();

      // Primeira vez: assumimos automaticamente, sem perguntar.
      if (!current) {
        writeActiveCity(detected);
        setActiveCity(detected);
        writePendingCity(null);
        setPendingCity(null);
        try {
          localStorage.removeItem(CITY_DISMISS_KEY);
        } catch {
          /* ignore */
        }
        return;
      }

      // Mesma cidade — apenas atualiza timestamp/coords (silencioso).
      if (normalizeCityName(current.name) === normalizeCityName(detected.name)) {
        const refreshed: UserCity = { ...current, ...detected, name: current.name };
        writeActiveCity(refreshed);
        setActiveCity(refreshed);
        writePendingCity(null);
        setPendingCity(null);
        return;
      }

      // Cidade mudou — não sobrescreve direto; pergunta ao usuário.
      // Evita perguntar de novo se ele acabou de dispensar a mesma cidade.
      try {
        const dismissedRaw = localStorage.getItem(CITY_DISMISS_KEY);
        if (dismissedRaw) {
          const d = JSON.parse(dismissedRaw) as { name: string; at: number };
          const fresh = Date.now() - d.at < 1000 * 60 * 60 * 12; // 12h
          if (fresh && normalizeCityName(d.name) === normalizeCityName(detected.name)) {
            return;
          }
        }
      } catch {
        /* ignore */
      }

      writePendingCity(detected);
      setPendingCity(detected);
    });
    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lng]);

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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 * 60 * 5 },
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

  /** Aceita a nova cidade detectada como cidade ativa. */
  const confirmCity = useCallback((city?: UserCity) => {
    const target = city || readPendingCity();
    if (!target) return;
    const confirmed: UserCity = { ...target, confirmedAt: Date.now() };
    writeActiveCity(confirmed);
    setActiveCity(confirmed);
    writePendingCity(null);
    setPendingCity(null);
    try {
      localStorage.removeItem(CITY_DISMISS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Rejeita a sugestão de mudança de cidade — mantém a atual. */
  const rejectCity = useCallback(() => {
    const target = readPendingCity();
    if (target) {
      try {
        localStorage.setItem(
          CITY_DISMISS_KEY,
          JSON.stringify({ name: target.name, at: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    }
    writePendingCity(null);
    setPendingCity(null);
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
    activeCity,
    pendingCity,
    confirmCity,
    rejectCity,
  };
}
