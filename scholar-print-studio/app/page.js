import Link from "next/link";
import OrderForm from "./order-form";

export default function HomePage() {
  return (
    <div>
      <section className="bg-ink text-paper px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-kraftsoft mb-4">
            Large-format printing, done in-house
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-5">
            Conference posters, printed right, before your flight.
          </h1>
          <p className="text-paper/80 max-w-xl mx-auto mb-8">
            Order a standard 3 ft × 4 ft matte poster for $70, or use promo code SCHOLAR40 for $40.
            Upload a PDF or PPTX and preview it before submitting.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="#order" className="btn-primary bg-cyanbright text-ink hover:bg-cyanbright/80">
              Order a poster
            </a>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 border border-paper bg-paper text-ink px-5 py-3 rounded-sm font-display font-semibold text-sm hover:bg-cyanbright hover:border-cyanbright transition-colors"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-mono text-xs text-kraft mb-2">01</div>
          <h3 className="font-display font-semibold mb-1">Upload and preview</h3>
          <p className="text-ink/70">Attach your PDF or PPTX and check its preview before ordering.</p>
        </div>
        <div>
          <div className="font-mono text-xs text-kraft mb-2">02</div>
          <h3 className="font-display font-semibold mb-1">One standard poster</h3>
          <p className="text-ink/70">3 ft × 4 ft on matte paper. $70 standard price, or $40 with SCHOLAR40.</p>
        </div>
        <div>
          <div className="font-mono text-xs text-kraft mb-2">03</div>
          <h3 className="font-display font-semibold mb-1">Submit and track</h3>
          <p className="text-ink/70">Get an on-screen confirmation and track your order from your dashboard.</p>
        </div>
      </section>

      <section id="order" className="scroll-mt-8 bg-white/70 border-y border-ink/10">
        <div className="max-w-xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan mb-3">Start an order</p>
          <h2 className="font-display text-3xl font-semibold mb-2">Your poster, made simple.</h2>
          <p className="text-ink/60 mb-8 text-sm">
            Sign in or create an account to submit an order.
          </p>
          <OrderForm />
        </div>
      </section>
    </div>
  );
}
