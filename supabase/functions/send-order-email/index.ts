import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Azure Communication Services Email (replaces Resend) ──────────────────────
const ACS_ENDPOINT   = Deno.env.get("ACS_EMAIL_ENDPOINT")!;   // e.g. https://al-sufi-comms.communication.azure.com
const ACS_ACCESS_KEY = Deno.env.get("ACS_EMAIL_ACCESS_KEY")!; // ACS access key (base64)
const ACS_FROM       = Deno.env.get("ACS_EMAIL_FROM")!;       // Verified sender e.g. noreply@yourdomain.com

// ── ACS HMAC Signing ──────────────────────────────────────────────────────────
async function sendACSEmail(to: string | string[], subject: string, html: string) {
  const recipients = Array.isArray(to) ? to : [to];
  const body = JSON.stringify({
    senderAddress: ACS_FROM,
    content: { subject, html },
    recipients: {
      to: recipients.map((address) => ({ address })),
    },
  });

  const date       = new Date().toUTCString();
  const host       = new URL(ACS_ENDPOINT).host;
  const pathQuery  = "/emails:send?api-version=2023-03-31";
  const url        = `${ACS_ENDPOINT}${pathQuery}`;

  // SHA-256 hash of body
  const bodyBytes     = new TextEncoder().encode(body);
  const bodyHashBuf   = await crypto.subtle.digest("SHA-256", bodyBytes);
  const contentHash   = btoa(String.fromCharCode(...new Uint8Array(bodyHashBuf)));

  // Build string-to-sign
  const stringToSign  = `POST\n${pathQuery}\n${date};${host};${contentHash}`;

  // Sign with HMAC-SHA256
  const keyBytes  = Uint8Array.from(atob(ACS_ACCESS_KEY), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf   = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(stringToSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":        "application/json",
      "x-ms-date":           date,
      "x-ms-content-sha256": contentHash,
      "Authorization":       `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
      "repeatability-request-id":   crypto.randomUUID(),
      "repeatability-first-sent":   date,
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ACS email failed: ${response.status} ${err}`);
  }

  return response;
}

// ── HTML Sanitizer ────────────────────────────────────────────────────────────
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

// ── Entry Point ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ACS_ENDPOINT || !ACS_ACCESS_KEY || !ACS_FROM) {
      return new Response(
        JSON.stringify({ error: "Azure Communication Services not configured. Set ACS_EMAIL_ENDPOINT, ACS_EMAIL_ACCESS_KEY, and ACS_EMAIL_FROM." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, supabaseKey);

    const { order_id, email_type } = (await req.json()) as OrderEmailPayload;

    // Fetch order with items
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

    // Fetch customer profile
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
      placed:          "Order Placed",
      confirmed:       "Order Confirmed ✅",
      preparing:       "Being Prepared 🍳",
      out_for_delivery:"Out for Delivery 🚚",
      delivered:       "Delivered! 🎉",
      cancelled:       "Order Cancelled ❌",
    };

    const orderShort = order.id.slice(0, 8);
    const userName   = escapeHtml(profile.full_name || "Customer");
    let subject      = "";
    let htmlBody     = "";

    // ── Email Templates ─────────────────────────────────────────────────────
    if (email_type === "order_placed") {
      subject  = `Order Confirmed! #${orderShort} — Al-Sufi Frozen Foods`;
      htmlBody = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
          <div style="background:hsl(15,85%,45%);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">🎉 Order Confirmed!</h1>
          </div>
          <div style="padding:24px">
            <p style="color:#333;font-size:16px">Hi ${userName},</p>
            <p style="color:#555">Thank you for your order! Here's what you ordered:</p>
            <div style="background:#f9f6f3;border-radius:8px;padding:16px;margin:16px 0">
              <p style="font-weight:600;color:#333;margin:0 0 8px">Order #${orderShort}</p>
              <pre style="font-family:'Inter',Arial,sans-serif;color:#555;font-size:14px;white-space:pre-wrap;margin:0">${itemsList}</pre>
              <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
              <p style="font-weight:700;color:hsl(15,85%,45%);margin:0;font-size:16px">Total: ₹${order.total}</p>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : "UPI"}</p>
            </div>
            <p style="color:#555;font-size:14px">We'll notify you at every step. Stay tuned! 🚀</p>
            <p style="color:#888;font-size:13px;margin-top:24px">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>`;
    } else if (email_type === "status_update") {
      const statusLabel = statusLabels[order.status] || order.status;
      subject  = `Order Update: ${statusLabel} — #${orderShort}`;
      htmlBody = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
          <div style="background:hsl(15,85%,45%);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Order Update</h1>
          </div>
          <div style="padding:24px">
            <p style="color:#333;font-size:16px">Hi ${userName},</p>
            <p style="color:#555">Your order <strong>#${orderShort}</strong> status has been updated:</p>
            <div style="background:#f9f6f3;border-radius:8px;padding:20px;margin:16px 0;text-align:center">
              <p style="font-size:24px;margin:0 0 8px">${statusLabel}</p>
              <p style="color:#888;font-size:14px;margin:0">Order Total: ₹${order.total}</p>
            </div>
            <p style="color:#888;font-size:13px;margin-top:24px">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>`;
    } else if (email_type === "delivered") {
      subject  = `Thank you for your order! 🎉 — Al-Sufi Frozen Foods`;
      htmlBody = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
          <div style="background:hsl(145,40%,42%);padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">🎉 Thank You!</h1>
          </div>
          <div style="padding:24px">
            <p style="color:#333;font-size:16px">Hi ${userName},</p>
            <p style="color:#555">Your order <strong>#${orderShort}</strong> has been delivered! Enjoy your food.</p>
            <div style="background:#f9f6f3;border-radius:8px;padding:16px;margin:16px 0">
              <p style="font-weight:600;color:#333;margin:0 0 8px">What you ordered:</p>
              <pre style="font-family:'Inter',Arial,sans-serif;color:#555;font-size:14px;white-space:pre-wrap;margin:0">${itemsList}</pre>
            </div>
            <p style="color:#555;font-size:14px">Thank you for buying from us! We'd love to serve you again. 💚</p>
            <p style="color:#888;font-size:13px;margin-top:24px">— Al-Sufi Frozen Foods Team</p>
          </div>
        </div>`;
    }

    // ── Send email to customer via Azure Communication Services ─────────────
    await sendACSEmail(profile.email, subject, htmlBody);

    // ── Also notify all admins when a new order is placed ──────────────────
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

        const adminEmails = (adminProfiles || []).map((p: any) => p.email).filter(Boolean);

        if (adminEmails.length > 0) {
          const adminSubject = `🔔 New Order #${orderShort} — ₹${order.total}`;
          const adminHtml    = `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
              <div style="background:hsl(15,85%,45%);padding:24px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:22px">🔔 New Order Received!</h1>
              </div>
              <div style="padding:24px">
                <p style="color:#333"><strong>${userName}</strong> (${profile.email}) placed a new order:</p>
                <div style="background:#f9f6f3;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="font-weight:600;margin:0 0 8px">Order #${orderShort}</p>
                  <pre style="font-family:'Inter',Arial,sans-serif;color:#555;font-size:14px;white-space:pre-wrap;margin:0">${itemsList}</pre>
                  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
                  <p style="font-weight:700;color:hsl(15,85%,45%);margin:0">Total: ₹${order.total}</p>
                </div>
                <p style="color:#888;font-size:12px">Log in to the admin panel to manage this order.</p>
              </div>
            </div>`;
          // Send to ALL admins in one call
          await sendACSEmail(adminEmails, adminSubject, adminHtml);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
