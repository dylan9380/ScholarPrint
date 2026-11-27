"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthConfirmationRedirect } from "@/lib/auth-redirect";

export default function AuthModal({ onClose, onSignedIn }) {
  const supabase = createClient();
  const titleId = useId();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: getAuthConfirmationRedirect(
            `${window.location.pathname}${window.location.search}`,
            window.location.origin
          ),
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setConfirmEmail(email);
        setLoading(false);
        return;
      }

      onSignedIn();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    onSignedIn();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close sign in"
        className="absolute inset-0 bg-ink/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md bg-paper border border-ink/15 rounded-sm shadow-xl p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold">
              {confirmEmail ? "Check your email" : mode === "login" ? "Sign in to continue" : "Create an account"}
            </h2>
            <p className="text-sm text-ink/60 mt-1">
              {confirmEmail
                ? `A confirmation link was sent to ${confirmEmail}. Confirm your account, then sign in to pay.`
                : "Sign in before checkout so we can attach this poster to your orders."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:text-ink text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {confirmEmail ? (
          <button type="button" onClick={() => { setConfirmEmail(""); setMode("login"); }} className="btn-primary w-full justify-center">
            Back to sign in
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-name" className="field-label">Full name</label>
                <input
                  id="auth-name"
                  className="field-input"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="field-label">Email</label>
              <input
                id="auth-email"
                type="email"
                className="field-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus={mode === "login"}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="field-label">Password</label>
              <input
                id="auth-password"
                type="password"
                className="field-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "signup" ? 6 : undefined}
                required
              />
            </div>
            {error && <p className="text-proofred text-sm" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
            <p className="text-sm text-ink/60">
              {mode === "login" ? (
                <>
                  No account yet?{" "}
                  <button type="button" className="text-cyan underline" onClick={() => { setMode("signup"); setError(""); }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="text-cyan underline" onClick={() => { setMode("login"); setError(""); }}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
