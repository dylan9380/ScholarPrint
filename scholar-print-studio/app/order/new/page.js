"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MATERIALS = [
  { value: "matte", label: "Matte paper — $9/sq ft" },
  { value: "satin", label: "Satin paper — $11/sq ft" },
  { value: "gloss", label: "Gloss paper — $12/sq ft" },
  { value: "fabric", label: "Fabric (foldable) — $15/sq ft" },
];

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [width, setWidth] = useState(36);
  const [height, setHeight] = useState(48);
  const [material, setMaterial] = useState("matte");
  const [quantity, setQuantity] = useState(1);
  const [rush, setRush] = useState(false);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setStatus("saving");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        title: title || "Untitled poster",
        width_in: width,
        height_in: height,
        material,
        quantity,
        rush,
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
        setError(`Order saved, but the file upload failed: ${uploadError.message}`);
        setStatus("idle");
        return;
      }

      await supabase.from("order_files").insert({
        order_id: order.id,
        storage_path: path,
        filename: file.name,
      });
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-display text-2xl font-semibold mb-2">Order a poster</h1>
      <p className="text-ink/60 mb-8 text-sm">
        Fill in your poster's specs and, if it's ready, attach the file now — you can also send it
        later by replying to your confirmation email.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label">Poster title</label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CPA 2026 — Attention and Memory"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Width (in)</label>
            <input
              type="number"
              min={6}
              max={36}
              className="field-input"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="field-label">Height (in)</label>
            <input
              type="number"
              min={6}
              max={90}
              className="field-input"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="field-label">Material</label>
          <select
            className="field-input"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            {MATERIALS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="field-label">Copies</label>
            <input
              type="number"
              min={1}
              max={20}
              className="field-input"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 border border-ink/15 rounded-sm px-3 py-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />
            Rush (next-day, +30%)
          </label>
        </div>

        <div>
          <label className="field-label">Poster file (PDF or PPTX)</label>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx"
            className="field-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="field-label">Notes</label>
          <textarea
            className="field-input min-h-[90px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Deadline, pickup vs. shipping, colour matching, anything else."
          />
        </div>

        {error && <p className="text-proofred text-sm">{error}</p>}

        <button type="submit" disabled={status === "saving"} className="btn-primary w-full justify-center">
          {status === "saving" ? "Submitting…" : "Submit order"}
        </button>
      </form>
    </div>
  );
}
