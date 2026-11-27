import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDeliveryAddress } from "@/lib/delivery-address";
import { formatCAD } from "@/lib/format-currency";
import CancellationRequestButton from "../cancellation-request-button";

const STATUS_LABEL = {
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  payment_expired: "Payment expired",
  address_review: "Delivery address review",
  submitted: "Submitted",
  received: "Received",
  printing: "Printing",
  ready: "Ready for pickup",
  shipped: "On its way",
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

  const rawName = user.user_metadata?.full_name;
  const displayName =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : user.email?.split("@")[0] ?? "there";

  const [
    { data: orders, error },
    { data: profile, error: profileError },
    { data: cancellationRequests, error: cancellationError },
  ] = await Promise.all([
    supabase
    .from("orders")
    .select("id, customer_name, title, width_in, height_in, material, quantity, rush, price_cents, payment_status, status, conference, delivery_method, shipping_cost_cents, tracking_number, delivery_address_line1, delivery_address_line2, delivery_city, delivery_region, delivery_postal_code, delivery_country, created_at")
    .eq("user_id", user.id)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false }),
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    supabase
      .from("order_cancellation_requests")
      .select("order_id, status")
      .eq("user_id", user.id),
  ]);
  const isAdmin = profile?.is_admin === true;

  let adminRequests = [];
  let adminRequestError = null;
  let adminOrderTitles = {};
  if (isAdmin) {
    const { data, error: requestError } = await supabase
      .from("order_cancellation_requests")
      .select("id, order_id, user_id, message, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    adminRequestError = requestError;
    adminRequests = data ?? [];

    if (adminRequests.length > 0) {
      const { data: requestOrders, error: requestOrdersError } = await supabase
        .from("orders")
        .select("id, title, customer_name")
        .in("id", adminRequests.map((request) => request.order_id));

      if (requestOrdersError) {
        adminRequestError = requestOrdersError;
      } else {
        adminOrderTitles = Object.fromEntries(
          (requestOrders ?? []).map((order) => [
            order.id,
            { title: order.title, customerName: order.customer_name },
          ])
        );
      }
    }
  }
  const pendingOrderIds = new Set(
    (cancellationRequests ?? [])
      .filter((request) => request.status === "pending")
      .map((request) => request.order_id)
  );

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan">
        Customer portal / Welcome back, {displayName}
      </p>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.05em] sm:text-5xl">My orders</h1>
          <p className="mt-2 text-sm text-ink/60">Order history and print status.</p>
        </div>
        <Link href="/order/new" className="btn-primary">
          New order <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {error && <p className="text-proofred text-sm mb-6">{error.message}</p>}
      {profileError && <p className="text-proofred text-sm mb-6">{profileError.message}</p>}
      {cancellationError && (
        <p className="text-proofred text-sm mb-6">{cancellationError.message}</p>
      )}

      {isAdmin && (
        <section className="mb-10 border border-ink/15 bg-white p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Staff inbox</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Cancellation requests</h2>
            </div>
          </div>
          {adminRequestError ? (
            <p className="text-sm text-proofred" role="alert">{adminRequestError.message}</p>
          ) : adminRequests.length === 0 ? (
            <p className="text-sm text-ink/60">No pending cancellation requests.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {adminRequests.map((request) => (
                <li key={request.id} className="py-4">
                  <p className="font-semibold">
                    {adminOrderTitles[request.order_id]?.title ?? "Poster order"}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    Customer: {adminOrderTitles[request.order_id]?.customerName || "—"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{request.message}</p>
                  <p className="mt-2 font-mono text-[10px] text-ink/50">
                    Order {request.order_id} · Account {request.user_id} ·{" "}
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink/60">
            Requests do not cancel orders automatically. Contact the customer, then decide whether to cancel.
          </p>
        </section>
      )}

      {!error && (!orders || orders.length === 0) && (
        <section className="grid border border-ink/15 bg-white md:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-64 items-center justify-center border-b border-ink/15 bg-[#F7F6F2] p-8 md:border-b-0 md:border-r">
            <svg
              viewBox="0 0 360 260"
              role="img"
              aria-label="An unprinted poster sheet beneath a printer carriage"
              className="w-full max-w-sm"
            >
              <path d="M56 48H304V224H56z" fill="#fff" stroke="#121212" strokeWidth="2" />
              <path d="M44 40H316V54H44z" fill="#121212" />
              <path d="M162 35H198V59H162z" fill="#FF4D00" />
              <path d="M84 88H220M84 101H184" stroke="#121212" strokeOpacity=".2" strokeWidth="4" />
              <path d="M84 194V126H276" fill="none" stroke="#121212" strokeOpacity=".18" strokeWidth="2" />
              <path d="M84 182C112 168 126 146 152 156S188 173 208 143 242 139 276 116" fill="none" stroke="#FF4D00" strokeWidth="5" />
              <circle cx="208" cy="143" r="5" fill="#121212" />
              <circle cx="276" cy="116" r="6" fill="#FF4D00" />
              <path d="M84 212H276" stroke="#121212" strokeOpacity=".15" strokeWidth="2" strokeDasharray="4 5" />
            </svg>
          </div>
          <div className="flex flex-col items-start justify-center p-7 sm:p-10">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan">
              Your print queue is clear
            </p>
            <h2 className="max-w-md font-display text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-4xl">
              Your next big idea starts here.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/65">
              Place your first order and it will appear here with its payment and print status.
            </p>
            <Link href="/order/new" className="btn-primary mt-6">
              Start your first poster <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      )}

      {orders && orders.length > 0 && (
        <div className="overflow-x-auto border border-ink/15 bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Customer
                </th>
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
                  Delivery destination
                </th>
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Delivery method
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
                <th className="text-left font-mono text-[11px] uppercase tracking-wider px-4 py-3">
                  Cancellation
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{order.customer_name || "—"}</td>
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
                  <td className="px-4 py-3 whitespace-normal">
                    {order.conference || formatDeliveryAddress(order) || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex border border-ink/15 bg-paper/60 px-2 py-1 text-xs font-medium">
                      {order.conference
                        ? "Conference Delivery"
                        : order.delivery_method === "shipped"
                          ? "Shipped"
                          : "Local Delivery"}
                    </span>
                    {order.tracking_number && (
                      <p className="mt-1 text-xs text-ink/60">
                        Tracking: {order.tracking_number}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.status === "ready" && order.conference
                      ? "Ready for conference delivery"
                      : STATUS_LABEL[order.status] ?? order.status}
                  </td>
                  <td className="px-4 py-3">
                    {order.price_cents != null
                      ? formatCAD(order.price_cents + (order.shipping_cost_cents ?? 0))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {!["cancelled", "completed"].includes(order.status) && (
                      <CancellationRequestButton
                        orderId={order.id}
                        pending={pendingOrderIds.has(order.id)}
                      />
                    )}
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
