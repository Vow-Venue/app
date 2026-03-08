// Supabase Edge Function — Stripe Webhook Handler
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secret:  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
// Register in Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://rtlcgkchdsaqelioqkht.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

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

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook handler error:', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
