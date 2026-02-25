import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderItem {
  ticket_type_id: string;
  qty: number;
}

interface CreateOrderRequest {
  event_id: string;
  items: OrderItem[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateOrderRequest = await req.json();
    const { event_id, items } = body;

    if (!event_id || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing event_id or items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for admin operations
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify event exists and is published
    const { data: event, error: eventError } = await adminClient
      .from("events")
      .select("id, status, title")
      .eq("id", event_id)
      .single();

    if (eventError || !event || event.status !== "published") {
      return new Response(
        JSON.stringify({ error: "Event not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ticket types and validate availability
    const ticketTypeIds = items.map((i) => i.ticket_type_id);
    const { data: ticketTypes, error: ticketError } = await adminClient
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("event_id", event_id);

    if (ticketError || !ticketTypes) {
      return new Response(
        JSON.stringify({ error: "Error fetching ticket types" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item
    let totalCents = 0;
    const validatedItems: Array<{
      ticket_type_id: string;
      qty: number;
      unit_price_cents: number;
      ticket_type: typeof ticketTypes[0];
    }> = [];

    for (const item of items) {
      const ticketType = ticketTypes.find((t) => t.id === item.ticket_type_id);
      if (!ticketType) {
        return new Response(
          JSON.stringify({ error: `Ticket type ${item.ticket_type_id} not found` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (ticketType.status !== "active") {
        return new Response(
          JSON.stringify({ error: `Ticket type ${ticketType.name} is not available` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const available = ticketType.quantity_total - (ticketType.quantity_sold || 0);
      if (item.qty > available) {
        return new Response(
          JSON.stringify({ 
            error: `Not enough tickets available for ${ticketType.name}. Available: ${available}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const unitPrice = ticketType.price_cents || 0;
      totalCents += unitPrice * item.qty;
      validatedItems.push({
        ticket_type_id: item.ticket_type_id,
        qty: item.qty,
        unit_price_cents: unitPrice,
        ticket_type: ticketType,
      });
    }

    // Create order with 15 minute expiry
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        event_id,
        buyer_user_id: user.id,
        total_cents: totalCents,
        status: "pending",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items
    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      qty: item.qty,
      unit_price_cents: item.unit_price_cents,
    }));

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items creation error:", itemsError);
      // Rollback order
      await adminClient.from("orders").delete().eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Failed to create order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update ticket types sold count atomically (prevents race conditions)
    for (const item of validatedItems) {
      const { data: success, error: rpcError } = await adminClient
        .rpc("increment_quantity_sold", {
          p_ticket_type_id: item.ticket_type_id,
          p_increment_by: item.qty,
        });

      if (rpcError || !success) {
        // Rollback: delete order and order items
        await adminClient.from("order_items").delete().eq("order_id", order.id);
        await adminClient.from("orders").delete().eq("id", order.id);
        
        // Rollback already incremented ticket types
        for (const prev of validatedItems) {
          if (prev.ticket_type_id === item.ticket_type_id) break;
          await adminClient.rpc("increment_quantity_sold", {
            p_ticket_type_id: prev.ticket_type_id,
            p_increment_by: -prev.qty,
          });
        }
        
        return new Response(
          JSON.stringify({ error: `Ingressos esgotados para ${item.ticket_type.name}` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return order details for payment processing
    return new Response(
      JSON.stringify({
        order_id: order.id,
        total_cents: totalCents,
        expires_at: expiresAt,
        event_title: event.title,
        items: validatedItems.map((i) => ({
          name: i.ticket_type.name,
          qty: i.qty,
          unit_price_cents: i.unit_price_cents,
        })),
      }),
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
