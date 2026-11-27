import OrderForm from "./order-form";
import LandingHero from "./hero";

export const metadata = {
  title: "Academic & Conference Poster Printing",
  description:
    "Order 36 × 48 in matte academic and conference posters online. Upload a PDF or PPTX, preview your print, and choose local or tracked Canadian delivery.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    siteName: "Scholar Print Studio",
    title: "Academic & Conference Poster Printing",
    description:
      "Order 36 × 48 in matte academic and conference posters online. Upload a PDF or PPTX, preview your print, and choose local or tracked Canadian delivery.",
  },
};

export default function HomePage() {
  const siteUrl = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://scholarprint.ca"
  ).origin;
  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Scholar Print Studio",
    url: siteUrl,
    logo: new URL("/scholar-print-mark.svg", siteUrl).toString(),
  }).replace(/</g, "\\u003c");

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: organizationSchema }}
      />
      <LandingHero />

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
          <OrderForm />
        </div>
      </section>
    </div>
  );
}
