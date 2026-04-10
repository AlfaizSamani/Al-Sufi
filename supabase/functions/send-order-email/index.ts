import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Sanitize user-supplied strings before injecting into HTML emails
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

interface OrderEmailPayload {
  order_id: string;
  email_type: "order_placed" | "status_update" | "delivered";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, email_type } = (await req.json()) as OrderEmailPayload;

    // Fetch order with items and user profile
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(product_name, quantity, price, subtotal)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .single();

    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemsList = (order.order_items || [])
      .map((item: any) => `• ${escapeHtml(item.product_name)} × ${item.quantity} — ₹${item.subtotal}`)
      .join("\n");

    const statusLabels: Record<string, string> = {
      placed: "Order Placed",
      confirmed: "Order Confirmed ✅",
      preparing: "Being Prepared 🍳",
      out_for_delivery: "Out for Delivery 🚚",
      delivered: "Delivered! 🎉",
      cancelled: "Order Cancelled ❌",
    };

    let subject = "";
    let htmlBody = "";
    const orderShort = order.id.slice(0, 8);
    const userName = escapeHtml(profile.full_name || "Customer");

    if (email_type === "order_placed") {
      subject = `Order Confirmed! #${orderShort} — Al-Sufi Frozen Foods`;
      htmlBody = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: hsl(15, 85%, 45%); padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">🎉 Order Confirmed!</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #333; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #555;">Thank you for your order! Here's what you ordered:</p>
            <div style="background: #f9f6f3; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="font-weight: 600; color: #333; margin: 0 0 8px;">Order #${orderShort}</p>
              <pre style="font-family: 'Inter', Arial, sans-serif; color: #555; font-size: 14px; white-space: pre-wrap; margin: 0;">${itemsList}</pre>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 12px 0;" />
              <p style="font-weight: 700; color: hsl(15, 85%, 45%); margin: 0; font-size: 16px;">Total: ₹${order.total}</p>
              <p style="color: #888; font-size: 12px; margin: 4px 0 0;">Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : "UPI"}</p>
            </div>
            <p style="color: #555; font-size: 14px;">We'll notify you at every step of your order. Stay tuned! 🚀</p>
            <p style="color: #888; font-size: 13px; margin-top: 24px;">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>
      `;
    } else if (email_type === "status_update") {
      const statusLabel = statusLabels[order.status] || order.status;
      subject = `Order Update: ${statusLabel} — #${orderShort}`;
      htmlBody = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: hsl(15, 85%, 45%); padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">Order Update</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #333; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #555;">Your order <strong>#${orderShort}</strong> status has been updated:</p>
            <div style="background: #f9f6f3; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
              <p style="font-size: 24px; margin: 0 0 8px;">${statusLabel}</p>
              <p style="color: #888; font-size: 14px; margin: 0;">Order Total: ₹${order.total}</p>
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 24px;">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>
      `;
    } else if (email_type === "delivered") {
      subject = `Thank you for your order! 🎉 — Al-Sufi Frozen Foods`;
      htmlBody = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: hsl(145, 40%, 42%); padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">🎉 Thank You!</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #333; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #555;">Your order <strong>#${orderShort}</strong> has been delivered! We hope you enjoy your food.</p>
            <div style="background: #f9f6f3; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="font-weight: 600; color: #333; margin: 0 0 8px;">What you ordered:</p>
              <pre style="font-family: 'Inter', Arial, sans-serif; color: #555; font-size: 14px; white-space: pre-wrap; margin: 0;">${itemsList}</pre>
            </div>
            <p style="color: #555; font-size: 14px;">Thank you for buying from us! We'd love to serve you again. 💚</p>
            <p style="color: #888; font-size: 13px; margin-top: 24px;">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>
      `;
    }

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Al-Sufi Frozen Foods <orders@resend.dev>",
        to: [profile.email],
        subject,
        html: htmlBody,
      }),
    });

    const emailResult = await emailRes.json();

    // Also fetch admin emails to notify them
    if (email_type === "order_placed") {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        const adminEmails = (adminProfiles || [])
          .map((p: any) => p.email)
          .filter(Boolean);

        if (adminEmails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Al-Sufi Frozen Foods <orders@resend.dev>",
              to: adminEmails,
              subject: `🔔 New Order #${orderShort} — ₹${order.total}`,
              html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
                  <div style="background: hsl(15, 85%, 45%); padding: 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 22px;">🔔 New Order!</h1>
                  </div>
                  <div style="padding: 24px;">
                    <p style="color: #333;"><strong>${userName}</strong> placed a new order:</p>
                    <div style="background: #f9f6f3; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="font-weight: 600; margin: 0 0 8px;">Order #${orderShort}</p>
                      <pre style="font-family: 'Inter', Arial, sans-serif; color: #555; font-size: 14px; white-space: pre-wrap; margin: 0;">${itemsList}</pre>
                      <hr style="border: none; border-top: 1px solid #ddd; margin: 12px 0;" />
                      <p style="font-weight: 700; color: hsl(15, 85%, 45%); margin: 0;">Total: ₹${order.total}</p>
                    </div>
                  </div>
                </div>
              `,
            }),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
