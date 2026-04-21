import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
 * - Navigates the user to a safe destination at the end.
 * - Surfaces a toast so the user gets immediate feedback.
 */
export function useLogout(defaultOptions: UseLogoutOptions = {}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
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
        // signOut already handles errors internally, but just in case:
        console.warn("Logout error:", err);
      } finally {
        // Always navigate, even on error — local state is already cleared.
        navigate(redirectTo, { replace: true });
        inFlight.current = false;
        setLoggingOut(false);
      }
    },
    [signOut, navigate, toast, defaultOptions.redirectTo, defaultOptions.showToast]
  );

  return { logout, loggingOut };
}
