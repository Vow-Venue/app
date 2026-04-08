import "@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  try {
    const { to, recipientName, inviterName, weddingTitle, inviteUrl, role, access } = await req.json()

    if (!to || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, inviteUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const accessLabel = access === "full" ? "Full Access" : "View Only"
    const roleText = role ? ` as <strong>${role}</strong>` : ""
    const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,"
    const title = weddingTitle || "a wedding"

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3d2c2c,#5a3e3e);padding:32px 40px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#e8dcc8;font-style:italic;letter-spacing:1px;">
                Amorí
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0 0 20px;">
                ${greeting}
              </p>
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0 0 20px;">
                <strong>${inviterName || "Someone"}</strong> has invited you to collaborate on
                <strong>${title}</strong>${roleText} with <strong>${accessLabel}</strong> permissions.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:12px 0 28px;">
                    <a href="${inviteUrl}" style="display:inline-block;background:#b8975a;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:2px;text-decoration:none;padding:14px 36px;border-radius:6px;">
                      ACCEPT INVITATION
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#8c7e72;line-height:1.6;margin:0 0 8px;">
                This link will expire in 48 hours and can only be used once.
              </p>
              <p style="font-size:12px;color:#a89e94;line-height:1.6;margin:0;word-break:break-all;">
                ${inviteUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#faf8f5;padding:20px 40px;text-align:center;border-top:1px solid #ede8e0;">
              <p style="font-size:11px;color:#a89e94;margin:0;">
                Amorí · Wedding Planning Made Beautiful
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Amorí <onboarding@resend.dev>",
        to: [to],
        subject: `${inviterName || "Someone"} invited you to collaborate on ${title}`,
        html,
      }),
    })

    const result = await res.json()

    // Log successful send for system health tracking
    if (res.ok) {
      const sbUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      if (sbUrl && sbKey) {
        await fetch(`${sbUrl}/rest/v1/system_events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
          },
          body: JSON.stringify({ event_type: "resend_email", detail: to }),
        })
      }
    }

    if (!res.ok) {
      console.error("Resend error:", result)
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("send-invite error:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
