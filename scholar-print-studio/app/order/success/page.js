import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

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
    .select("id, user_id, title, price_cents, payment_status, conference")
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
    session.currency !== "usd" ||
    session.amount_total !== order.price_cents
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
        {order.title} · {formatPrice(order.price_cents)}
      </p>
      {order.conference && (
        <p className="text-sm text-ink/60 mb-4">
          Conference: <span className="font-semibold text-ink">{order.conference}</span>
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
