import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL = {
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  payment_expired: "Payment expired",
  submitted: "Submitted",
  received: "Received",
  printing: "Printing",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatPrice(cents) {
  return cents == null ? "—" : `$${(cents / 100).toFixed(2)}`;
}

export default async function PreviousOrders() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="mb-10 border-y border-ink/15 py-5">
        <h2 className="font-display text-lg font-semibold">Previous orders</h2>
        <p className="mt-1 text-sm text-ink/60">
          <Link href="/login" className="text-cyan underline">Sign in</Link> to see your order history.
        </p>
      </section>
    );
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, title, status, conference, price_cents, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <section className="mb-10 border-y border-ink/15 py-5">
      <h2 className="font-display text-lg font-semibold">Previous orders</h2>
      {error ? (
        <p className="mt-2 text-sm text-proofred" role="alert">{error.message}</p>
      ) : orders.length === 0 ? (
        <p className="mt-1 text-sm text-ink/60">No previous orders yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/10">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
              <span className="font-medium">{order.title}</span>
              <span className="font-mono text-xs text-ink/60">
                {order.status === "ready" && order.conference
                  ? "Ready for conference delivery"
                  : STATUS_LABEL[order.status] ?? order.status}
                {" · "}
                {new Date(order.created_at).toLocaleDateString()}
                {" · "}
                {formatPrice(order.price_cents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
