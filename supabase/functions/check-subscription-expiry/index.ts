import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active subscriptions expiring in exactly 3 days
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const startOfDay = new Date(threeDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: expiringSubs, error: subError } = await adminClient
      .from("organizer_subscriptions")
      .select("id, organizer_id, plan_id, current_period_end")
      .eq("status", "active")
      .gte("current_period_end", startOfDay.toISOString())
      .lte("current_period_end", endOfDay.toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`Found ${expiringSubs?.length || 0} subscriptions expiring in 3 days`);

    let notificationsCreated = 0;

    for (const sub of expiringSubs || []) {
      // Get organizer owner
      const { data: organizer } = await adminClient
        .from("organizer_accounts")
        .select("owner_user_id, display_name")
        .eq("id", sub.organizer_id)
        .single();

      if (!organizer) continue;

      // Get plan name
      const { data: plan } = await adminClient
        .from("subscription_plans")
        .select("name")
        .eq("id", sub.plan_id)
        .single();

      const planName = plan?.name || sub.plan_id;
      const expiryDate = new Date(sub.current_period_end!).toLocaleDateString("pt-BR");

      // Check if we already sent this notification (avoid duplicates)
      const { data: existing } = await adminClient
        .from("notifications")
        .select("id")
        .eq("user_id", organizer.owner_user_id)
        .eq("type", "subscription_expiry_reminder")
        .gte("created_at", startOfDay.toISOString())
        .maybeSingle();

      if (existing) {
        console.log(`Notification already sent for organizer ${sub.organizer_id}`);
        continue;
      }

      // Create notification
      await adminClient.from("notifications").insert({
        user_id: organizer.owner_user_id,
        title: "⚠️ Assinatura expirando em breve",
        body: `Seu plano ${planName} vence em ${expiryDate}. Renove para continuar aproveitando os benefícios!`,
        type: "subscription_expiry_reminder",
        data: {
          subscription_id: sub.id,
          organizer_id: sub.organizer_id,
          plan_id: sub.plan_id,
          expires_at: sub.current_period_end,
        },
      });

      notificationsCreated++;
      console.log(`Notification sent to organizer ${organizer.display_name}`);
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: notificationsCreated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
