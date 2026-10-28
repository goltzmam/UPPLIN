export function resolveClientEnvironment(env: Record<string, string | undefined>) {
  // Vercel's Supabase integration may use Next.js/public or generic aliases.
  // Map only public credentials; service/secret keys are never candidates.
  return {
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY,
    VITE_APP_URL: env.VITE_APP_URL || "https://www.upplin.com",
  };
}

export function assertClientEnvironment(env: Record<string, string | undefined>) {
  const expected = "ermhzlthjlolqsbtjawf";
  if (env.VITE_SUPABASE_URL !== `https://${expected}.supabase.co`) {
    throw new Error("Set VITE_SUPABASE_URL to the configured UPPLIN Supabase project before building.");
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY is required in the deployment environment.");
  if (key.startsWith("sb_publishable_")) return;
  if (key.startsWith("eyJ")) {
    try {
      const claims = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (claims.role === "anon" && claims.ref === expected) return;
    } catch { /* Return the same safe error for all invalid public credentials. */ }
  }
  throw new Error("Use the public publishable/anon key of the configured Supabase project. Server secrets cannot be used in VITE variables.");
}
