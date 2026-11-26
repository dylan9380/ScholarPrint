import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { normalizeCanadianPostalCode } from "@/lib/delivery";

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
    .select("id, user_id, price_cents, shipping_cost_cents, delivery_method, delivery_postal_code, stripe_checkout_session_id")
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
    const shippingCents = session.shipping_cost?.amount_total ?? 0;
    if (
      session.currency !== "cad" ||
      session.amount_total !== order.price_cents + order.shipping_cost_cents ||
      shippingCents !== order.shipping_cost_cents ||
      session.metadata?.delivery_method !== order.delivery_method ||
      Number(session.metadata?.shipping_cost_cents) !== order.shipping_cost_cents
    ) {
      return NextResponse.json({ error: "Checkout amount does not match the order." }, { status: 400 });
    }

    if (order.delivery_method !== "conference") {
      const checkoutPostalCode =
        session.collected_information?.shipping_details?.address?.postal_code ??
        session.shipping_details?.address?.postal_code;
      if (
        typeof checkoutPostalCode !== "string" ||
        normalizeCanadianPostalCode(checkoutPostalCode) !==
          normalizeCanadianPostalCode(order.delivery_postal_code || "")
      ) {
        const { error: reviewError } = await admin
          .from("orders")
          .update({ status: "address_review", payment_status: "paid" })
          .eq("id", order.id);
        if (reviewError) {
          return NextResponse.json({ error: reviewError.message }, { status: 500 });
        }
        return NextResponse.json({ received: true });
      }
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
