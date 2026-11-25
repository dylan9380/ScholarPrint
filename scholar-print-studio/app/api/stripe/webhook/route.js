import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature) {
    return NextResponse.json({ error: "Stripe signature is missing." }, { status: 400 });
  }
  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe webhook configuration is missing." }, { status: 503 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: "Checkout session has no order reference." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (configurationError) {
    return NextResponse.json({ error: configurationError.message }, { status: 503 });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, price_cents, stripe_checkout_session_id")
    .eq("id", orderId)
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }
  if (!order) return NextResponse.json({ received: true });
  if (session.metadata?.user_id !== order.user_id) {
    return NextResponse.json({ error: "Checkout user does not match the order." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    if (session.currency !== "usd" || session.amount_total !== order.price_cents) {
      return NextResponse.json({ error: "Checkout amount does not match the order." }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({ status: "submitted", payment_status: "paid" })
      .eq("id", order.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: updateError } = await admin
      .from("orders")
      .update({ status: "payment_expired", payment_status: "expired" })
      .eq("id", order.id)
      .eq("payment_status", "unpaid");

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
