import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get organizer
    const { data: organizer } = await adminClient
      .from("organizer_accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    if (!organizer) {
      return new Response(
        JSON.stringify({ error: "Organizer account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current subscription
    const { data: currentSub } = await adminClient
      .from("organizer_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("organizer_id", organizer.id)
      .single();

    if (!currentSub || currentSub.plan_id === "free") {
      return new Response(
        JSON.stringify({ error: "No active paid subscription to cancel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel MP preapproval if exists
    if (currentSub.mp_subscription_id) {
      const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
      const cancelResp = await fetch(
        `https://api.mercadopago.com/preapproval/${currentSub.mp_subscription_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mpAccessToken}`,
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (!cancelResp.ok) {
        const errData = await cancelResp.json();
        console.error("MP cancel error:", JSON.stringify(errData));
        // Continue with local cancellation even if MP fails
      } else {
        console.log(`MP preapproval ${currentSub.mp_subscription_id} cancelled`);
      }
    }

    // Downgrade to free
    await adminClient
      .from("organizer_subscriptions")
      .update({
        plan_id: "free",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: null,
        mp_subscription_id: null,
      })
      .eq("organizer_id", organizer.id);

    console.log(`Subscription cancelled for organizer ${organizer.id}, downgraded to free`);

    return new Response(
      JSON.stringify({ status: "cancelled", new_plan: "free" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
