export interface AuthEmailPayload {
  user: { email: string; new_email?: string };
  email_data: {
    email_action_type: string;
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
  };
}

export function authEmailDeliveries(payload: AuthEmailPayload, supabaseUrl: string, siteUrl: string) {
  if (!payload?.user?.email || !payload?.email_data?.email_action_type) throw new Error("Invalid auth email payload");
  const { user, email_data: data } = payload;
  const action = data.email_action_type;
  const build = (to: string, hash: string | undefined, token: string | undefined, recipient: string) => {
    if (action !== "reauthentication" && !hash) throw new Error("Missing verification token");
    const url = new URL("/auth/v1/verify", supabaseUrl);
    url.searchParams.set("token", hash || "");
    url.searchParams.set("type", action);
    url.searchParams.set("redirect_to", data.redirect_to || siteUrl);
    return { to, token: token || "", confirmationUrl: url.toString(), recipient };
  };
  if (action !== "email_change") return [build(user.email, data.token_hash, data.token, "current")];
  if (!user.new_email) throw new Error("Missing new email address");
  // Supabase's secure-email-change hash names are reversed for compatibility:
  // token_hash_new verifies the current address; token_hash verifies the new one.
  if (data.token_hash_new && data.token_hash) return [
    build(user.email, data.token_hash_new, data.token, "current"),
    build(user.new_email, data.token_hash, data.token_new, "new"),
  ];
  return [build(user.new_email, data.token_hash, data.token_new || data.token, "new")];
}
