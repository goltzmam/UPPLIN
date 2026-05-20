import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a lightweight "I'm online" heartbeat to the backend for the
 * currently authenticated user. Used by admin analytics to display
 * live / today / 7d / 30d active users (participants and organizers).
 *
 * Strategy:
 *  - Fire once on login.
 *  - Fire every 60s while tab is visible.
 *  - Fire again when the tab becomes visible after being hidden.
 */
export function usePresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        await supabase.rpc("touch_last_seen");
      } catch {
        // silent — presence is best-effort
      }
    };

    // Initial ping
    ping();

    // Periodic ping (every 60s)
    const interval: ReturnType<typeof setInterval> = setInterval(ping, 60_000);

    // Ping again when tab regains focus
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);
}
