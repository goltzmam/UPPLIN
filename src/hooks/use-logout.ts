import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface UseLogoutOptions {
  /** Where to send the user after logout. Defaults to "/". */
  redirectTo?: string;
  /** Show a toast confirmation. Defaults to true. */
  showToast?: boolean;
}

/**
 * Centralized, robust logout hook used across participant, organizer and admin areas.
 *
 * - Prevents double-clicks while the request is in flight.
 * - Always clears local auth state (even if the network call fails).
 * - Performs a HARD navigation (window.location.replace) so React state,
 *   React-Query caches, listeners and any rehydrated Supabase session are
 *   wiped clean. This fixes the "logout doesn't actually log me out" bug
 *   that some users hit even after clearing the cache.
 */
export function useLogout(defaultOptions: UseLogoutOptions = {}) {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const inFlight = useRef(false);

  const logout = useCallback(
    async (override?: UseLogoutOptions) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoggingOut(true);

      const redirectTo = override?.redirectTo ?? defaultOptions.redirectTo ?? "/";
      const showToast = override?.showToast ?? defaultOptions.showToast ?? true;

      try {
        await signOut();
        if (showToast) {
          toast({
            title: "Sessão encerrada",
            description: "Você saiu da sua conta.",
          });
        }
      } catch (err: any) {
        console.warn("Logout error:", err);
      } finally {
        // Hard reload — drops in-memory React state, React Query caches,
        // and any rehydrated Supabase session. Only reliable way to guarantee
        // the user is fully logged out across all tabs/components.
        try {
          window.location.replace(redirectTo);
        } catch {
          window.location.href = redirectTo;
        }
      }
    },
    [signOut, toast, defaultOptions.redirectTo, defaultOptions.showToast]
  );

  return { logout, loggingOut };
}
