import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_AUTH_CALLBACK, nativeAuthCode, safeAppPath } from "./native-auth-url";

const RETURN_PATH = "upplin:oauth-return-path";
let initialization: Promise<void> | undefined;
let exchangingCode: string | undefined;

async function handleNativeCallback(url: string) {
  const code = nativeAuthCode(url);
  if (!code || code === exchangingCode) return;
  exchangingCode = code;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await Browser.close().catch(() => undefined);
    const path = safeAppPath(localStorage.getItem(RETURN_PATH));
    localStorage.removeItem(RETURN_PATH);
    window.location.replace(path);
  } catch {
    toast.error("Não foi possível concluir o login. Tente entrar novamente.");
  } finally {
    exchangingCode = undefined;
  }
}

export function initializeNativeAuth(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  initialization ??= (async () => {
    await App.addListener("appUrlOpen", ({ url }) => { void handleNativeCallback(url); });
    const launch = await App.getLaunchUrl();
    if (launch?.url) await handleNativeCallback(launch.url);
  })();
  return initialization;
}

export async function signInWithOAuth(
  provider: "google" | "apple" | "microsoft",
  opts?: { redirect_uri?: string; extraParams?: Record<string, string> },
) {
  const native = Capacitor.isNativePlatform();
  if (native) {
    await initializeNativeAuth();
    const target = new URL(opts?.redirect_uri || "/", "https://www.upplin.com");
    localStorage.setItem(RETURN_PATH, safeAppPath(target.pathname + target.search));
  }
  const result = await supabase.auth.signInWithOAuth({
    provider: provider === "microsoft" ? "azure" : provider,
    options: {
      redirectTo: native ? NATIVE_AUTH_CALLBACK : opts?.redirect_uri,
      skipBrowserRedirect: native,
      queryParams: opts?.extraParams,
    },
  });
  if (native && !result.error && result.data.url) {
    try { await Browser.open({ url: result.data.url }); }
    catch { return { ...result, error: new Error("Não foi possível abrir o login.") }; }
  }
  return result;
}
