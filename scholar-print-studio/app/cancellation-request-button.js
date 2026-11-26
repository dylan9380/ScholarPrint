"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancellationRequestButton({ orderId, pending = false }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(pending);

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/cancellation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, message: message.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not send your cancellation request.");
        return;
      }

      setSent(true);
      setOpen(false);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send your cancellation request.");
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return <p className="text-xs text-ink/60">Cancellation request sent for review.</p>;
  }

  return (
    <div className="min-w-52">
      <button
        type="button"
        className="text-sm font-semibold text-proofred underline underline-offset-2"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setError("");
        }}
      >
        Request cancellation
      </button>
      {open && (
        <form onSubmit={submitRequest} className="mt-3 space-y-2">
          <label htmlFor={`cancel-reason-${orderId}`} className="field-label">
            Reason for cancellation
          </label>
          <textarea
            id={`cancel-reason-${orderId}`}
            className="field-input min-h-24"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
            required
          />
          {error && <p className="text-xs text-proofred" role="alert">{error}</p>}
          <p className="text-xs text-ink/60">
            Your order will not be cancelled automatically. We’ll review your request.
          </p>
          <button type="submit" className="btn-primary px-3 py-2 text-xs" disabled={saving}>
            {saving ? "Sending…" : "Send request"}
          </button>
        </form>
      )}
    </div>
  );
}
