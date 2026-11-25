"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./auth-modal";

export default function OrderForm() {
  const supabase = createClient();
  const pptxPreviewRef = useRef(null);
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

  async function startCheckout() {
    setStatus("saving");

    const formData = new FormData();
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

      if (!result.url) {
        setError("Checkout did not return a payment link. Please try again.");
        setStatus("idle");
        return;
      }

      window.location.assign(result.url);
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

    if (userError) {
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
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            autoCapitalize="characters"
          />
        </div>
        <p className="text-xs text-ink/60 mt-2">Your total will be shown at secure checkout.</p>
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
          placeholder="Deadline, pickup vs. shipping, colour matching, anything else."
        />
      </div>

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
