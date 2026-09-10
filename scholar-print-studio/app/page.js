import Link from "next/link";

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
            Upload your file, choose your size and finish, and track your order right up to
            pickup — printed on our own HP DesignJet T650.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/order/new" className="btn-primary bg-cyanbright text-ink hover:bg-cyanbright/80">
              Order a poster
            </Link>
            <Link href="/signup" className="btn-ghost border-paper/40 text-paper hover:text-cyanbright hover:border-cyanbright">
              Create an account
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-mono text-xs text-kraft mb-2">01</div>
          <h3 className="font-display font-semibold mb-1">Sign up, upload</h3>
          <p className="text-ink/70">Create an account and attach your PDF or slide file.</p>
        </div>
        <div>
          <div className="font-mono text-xs text-kraft mb-2">02</div>
          <h3 className="font-display font-semibold mb-1">Choose size &amp; finish</h3>
          <p className="text-ink/70">Any size up to 36" wide, in matte, satin, gloss, or fabric.</p>
        </div>
        <div>
          <div className="font-mono text-xs text-kraft mb-2">03</div>
          <h3 className="font-display font-semibold mb-1">Track &amp; pick up</h3>
          <p className="text-ink/70">Watch your order move from submitted to ready, right from your dashboard.</p>
        </div>
      </section>
    </div>
  );
}
