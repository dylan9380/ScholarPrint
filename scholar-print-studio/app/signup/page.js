"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAuthConfirmationRedirect } from "@/lib/auth-redirect";

export default function SignUpPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: getAuthConfirmationRedirect("/dashboard", window.location.origin),
      },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold mb-3">Check your email</h1>
        <p className="text-ink/70">
          Your Scholar Print Studio account confirmation link was requested for {email}. Check
          your inbox for the confirmation email, then use its link to confirm your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <h1 className="font-display text-2xl font-semibold mb-2">Create an account</h1>
      <p className="text-ink/60 mb-8 text-sm">
        You'll use this to upload posters and track your orders.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label">Full name</label>
          <input
            className="field-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <p className="text-proofred text-sm">{error}</p>}
        <button type="submit" disabled={status === "loading"} className="btn-primary w-full justify-center">
          {status === "loading" ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-ink/60 mt-6">
        Already have an account? <Link href="/login" className="text-cyan underline">Log in</Link>
      </p>
    </div>
  );
}
