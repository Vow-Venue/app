// Supabase Edge Function — Stripe Webhook Handler
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secret:  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
// Register in Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://rtlcgkchdsaqelioqkht.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded

import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  // Verify signature if secret is configured
  let event: Stripe.Event
  if (webhookSecret && signature) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Webhook signature verification failed:', msg)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }
  } else {
    // No secret configured — parse raw (dev/testing only)
    event = JSON.parse(body)
  }

  try {
    switch (event.type) {
      // ── Payment succeeded — activate Pro plan ──────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const weddingId = session.metadata?.weddingId
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (weddingId) {
          // Update the specific wedding that initiated checkout
          await supabase.from('weddings').update({
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          }).eq('id', weddingId)
        }

        // Also upgrade all other weddings owned by this user
        if (userId) {
          await supabase.from('weddings').update({ plan: 'pro' })
            .eq('user_id', userId)
        }

        console.log(`Pro activated: wedding=${weddingId} user=${userId} customer=${customerId}`)
        break
      }

      // ── Subscription updated (e.g. renewed, changed plan) ─────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const status = sub.status // 'active', 'past_due', 'canceled', etc.
        const customerId = sub.customer as string

        // Map Stripe status to our plan
        const plan = (status === 'active' || status === 'trialing') ? 'pro' : 'free'

        await supabase.from('weddings').update({ plan })
          .eq('stripe_customer_id', customerId)

        console.log(`Subscription updated: customer=${customerId} status=${status} plan=${plan}`)
        break
      }

      // ── Subscription canceled — downgrade to free ─────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        await supabase.from('weddings').update({
          plan: 'free',
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', customerId)

        console.log(`Subscription canceled: customer=${customerId}`)
        break
      }

      // ── Invoice paid (renewal only) — send confirmation email ────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        if (invoice.billing_reason !== 'subscription_cycle') {
          console.log(`invoice.payment_succeeded skipped: billing_reason=${invoice.billing_reason}`)
          break
        }

        const customerEmail = invoice.customer_email as string
        if (!customerEmail) {
          console.error('invoice.payment_succeeded: no customer_email on invoice')
          break
        }

        const amountPaid = (invoice.amount_paid / 100).toLocaleString('en-US', {
          style: 'currency', currency: 'USD', minimumFractionDigits: 2,
        })
        const nextRenewalTimestamp = invoice.lines?.data?.[0]?.period?.end
        const nextRenewalDate = nextRenewalTimestamp
          ? new Date(nextRenewalTimestamp * 1000).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })
          : 'your next billing date'

        const renewalHtml = `
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
          <tr>
            <td style="background:linear-gradient(135deg,#3d2c2c,#5a3e3e);padding:32px 40px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#e8dcc8;font-style:italic;letter-spacing:1px;">
                Amorí
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0 0 20px;">
                Your Amorí Pro plan has been renewed.
              </p>
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0 0 20px;">
                We charged <strong>${amountPaid}</strong> to your card on file. Your next renewal is <strong>${nextRenewalDate}</strong>.
              </p>
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0 0 20px;">
                As a Pro member, you have unlimited weddings, vendor management, full guest tracking, and all premium features.
              </p>
              <p style="font-size:16px;color:#3d2c2c;line-height:1.6;margin:0;">
                Thank you for planning with Amorí!
              </p>
            </td>
          </tr>
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

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (RESEND_API_KEY) {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Amorí <noreply@amorisuite.com>',
              to: [customerEmail],
              subject: 'Your Amorí Pro plan has been renewed',
              html: renewalHtml,
            }),
          })
          const emailResult = await emailRes.json()
          if (!emailRes.ok) {
            console.error('Resend renewal email error:', emailResult)
          } else {
            console.log(`Renewal email sent to ${customerEmail}, id=${emailResult.id}`)
            await supabase.from('system_events').insert({
              event_type: 'resend_email',
              detail: `renewal_confirmation:${customerEmail}`,
            })
          }
        }

        console.log(`Renewal invoice processed: email=${customerEmail} amount=${amountPaid}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook handler error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }

  // Log event for system health tracking
  await supabase.from('system_events').insert({
    event_type: 'stripe_webhook',
    detail: event.type,
  })

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
