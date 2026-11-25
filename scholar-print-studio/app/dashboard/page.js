import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, title, width_in, height_in, material, quantity, rush, price_cents, payment_status, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-10">
        <h1 className="font-display text-2xl font-semibold">My orders</h1>
        <Link href="/order/new" className="btn-primary">
          New order
        </Link>
      </div>

      {error && <p className="text-proofred text-sm mb-6">{error.message}</p>}

      {orders && orders.length === 0 && (
        <p className="text-ink/60">You haven't placed any orders yet.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="border border-ink/10 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Poster
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Size
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Material
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Total
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Placed
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">
                    {order.title}
                    {order.rush && (
                      <span className="ml-2 text-[11px] font-mono text-proofred">RUSH</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.width_in} × {order.height_in} in · ×{order.quantity}
                  </td>
                  <td className="px-4 py-3 capitalize">{order.material}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[order.status] ?? order.status}</td>
                  <td className="px-4 py-3">
                    {order.price_cents != null &&
                      (order.payment_status === "paid" || order.payment_status === "not_applicable")
                      ? `$${(order.price_cents / 100).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
