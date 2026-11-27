import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { formatDeliveryAddress } from "@/lib/delivery-address";
import { formatCAD } from "@/lib/format-currency";
import { normalizeCanadianPostalCode } from "@/lib/delivery";

export const metadata = {
  title: "Order Confirmation",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OrderSuccessPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const sessionId = searchParams?.session_id;
  if (!sessionId) {
    return <Message title="Payment could not be confirmed" body="The checkout session is missing." />;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, title, price_cents, shipping_cost_cents, delivery_method, payment_status, conference, delivery_address_line1, delivery_address_line2, delivery_city, delivery_region, delivery_postal_code, delivery_country")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (orderError || !order) {
    return (
      <Message
        title="Payment could not be confirmed"
        body={orderError?.message ?? "We couldn’t find an order for this checkout session."}
      />
    );
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (stripeError) {
    return <Message title="Payment confirmation is delayed" body={stripeError.message} />;
  }

  if (
    order.user_id !== user.id ||
    session.metadata?.order_id !== order.id ||
    session.metadata?.user_id !== user.id ||
    session.currency !== "cad" ||
    session.amount_total !== order.price_cents + order.shipping_cost_cents ||
    (session.shipping_cost?.amount_total ?? 0) !== order.shipping_cost_cents ||
    session.metadata?.delivery_method !== order.delivery_method ||
    Number(session.metadata?.shipping_cost_cents) !== order.shipping_cost_cents
  ) {
    return <Message title="Payment could not be confirmed" body="Checkout details do not match this order." />;
  }

  if (session.payment_status !== "paid") {
    return (
      <Message
        title="Payment is not complete"
        body="Your order will be submitted once payment is confirmed."
      />
    );
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
      let admin;
      try {
        admin = createAdminClient();
      } catch (configurationError) {
        return <Message title="Payment received" body={configurationError.message} />;
      }

      const { error: updateError } = await admin
        .from("orders")
        .update({ status: "address_review", payment_status: "paid" })
        .eq("id", order.id);
      if (updateError) {
        return <Message title="Payment received" body={`Delivery address review could not be recorded: ${updateError.message}`} />;
      }

      return (
        <Message
          title="Payment received — delivery address review needed"
          body="The postal code entered in Stripe checkout differed from the one used to calculate delivery. Your order is on hold while the delivery details are reviewed."
        />
      );
    }
  }

  if (order.payment_status !== "paid") {
    let admin;
    try {
      admin = createAdminClient();
    } catch (configurationError) {
      return <Message title="Payment received" body={configurationError.message} />;
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({ status: "submitted", payment_status: "paid" })
      .eq("id", order.id);

    if (updateError) {
      return <Message title="Payment received" body={`Order update failed: ${updateError.message}`} />;
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan mb-3">Payment complete</p>
      <h1 className="font-display text-3xl font-semibold mb-3">Your conference poster is ordered.</h1>
      <p className="text-ink/70 mb-4">
        {order.title} · {formatCAD(order.price_cents)}
      </p>
      <div className="mb-4 space-y-1 text-sm text-ink/60">
        <p>Delivery / shipping: {formatCAD(order.shipping_cost_cents)}</p>
        <p className="font-semibold text-ink">
          Total: {formatCAD(order.price_cents + order.shipping_cost_cents)}
        </p>
      </div>
      {order.conference && (
        <p className="text-sm text-ink/60 mb-4">
          Conference: <span className="font-semibold text-ink">{order.conference}</span>
        </p>
      )}
      {!order.conference && (
        <p className="text-sm text-ink/60 mb-4">
          Deliver to: <span className="font-semibold text-ink">{formatDeliveryAddress(order)}</span>
        </p>
      )}
      <p className="text-sm text-ink/60 mb-8">
        Confirmation number: <span className="font-mono">{order.id}</span>
      </p>
      <Link href="/dashboard" className="btn-primary">View my orders</Link>
    </div>
  );
}

function Message({ title, body }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-20">
      <h1 className="font-display text-2xl font-semibold mb-3">{title}</h1>
      <p className="text-ink/70 mb-8">{body}</p>
      <Link href="/dashboard" className="btn-primary">View my orders</Link>
    </div>
  );
}
