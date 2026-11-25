import OrderForm from "./order-form";
import LandingHero from "./hero";
import PreviousOrders from "./previous-orders";

export default function HomePage() {
  return (
    <div>
      <LandingHero />

      <section className="border-b border-ink/10 bg-white/70 px-6 py-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-4">
          Trusted by students from
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="border border-ink/10 bg-white px-4 py-3 font-display font-semibold text-sm text-ink/80">
            University of Waterloo
          </span>
          <span className="border border-ink/10 bg-white px-4 py-3 font-display font-semibold text-sm text-ink/80">
            University of Windsor
          </span>
          <span className="border border-ink/10 bg-white px-4 py-3 font-display font-semibold text-sm text-ink/80">
            Laurier University
          </span>
          <span className="border border-ink/10 bg-white px-4 py-3 font-display font-semibold text-sm text-ink/80">
            University of Guelph
          </span>
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
          <p className="text-ink/70">Standard 3 ft × 4 ft matte paper, sized for academic posters.</p>
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
          <PreviousOrders />
          <OrderForm />
        </div>
      </section>
    </div>
  );
}
