import Link from "next/link";

export default function OrderCancelledPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-20">
      <h1 className="font-display text-2xl font-semibold mb-3">Checkout cancelled</h1>
      <p className="text-ink/70 mb-8">Your payment was not completed. You have not been charged.</p>
      <Link href="/order/new" className="btn-primary">Return to your order</Link>
    </div>
  );
}
