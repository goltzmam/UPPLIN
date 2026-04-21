import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  photo_url: string | null;
  cpf: string | null;
  cpf_locked: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  /** Returns the currently active user ID stored in localStorage (cross-tab aware) */
  getActiveUserId: () => string | null;
}

const AUTH_USER_KEY = "upplin_active_user_id";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const getActiveUserId = (): string | null => {
    return localStorage.getItem(AUTH_USER_KEY);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        const incomingUserId = currentSession?.user?.id ?? null;
        const currentActiveId = localStorage.getItem(AUTH_USER_KEY);

        // ─── Cross-tab session hijack detection ───────────────────────────
        // If another tab logged in as a DIFFERENT user, force this tab out.
        if (
          event === "SIGNED_IN" &&
          currentActiveId &&
          incomingUserId &&
          currentActiveId !== incomingUserId
        ) {
          // A different user is now logged in from another tab — sign out here too.
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          localStorage.removeItem(AUTH_USER_KEY);
          // Redirect to login with a notice
          window.location.href = "/login?sessao_encerrada=1";
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === "SIGNED_IN" && incomingUserId) {
          localStorage.setItem(AUTH_USER_KEY, incomingUserId);
        }

        if (event === "SIGNED_OUT") {
          localStorage.removeItem(AUTH_USER_KEY);
        }

        if (currentSession?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        localStorage.setItem(AUTH_USER_KEY, currentSession.user.id);
        fetchProfile(currentSession.user.id).then((profileData) => {
          setProfile(profileData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    // Optimistically clear local state FIRST so the UI updates instantly,
    // even if the network call to Supabase is slow or fails.
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      /* ignore storage errors */
    }

    try {
      // scope: 'local' avoids waiting on a global revoke round-trip,
      // which is what most users perceive as "logout is stuck/slow".
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error && !/session.*not.*found/i.test(error.message)) {
        // Non-fatal: state is already cleared. Log for debugging.
        console.warn("Supabase signOut returned an error:", error.message);
      }
    } catch (err) {
      console.warn("signOut threw, but local state was cleared:", err);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user.id);

    if (!error) {
      await refreshProfile();
    }

    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshProfile,
        getActiveUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
