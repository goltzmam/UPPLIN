import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@4.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  email: z.string().email(),
  isOrganizer: z.boolean().optional().default(false),
  redirectOrigin: z.string().min(1).max(300),
});

const allowedOrigins = new Set([
  "https://www.upplin.com",
  "https://www.upplin.com",
  "https://upplin.com",
  "https://upplin.com.br",
]);

function isAllowedOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return (
      allowedOrigins.has(parsed.origin) ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function buildRedirectTo(origin: string, isOrganizer: boolean) {
  return `${origin}/redefinir-senha${isOrganizer ? "?tipo=organizador" : ""}`;
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUserNotFoundError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes("user not found") || normalized.includes("not found");
}

function isNativeProvisioningError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  return ["smtp", "email", "domain", "provision", "hook", "template", "send"].some((term) =>
    normalized.includes(term),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "Password recovery service is not configured" });
  }

  try {
    const parsedBody = requestSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return jsonResponse(400, { error: parsedBody.error.flatten().fieldErrors });
    }

    const { email, isOrganizer, redirectOrigin } = parsedBody.data;
    const normalizedEmail = email.trim().toLowerCase();

    if (!isAllowedOrigin(redirectOrigin)) {
      return jsonResponse(400, { error: "Redirect origin is not allowed" });
    }

    const redirectTo = buildRedirectTo(redirectOrigin, isOrganizer);

    const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const nativeAttempt = await publicClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

    if (!nativeAttempt.error) {
      return jsonResponse(200, {
        success: true,
        delivery: "native",
        redirectTo,
      });
    }

    console.warn("Native password recovery email failed:", nativeAttempt.error.message);

    if (isUserNotFoundError(nativeAttempt.error.message)) {
      return jsonResponse(200, {
        success: true,
        delivery: "silent",
        redirectTo,
      });
    }

    if (!isNativeProvisioningError(nativeAttempt.error.message)) {
      throw nativeAttempt.error;
    }

    console.warn("Using localized fallback password recovery email.");

    const linkResult = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (linkResult.error) {
      if (isUserNotFoundError(linkResult.error.message)) {
        return jsonResponse(200, {
          success: true,
          delivery: "silent",
          redirectTo,
        });
      }

      throw linkResult.error;
    }

    const actionLink = linkResult.data.properties?.action_link;

    if (!actionLink) {
      throw new Error("Recovery link could not be generated");
    }

    const fallbackResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password_reset",
        to: normalizedEmail,
        data: {
          resetLink: actionLink,
          resetOrigin: redirectOrigin,
          isOrganizer,
        },
      }),
    });

    const fallbackPayload = await fallbackResponse.json().catch(() => ({}));

    if (!fallbackResponse.ok) {
      throw new Error(
        typeof fallbackPayload?.error === "string"
          ? fallbackPayload.error
          : "Fallback password reset email could not be sent"
      );
    }

    return jsonResponse(200, {
      success: true,
      delivery: "fallback",
      redirectTo,
    });
  } catch (error) {
    console.error("request-password-reset error:", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Unexpected password recovery error",
    });
  }
});