"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STANDARD_PRICE_CENTS = 7000;
const PROMO_PRICE_CENTS = 4000;
const PROMO_CODE = "SCHOLAR40";
const POSTER_WIDTH_IN = 36;
const POSTER_HEIGHT_IN = 48;

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function OrderForm() {
  const supabase = createClient();
  const router = useRouter();
  const pptxPreviewRef = useRef(null);
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pptxPreviewStatus, setPptxPreviewStatus] = useState("idle");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const unitPriceCents = promoApplied ? PROMO_PRICE_CENTS : STANDARD_PRICE_CENTS;
  const totalPriceCents = unitPriceCents * quantity;
  const fileExtension = file?.name.split(".").pop()?.toLowerCase();

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

  function applyPromoCode() {
    if (promoCode.trim().toUpperCase() === PROMO_CODE) {
      setPromoApplied(true);
      setPromoMessage("Promo applied — your poster is $40 each.");
    } else {
      setPromoApplied(false);
      setPromoMessage("That promo code isn’t valid.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setUploadWarning("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setStatus("saving");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        title: title.trim() || "Standard 3 ft × 4 ft poster",
        width_in: POSTER_WIDTH_IN,
        height_in: POSTER_HEIGHT_IN,
        material: "matte",
        quantity,
        rush: false,
        price_cents: totalPriceCents,
        notes,
      })
      .select()
      .single();

    if (orderError) {
      setError(orderError.message);
      setStatus("idle");
      return;
    }

    if (file) {
      const path = `${user.id}/${order.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("poster-files")
        .upload(path, file);

      if (uploadError) {
        setUploadWarning(`Your order was submitted, but the file upload failed: ${uploadError.message}`);
      } else {
        const { error: fileRecordError } = await supabase.from("order_files").insert({
          order_id: order.id,
          storage_path: path,
          filename: file.name,
        });

        if (fileRecordError) {
          setUploadWarning(
            `Your order was submitted, but its file could not be attached: ${fileRecordError.message}`
          );
        }
      }
    }

    setSubmittedOrder(order);
    setStatus("submitted");
    router.refresh();
  }

  if (submittedOrder) {
    return (
      <section className="border border-ink/15 bg-white p-6 sm:p-8 rounded-sm" aria-live="polite">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan mb-3">
          Order confirmation
        </p>
        <h2 className="font-display text-2xl font-semibold mb-2">Your order has been submitted.</h2>
        <p className="text-ink/70 mb-4">
          We’ve received {submittedOrder.title} for {formatPrice(submittedOrder.price_cents)}.
        </p>
        <p className="text-sm text-ink/60 mb-5">
          Confirmation number: <span className="font-mono">{submittedOrder.id}</span>
        </p>
        {uploadWarning && <p className="text-proofred text-sm mb-5">{uploadWarning}</p>}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-primary"
        >
          View my orders
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="poster-title" className="field-label">Poster title</label>
        <input
          id="poster-title"
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. CPA 2026 — Attention and Memory"
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
        <label htmlFor="promo-code" className="field-label">Promo code</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="promo-code"
            className="field-input"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setPromoApplied(false);
              setPromoMessage("");
            }}
            placeholder="Enter promo code"
            autoCapitalize="characters"
          />
          <button type="button" className="btn-ghost justify-center" onClick={applyPromoCode}>
            Apply
          </button>
        </div>
        <p className="text-xs text-ink/60 mt-2">
          Use <span className="font-mono">{PROMO_CODE}</span> for the $40 promotional price.
        </p>
        {promoMessage && (
          <p className={`text-sm mt-2 ${promoApplied ? "text-cyan" : "text-proofred"}`} role="status">
            {promoMessage}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between border-t border-ink/10 pt-4">
        <div>
          <p className="field-label">Total</p>
          {promoApplied && (
            <p className="text-sm text-ink/50 line-through">{formatPrice(STANDARD_PRICE_CENTS * quantity)}</p>
          )}
          <p className="font-display text-2xl font-semibold">{formatPrice(totalPriceCents)}</p>
        </div>
        <p className="text-sm text-ink/60">
          {formatPrice(unitPriceCents)} per poster
        </p>
      </div>

      <div>
        <label htmlFor="poster-file" className="field-label">Poster file (PDF or PPTX)</label>
        <input
          id="poster-file"
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="field-input"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
          }}
        />
        {file && (
          <div className="mt-4 border border-ink/15 rounded-sm overflow-hidden">
            <div className="bg-paper/70 px-4 py-2 text-sm font-medium">{file.name}</div>
            {fileExtension === "pdf" && pdfPreviewUrl && (
              <iframe
                title={`Preview of ${file.name}`}
                src={pdfPreviewUrl}
                className="w-full h-[480px] bg-white"
              />
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
                <div className="max-h-[480px] overflow-auto bg-white">
                  <canvas ref={pptxPreviewRef} className="block w-full h-auto" />
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
          placeholder="Deadline, pickup vs. shipping, colour matching, anything else."
        />
      </div>

      {error && <p className="text-proofred text-sm" role="alert">{error}</p>}

      <button type="submit" disabled={status === "saving"} className="btn-primary w-full justify-center">
        {status === "saving" ? "Submitting…" : `Submit order · ${formatPrice(totalPriceCents)}`}
      </button>
    </form>
  );
}
