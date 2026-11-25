"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Lenis from "lenis";

export default function LandingHero() {
  const sectionRef = useRef(null);
  const posterRef = useRef(null);
  const posterStageRef = useRef(null);
  const cursorRef = useRef(null);
  const [loupeActive, setLoupeActive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const poster = posterRef.current;
    const cursor = cursorRef.current;
    if (!section || !poster || !cursor) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(poster, { scaleY: 1 });
      return;
    }

    const lenis = new Lenis({ autoRaf: false });
    const updateLenis = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    let pointerHandler;
    const context = gsap.context(() => {
      const moveX = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
      const moveY = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });

      gsap.set(cursor, { x: -100, y: -100, autoAlpha: 0 });
      gsap.set(poster, { scaleY: 0.025, transformOrigin: "top center" });

      gsap.timeline({ delay: 0.2 }).to(poster, {
        scaleY: 1,
        duration: 1.5,
        ease: "power3.inOut",
      });

      pointerHandler = function followPointer(event) {
        let x = event.clientX;
        let y = event.clientY;
        const bounds = posterStageRef.current?.getBoundingClientRect();
        if (
          bounds &&
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        ) {
          x += (bounds.left + bounds.width / 2 - x) * 0.08;
          y += (bounds.top + bounds.height / 2 - y) * 0.08;
        }

        moveX(x);
        moveY(y);
        gsap.to(cursor, { autoAlpha: 1, duration: 0.15, overwrite: true });
      };
    }, section);
    window.addEventListener("pointermove", pointerHandler);

    return () => {
      window.removeEventListener("pointermove", pointerHandler);
      context.revert();
      gsap.killTweensOf(cursor);
      gsap.ticker.remove(updateLenis);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-shell relative isolate overflow-hidden border-b border-[#121212]/15 bg-[#F7F6F2] text-[#121212]"
    >
      <div className="hero-dot-grid absolute inset-0" aria-hidden="true" />
      <div className="hero-grain absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-68px)] max-w-[1440px] flex-col px-5 pb-7 pt-6 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#121212]/20 pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-xs">
          <span>600 DPI // 36&quot; ROLL // BUILT FOR YOUR PRESENTATION</span>
          <span className="ml-auto inline-flex items-center gap-2 text-[#FF4D00]">
            <svg
              viewBox="0 0 90 45"
              aria-hidden="true"
              className="h-5 w-10"
              fill="currentColor"
            >
              <path d="M4 3h15v39H4zM71 3h15v39H71z" />
              <path d="m45 3 4.1 9.5 6.7-5.8-1.6 10.1 10.4-1.1-6.1 8 9.2 4.1-10.2 3.2 4.3 8.8-10-3.1-1.7 8.3-4.1-5.1-4.1 5.1-1.7-8.3-10 3.1 4.3-8.8-10.2-3.2 9.2-4.1-6.1-8 10.4 1.1-1.6-10.1 6.7 5.8z" />
            </svg>
            <span>Proudly Canadian</span>
          </span>
        </div>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.84fr_1.16fr] lg:gap-10">
          <div className="relative z-20 max-w-2xl">
            <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF4D00]">
              Academic poster printing, on demand
            </p>
            <h1 className="font-display text-[clamp(3.25rem,6.8vw,7.5rem)] font-bold leading-[0.86] tracking-[-0.065em]">
              Quality
              <br />
              posters for
              <br />
              <span className="text-[#FF4D00]">quality research.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-[#121212]/70 sm:text-lg">
              Sharp, large-format conference posters without the print-shop runaround.
              Upload your work, check the proof, and get ready to present.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Link
                href="/order/new"
                className="inline-flex items-center gap-4 border border-[#FF4D00] bg-[#FF4D00] px-5 py-3 font-display text-sm font-bold text-[#121212] transition-colors hover:bg-transparent"
              >
                Start an order <span aria-hidden="true">↗</span>
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#121212]/55">
                PDF + PPTX accepted
              </span>
            </div>
          </div>

          <div
            ref={posterStageRef}
            className="hero-poster-stage relative mx-auto h-[min(68vh,680px)] min-h-[430px] w-full max-w-[760px]"
            onPointerEnter={() => setLoupeActive(true)}
            onPointerLeave={() => setLoupeActive(false)}
          >
            <div className="absolute left-[8%] right-[8%] top-[12%] z-20 h-4 bg-[#121212]">
              <div className="absolute left-1/2 top-1/2 h-7 w-24 -translate-x-1/2 -translate-y-1/2 border-x border-[#F7F6F2]/40 bg-[#FF4D00]" />
            </div>

            <div
              ref={posterRef}
              className="hero-poster-sheet absolute left-[14%] top-[calc(12%+16px)] z-10 h-[77%] w-[72%] border border-[#121212]/25 bg-white p-[5%] shadow-[12px_14px_0_rgba(18,18,18,0.12)]"
            >
              <div className="grid h-full min-h-0 grid-cols-[1.35fr_0.85fr] gap-[5%]">
                <svg
                  viewBox="0 0 340 420"
                  role="img"
                  aria-label="Scientific line figure"
                  className="h-full min-h-0 w-full border border-[#121212]/15 p-[4%]"
                >
                  <path d="M30 20V382H320M30 310H320M30 238H320M30 166H320M30 94H320" fill="none" stroke="#121212" strokeOpacity=".12" strokeWidth="1" />
                  <path d="M30 342C59 327 66 242 99 263S145 294 168 206 205 232 231 151 279 150 320 54V382H30Z" fill="#FF4D00" fillOpacity=".08" />
                  <path d="M30 342C59 327 66 242 99 263S145 294 168 206 205 232 231 151 279 150 320 54" fill="none" stroke="#FF4D00" strokeWidth="6" />
                  <circle cx="168" cy="206" r="7" fill="#121212" />
                  <circle cx="320" cy="54" r="8" fill="#FF4D00" />
                  <path d="M30 382H320" stroke="#121212" strokeWidth="2" />
                </svg>

                <div className="grid min-h-0 grid-rows-2 gap-[7%]">
                  <svg
                    viewBox="0 0 180 180"
                    role="img"
                    aria-label="Scientific bar figure"
                    className="h-full min-h-0 w-full border border-[#121212]/15 p-[5%]"
                  >
                    <path d="M20 24H162M20 62H162M20 100H162M20 138H162M20 158H162" stroke="#121212" strokeOpacity=".12" strokeWidth="1" />
                    <path d="M34 158V104H52V158ZM66 158V69H84V158ZM98 158V91H116V158ZM130 158V42H148V158Z" fill="#121212" />
                    <path d="M130 42H148V158H130Z" fill="#FF4D00" />
                  </svg>
                  <svg
                    viewBox="0 0 180 180"
                    role="img"
                    aria-label="Scientific scatter figure"
                    className="h-full min-h-0 w-full border border-[#121212]/15 p-[5%]"
                  >
                    <path d="M20 20V158H162M20 124H162M20 90H162M20 56H162M56 20V158M92 20V158M128 20V158" fill="none" stroke="#121212" strokeOpacity=".12" strokeWidth="1" />
                    <g fill="#121212">
                      <circle cx="39" cy="119" r="5" /><circle cx="54" cy="96" r="5" />
                      <circle cx="70" cy="108" r="5" /><circle cx="82" cy="72" r="5" />
                      <circle cx="101" cy="83" r="5" /><circle cx="114" cy="54" r="5" />
                      <circle cx="135" cy="64" r="5" />
                    </g>
                    <circle cx="145" cy="36" r="7" fill="#FF4D00" />
                    <path d="M30 132L151 30" stroke="#FF4D00" strokeOpacity=".55" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`hero-cursor${loupeActive ? " is-loupe" : ""}`}
      >
        {loupeActive && (
          <span className="flex flex-col items-center font-mono text-[9px] font-semibold uppercase leading-tight tracking-wide">
            <span>600 DPI</span>
            <span>LOUPE</span>
          </span>
        )}
      </div>
    </section>
  );
}
