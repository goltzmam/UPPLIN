import { useEffect, useState, useCallback, useRef } from "react";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { normalizeCity } from "@/lib/geo";
import { Capacitor } from "@capacitor/core";
import { getCurrentCoords, getLocationPermission, LocationError } from "@/lib/geolocation";

/**
 * Centralized hook for the user's active location.
 *
 * Source priority (highest → lowest):
 *   1. Manual: city the user explicitly chose ("Mudar cidade")
 *   2. GPS: live coordinates from the browser (with reverse geocoding)
 *   3. Profile: city saved in the user's profile
 *   4. Default: null (caller decides fallback)
 *
 * Persistence:
 *   - GPS coords cached for 6h (`upplin_user_coords`)
 *   - Manual city kept until user clears it (`upplin_manual_city`)
 *   - "Don't ask again" dismissal of the GPS prompt (`upplin_loc_prompt_dismissed`)
 *   - Per-city dismissal of the change prompt for 12h (`upplin_city_change_skip_*`)
 */

const COORDS_KEY = "upplin_user_coords";
const COORDS_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const MANUAL_CITY_KEY = "upplin_manual_city";
const ACTIVE_CITY_KEY = "upplin_active_city";
const PROMPT_DISMISSED_KEY = "upplin_loc_prompt_dismissed";
const PROMPT_DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CITY_SKIP_PREFIX = "upplin_city_change_skip_";
const CITY_SKIP_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export interface UserCoords {
  lat: number;
  lng: number;
  ts: number;
}

export interface UserCity {
  city: string;
  state?: string | null;
  source: "manual" | "gps" | "profile";
}

interface UseUserLocationOptions {
  /** City stored in the user's profile (lowest-priority fallback). */
  profileCity?: string | null;
  profileState?: string | null;
}

function readCoords(): UserCoords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed: UserCoords = JSON.parse(raw);
    if (Date.now() - parsed.ts > COORDS_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCoords(coords: UserCoords) {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

function readManualCity(): { city: string; state?: string | null } | null {
  try {
    const raw = localStorage.getItem(MANUAL_CITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readActiveCity(): { city: string; state?: string | null } | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeActiveCity(value: { city: string; state?: string | null }) {
  try {
    localStorage.setItem(ACTIVE_CITY_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function isPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < PROMPT_DISMISSED_TTL_MS;
  } catch {
    return false;
  }
}

function isCitySkipped(city: string): boolean {
  try {
    const raw = localStorage.getItem(
      `${CITY_SKIP_PREFIX}${normalizeCity(city)}`
    );
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < CITY_SKIP_TTL_MS;
  } catch {
    return false;
  }
}

export function useUserLocation(options: UseUserLocationOptions = {}) {
  const { profileCity, profileState } = options;

  const [coords, setCoords] = useState<UserCoords | null>(() => readCoords());
  const [activeCity, setActiveCityState] = useState<UserCity | null>(() => {
    const manual = readManualCity();
    if (manual?.city) {
      return { city: manual.city, state: manual.state, source: "manual" };
    }
    const active = readActiveCity();
    if (active?.city) {
      return { city: active.city, state: active.state, source: "gps" };
    }
    return null;
  });
  const [pendingCity, setPendingCity] = useState<UserCity | null>(null);
  const [permission, setPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [requesting, setRequesting] = useState(false);
  const promptDismissedRef = useRef<boolean>(isPromptDismissed());

  // Initialize permission state
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void getLocationPermission().then(setPermission);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        setPermission(status.state as typeof permission);
        status.onchange = () => setPermission(status.state as typeof permission);
      })
      .catch(() => {
        setPermission("unknown");
      });
  }, []);

  // If we have GPS coords but no active city, reverse geocode now.
  useEffect(() => {
    if (!coords) return;
    if (activeCity?.source === "manual") return;
    let cancelled = false;
    reverseGeocode(coords.lat, coords.lng).then((res) => {
      if (cancelled || !res?.city) return;
      const detected: UserCity = {
        city: res.city,
        state: res.state,
        source: "gps",
      };
      // First time: assume it
      if (!activeCity) {
        writeActiveCity({ city: detected.city, state: detected.state });
        setActiveCityState(detected);
        return;
      }
      // City changed → set as pending (user confirms)
      const sameCity =
        normalizeCity(detected.city) === normalizeCity(activeCity.city);
      if (!sameCity && !isCitySkipped(detected.city)) {
        setPendingCity(detected);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lng]);

  // Profile fallback: if no manual + no active, use profile city
  useEffect(() => {
    if (activeCity) return;
    if (!profileCity) return;
    setActiveCityState({
      city: profileCity,
      state: profileState ?? null,
      source: "profile",
    });
  }, [activeCity, profileCity, profileState]);

  const requestLocation = useCallback(async () => {
    setRequesting(true);
    try {
      const { lat, lng } = await getCurrentCoords({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60_000,
      });
      const next: UserCoords = { lat, lng, ts: Date.now() };
      writeCoords(next);
      setCoords(next);
      setPermission("granted");
      setRequesting(false);
      return next;
    } catch (err) {
      console.warn(
        "[useUserLocation] geolocation error:",
        err instanceof Error ? err.message : err,
      );
      if (err instanceof LocationError && err.reason === "denied") setPermission("denied");
      setRequesting(false);
      return null;
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    promptDismissedRef.current = true;
  }, []);

  const setManualCity = useCallback(
    (city: string, state?: string | null) => {
      try {
        localStorage.setItem(
          MANUAL_CITY_KEY,
          JSON.stringify({ city, state: state ?? null })
        );
      } catch {
        /* ignore */
      }
      writeActiveCity({ city, state: state ?? null });
      setActiveCityState({ city, state: state ?? null, source: "manual" });
      setPendingCity(null);
    },
    []
  );

  const acceptPendingCity = useCallback(() => {
    if (!pendingCity) return;
    writeActiveCity({ city: pendingCity.city, state: pendingCity.state });
    setActiveCityState(pendingCity);
    setPendingCity(null);
  }, [pendingCity]);

  const dismissPendingCity = useCallback(() => {
    if (!pendingCity) return;
    try {
      localStorage.setItem(
        `${CITY_SKIP_PREFIX}${normalizeCity(pendingCity.city)}`,
        String(Date.now())
      );
    } catch {
      /* ignore */
    }
    setPendingCity(null);
  }, [pendingCity]);

  const shouldShowPermissionPrompt =
    permission !== "granted" &&
    permission !== "denied" &&
    !coords &&
    !promptDismissedRef.current;

  return {
    coords,
    activeCity,
    pendingCity,
    permission,
    requesting,
    shouldShowPermissionPrompt,
    requestLocation,
    dismissPrompt,
    setManualCity,
    acceptPendingCity,
    dismissPendingCity,
  };
}
