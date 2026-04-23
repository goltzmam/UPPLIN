import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  photo_url: string | null;
  cpf: string | null;
  cpf_locked: boolean | null;
  city: string | null;
  state: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; user: User | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signInWithGoogle: (redirectUri?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  /** Returns the currently active user ID stored in localStorage (cross-tab aware) */
  getActiveUserId: () => string | null;
}

const AUTH_USER_KEY = "upplin_active_user_id";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const normalizeAuthError = (error: { message: string; code?: string | number } | null) => {
    if (!error) return null;

    if (
      error.code === "weak_password" ||
      /weak password|known to be weak|easy to guess|pwned/i.test(error.message)
    ) {
      return new Error("Essa senha é muito fraca ou já foi exposta. Use uma senha mais forte.");
    }

    return new Error(error.message);
  };

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    if (data) {
      return data;
    }

    const fallbackProfile = {
      id: currentUser.id,
      email: currentUser.email ?? "",
      full_name:
        currentUser.user_metadata?.full_name ??
        currentUser.user_metadata?.name ??
        null,
      photo_url: currentUser.user_metadata?.avatar_url ?? null,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .upsert(fallbackProfile, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (createError) {
      console.error("Error creating missing profile:", createError);
      return null;
    }

    return createdProfile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user);
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
            const profileData = await fetchProfile(currentSession.user);
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
        fetchProfile(currentSession.user).then((profileData) => {
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
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return {
      error: normalizeAuthError(error),
      user: data.user ?? null,
      needsEmailConfirmation: !data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    return {
      error: error ? new Error(error.message) : null,
      user: data.user ?? null,
    };
  };

  const signInWithGoogle = async (redirectUri?: string) => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri ?? window.location.origin,
    });

    return {
      error: result.error ? new Error(String(result.error)) : null,
    };
  };

  const signOut = async () => {
    // 1. Optimistically clear local React state FIRST so the UI updates instantly,
    //    even if the network call to Supabase is slow or fails.
    setUser(null);
    setSession(null);
    setProfile(null);

    // 2. Hard-purge ALL Supabase auth keys from localStorage + sessionStorage.
    //    Safety net for when supabase.auth.signOut() fails silently and leaves the
    //    "sb-<ref>-auth-token" entry behind, which would cause the SDK to
    //    rehydrate the session on the next reload — the exact bug users hit.
    const purgeAuthStorage = () => {
      try {
        for (const storage of [localStorage, sessionStorage]) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key) continue;
            if (
              key.startsWith("sb-") ||
              key.includes("supabase.auth") ||
              key === AUTH_USER_KEY
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => storage.removeItem(k));
        }
      } catch {
        /* ignore storage errors */
      }
    };
    purgeAuthStorage();

    // 3. Tell Supabase to revoke the session globally, but don't let a slow
    //    network call hang the UI. Race against a 2s timeout.
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (err) {
      console.warn("signOut threw, but local state was cleared:", err);
    }

    // 4. Final defensive purge in case the SDK wrote anything back during signOut.
    purgeAuthStorage();
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
