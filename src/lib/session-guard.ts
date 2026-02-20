import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the active user ID stored in localStorage by the AuthProvider.
 * Used to detect cross-account login attempts before signing in.
 */
const AUTH_USER_KEY = "upplin_active_user_id";

export function getStoredActiveUserId(): string | null {
  return localStorage.getItem(AUTH_USER_KEY);
}

/**
 * Checks if there is already an active session from a DIFFERENT user.
 * Returns the current user's email if a conflict exists, or null if clear.
 */
export async function checkSessionConflict(incomingEmail: string): Promise<{ conflict: boolean; currentEmail: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { conflict: false, currentEmail: null };

  // Same account — no conflict
  if (session.user.email?.toLowerCase() === incomingEmail.toLowerCase()) {
    return { conflict: false, currentEmail: null };
  }

  return { conflict: true, currentEmail: session.user.email ?? null };
}
