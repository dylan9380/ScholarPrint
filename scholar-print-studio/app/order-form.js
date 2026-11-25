"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PROMO_CONFERENCE,
  PROMO_UNIT_PRICE_CENTS,
  STANDARD_UNIT_PRICE_CENTS,
  isPromoCode,
} from "@/lib/checkout-pricing";
import { isValidStripeCheckoutUrl } from "@/lib/stripe/checkout-url";
import AuthModal from "./auth-modal";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function OrderForm() {
  const supabase = createClient();
  const pptxPreviewRef = useRef(null);
  const [customerName, setCustomerName] = useState("");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pptxPreviewStatus, setPptxPreviewStatus] = useState("idle");
  const [promoCode, setPromoCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(null);
  const fileExtension = file?.name.split(".").pop()?.toLowerCase();
  const promoApplied = isPromoCode(promoCode);
  const priceQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const baseTotalCents = STANDARD_UNIT_PRICE_CENTS * priceQuantity;
  const totalCents = (promoApplied ? PROMO_UNIT_PRICE_CENTS : STANDARD_UNIT_PRICE_CENTS) * priceQuantity;

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (cancelled) return;
      if (userError && userError.name !== "AuthSessionMissingError") {
        setError(userError.message);
        return;
      }

      const user = data.user;
      setIsSignedIn(Boolean(user));
      const fullName = user?.user_metadata?.full_name;
      if (typeof fullName === "string" && fullName.trim()) {
        setCustomerName((currentName) => currentName || fullName.trim());
      }
    }).catch((userError) => {
      if (!cancelled) {
        setError(userError instanceof Error ? userError.message : "Could not load your account details.");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setIsSignedIn(Boolean(user));
      const fullName = user?.user_metadata?.full_name;
      if (typeof fullName === "string" && fullName.trim()) {
        setCustomerName((currentName) => currentName || fullName.trim());
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!file || fileExtension !== "pdf") {
      setPdfPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, fileExtension]);

  useEffect(() => {
    if (!file || fileExtension !== "pptx" || !pptxPreviewRef.current) {
      setPptxPreviewStatus("idle");
      return;
    }

    let cancelled = false;
    let previewer;
    const canvas = pptxPreviewRef.current;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setPptxPreviewStatus("loading");

    async function renderPreview() {
      try {
        const { PptxRenderer } = await import("pptx-browser");
        if (cancelled) return;
        previewer = new PptxRenderer();
        await previewer.load(file);
        if (cancelled) return;
        await previewer.renderSlide(0, canvas, 640);
        if (!cancelled) setPptxPreviewStatus("ready");
      } catch {
        if (!cancelled) setPptxPreviewStatus("error");
      }
    }

    renderPreview();
    return () => {
      cancelled = true;
      previewer?.destroy();
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [file, fileExtension]);

  async function startCheckout() {
    const requiredField = !customerName.trim()
      ? document.getElementById("customer-name")
      : !title.trim()
        ? document.getElementById("poster-title")
        : !file || file.size === 0
          ? document.getElementById("poster-file")
          : null;

    if (requiredField) {
      setError(
        requiredField.id === "customer-name"
          ? "Enter your full name before checkout."
          : requiredField.id === "poster-title"
            ? "Enter a poster title before checkout."
            : "Upload the print-ready PDF or PPTX file before checkout."
      );
      requiredField.focus();
      return;
    }

    setStatus("saving");

    const formData = new FormData();
    formData.set("customerName", customerName.trim());
    formData.set("title", title.trim());
    formData.set("quantity", String(quantity));
    formData.set("notes", notes);
    formData.set("promoCode", promoCode.trim());
    if (file) formData.set("file", file);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (response.status === 401) {
        setStatus("idle");
        setAuthOpen(true);
        return;
      }

      if (!response.ok) {
        setError(result.error || "Could not start checkout.");
        setStatus("idle");
        return;
      }

      if (!isValidStripeCheckoutUrl(result.url)) {
        setError(
          result.url
            ? "The payment link is invalid. Please try again or contact support."
            : "Checkout did not return a payment link. Please try again."
        );
        setStatus("idle");
        return;
      }

      window.location.assign(new URL(result.url).href);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start checkout.");
      setStatus("idle");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && userError.name !== "AuthSessionMissingError") {
      setError(userError.message);
      return;
    }

    if (!user) {
      setAuthOpen(true);
      return;
    }

    await startCheckout();
  }

  return (
    <>
    {isSignedIn === false && (
      <p className="mb-6 text-sm text-ink/60">
        Sign in or create an account to submit an order.
      </p>
    )}
    {isSignedIn && (
      <p className="mb-6 text-sm text-ink/60">
        Signed in as <span className="font-semibold text-ink">{customerName || "you"}</span>.
      </p>
    )}
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="customer-name" className="field-label">Your full name</label>
        <input
          id="customer-name"
          className="field-input"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          required
        />
      </div>

      <div>
        <label htmlFor="poster-title" className="field-label">Poster title</label>
        <input
          id="poster-title"
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. CPA 2026 — Attention and Memory"
          maxLength={200}
          required
        />
      </div>

      <div className="border border-ink/10 bg-paper/60 p-4 rounded-sm">
        <p className="field-label mb-2">Poster details</p>
        <p className="font-display font-semibold">Standard 3 ft × 4 ft · Matte paper</p>
        <p className="text-sm text-ink/60 mt-1">One paper type, printed on matte stock.</p>
      </div>

      <div>
        <label htmlFor="poster-copies" className="field-label">Copies</label>
        <input
          id="poster-copies"
          type="number"
          min={1}
          max={20}
          className="field-input max-w-32"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
      </div>

      <div className="border border-ink/10 p-4 rounded-sm">
        <label htmlFor="promo-code" className="field-label">Discount code</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="promo-code"
            className="field-input"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter discount code"
            autoCapitalize="characters"
          />
        </div>
        <p className="text-xs text-ink/60 mt-2">
          {promoApplied
            ? `Discount applied. Delivered directly to ${PROMO_CONFERENCE}, with no transport or delivery fee.`
            : "Have a discount code? Enter it here."}
        </p>
        <div className="mt-4 border-t border-ink/15 pt-4" aria-live="polite">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-ink/60">Price per poster</span>
            <span className="font-display font-semibold">
              {promoApplied && (
                <del className="mr-2 font-normal text-ink/50">{formatPrice(STANDARD_UNIT_PRICE_CENTS)}</del>
              )}
              {formatPrice(promoApplied ? PROMO_UNIT_PRICE_CENTS : STANDARD_UNIT_PRICE_CENTS)}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink/60">
              Order total <span className="font-mono text-xs">× {priceQuantity}</span>
            </span>
            <span className="font-display text-xl font-bold">
              {promoApplied && <del className="mr-2 text-sm font-normal text-ink/50">{formatPrice(baseTotalCents)}</del>}
              {formatPrice(totalCents)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="poster-file" className="field-label">Poster file (PDF or PPTX)</label>
        <input
          id="poster-file"
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="field-input"
          required
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
          }}
        />
        {file && (
          <div className="mt-4 border border-ink/15 rounded-sm overflow-hidden">
            <div className="bg-paper/70 px-4 py-2 text-sm font-medium">{file.name}</div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink/60 px-3 pt-3">
              Academic poster preview · 3:4
            </p>
            {fileExtension === "pdf" && pdfPreviewUrl && (
              <div className="aspect-[3/4] w-full max-w-[360px] mx-auto bg-paper p-2">
                <iframe
                  title={`3:4 academic poster preview of ${file.name}`}
                  src={pdfPreviewUrl}
                  className="w-full h-full bg-white"
                />
              </div>
            )}
            {fileExtension === "pptx" && (
              <>
                {pptxPreviewStatus === "loading" && (
                  <p className="p-4 text-sm text-ink/60">Preparing presentation preview…</p>
                )}
                {pptxPreviewStatus === "error" && (
                  <p className="p-4 text-sm text-proofred">
                    This presentation could not be previewed. You can still submit the file.
                  </p>
                )}
                <div className="aspect-[3/4] w-full max-w-[360px] mx-auto flex items-center justify-center overflow-hidden bg-paper p-2">
                  <canvas ref={pptxPreviewRef} className="block max-w-full max-h-full object-contain bg-white" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="order-notes" className="field-label">Notes</label>
        <textarea
          id="order-notes"
          className="field-input min-h-[90px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Deadline, preferred delivery details, colour matching, or other print notes."
        />
      </div>

      <p className="text-sm text-ink/60">
        Need technical help? Call{" "}
        <a className="font-semibold text-ink underline" href="tel:2262600691">
          226-260-0691
        </a>
        .
      </p>

      {error && <p className="text-proofred text-sm" role="alert">{error}</p>}

      <button type="submit" disabled={status === "saving"} className="btn-primary w-full justify-center">
        {status === "saving" ? "Preparing secure checkout…" : "Continue to payment"}
      </button>

    </form>
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSignedIn={() => {
            setAuthOpen(false);
            startCheckout();
          }}
        />
      )}
    </>
  );
}
