"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDeliveryDetails } from "@/lib/delivery";
import {
  PROMO_CONFERENCE,
  PROMO_UNIT_PRICE_CENTS,
  STANDARD_UNIT_PRICE_CENTS,
  isPromoCode,
} from "@/lib/checkout-pricing";
import { formatCAD } from "@/lib/format-currency";
import { isValidStripeCheckoutUrl } from "@/lib/stripe/checkout-url";
import AuthModal from "./auth-modal";
import PrintProofPreview from "./print-proof-preview";

function formatPrice(cents) {
  return formatCAD(cents);
}

export default function OrderForm() {
  const supabase = createClient();
  const [customerName, setCustomerName] = useState("");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "Canada",
  });
  const [file, setFile] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(null);
  const promoApplied = isPromoCode(promoCode);
  const isCanadianAddress = deliveryAddress.country.trim().toUpperCase() === "CANADA";
  const deliveryDetails =
    !promoApplied && isCanadianAddress
      ? getDeliveryDetails(deliveryAddress.postalCode)
      : null;
  const priceQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
  const baseTotalCents = STANDARD_UNIT_PRICE_CENTS * priceQuantity;
  const itemTotalCents =
    (promoApplied ? PROMO_UNIT_PRICE_CENTS : STANDARD_UNIT_PRICE_CENTS) * priceQuantity;
  const shippingCents = promoApplied ? 0 : deliveryDetails?.shippingCents ?? 0;
  const totalCents = itemTotalCents + shippingCents;

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

  async function startCheckout() {
    const requiredAddressFields = [
      { id: "delivery-address-line1", value: deliveryAddress.line1 },
      { id: "delivery-address-city", value: deliveryAddress.city },
      { id: "delivery-address-region", value: deliveryAddress.region },
      { id: "delivery-address-postal-code", value: deliveryAddress.postalCode },
      { id: "delivery-address-country", value: deliveryAddress.country },
    ];
    const missingAddressField = !promoApplied
      ? requiredAddressFields.find((field) => !field.value.trim())
      : null;
    const requiredField =
      (!customerName.trim() && document.getElementById("customer-name")) ||
      (!title.trim() && document.getElementById("poster-title")) ||
      ((!file || file.size === 0) && document.getElementById("poster-file")) ||
      (missingAddressField && document.getElementById(missingAddressField.id));

    if (requiredField) {
      setError(
        requiredField.id === "customer-name"
          ? "Enter your full name before checkout."
          : requiredField.id === "poster-title"
            ? "Enter a poster title before checkout."
            : requiredField.id === "poster-file"
              ? "Upload the print-ready PDF or PPTX file before checkout."
              : "Complete the delivery address before checkout."
      );
      requiredField.focus();
      return;
    }

    if (!promoApplied && !isCanadianAddress) {
      setError("Delivery is currently available to Canadian addresses only.");
      document.getElementById("delivery-address-country").focus();
      return;
    }

    if (!promoApplied && !deliveryDetails) {
      setError("Enter a valid Canadian postal code to calculate delivery.");
      document.getElementById("delivery-address-postal-code").focus();
      return;
    }

    setStatus("saving");

    const formData = new FormData();
    formData.set("customerName", customerName.trim());
    formData.set("title", title.trim());
    formData.set("quantity", String(quantity));
    formData.set("notes", notes);
    formData.set("promoCode", promoCode.trim());
    if (!promoApplied) {
      formData.set("deliveryAddressLine1", deliveryAddress.line1.trim());
      formData.set("deliveryAddressLine2", deliveryAddress.line2.trim());
      formData.set("deliveryCity", deliveryAddress.city.trim());
      formData.set("deliveryRegion", deliveryAddress.region.trim());
      formData.set("deliveryPostalCode", deliveryAddress.postalCode.trim());
      formData.set("deliveryCountry", deliveryAddress.country.trim());
    }
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
            ? `Discount applied. Delivery is fixed to ${PROMO_CONFERENCE}; no address or delivery fee is needed.`
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
            <span className="text-sm text-ink/60">Delivery / Shipping</span>
            <span className="font-display font-semibold">
              {promoApplied || deliveryDetails?.shippingCents === 0
                ? "Free"
                : deliveryDetails
                  ? formatPrice(deliveryDetails.shippingCents)
                  : "Enter postal code"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink/60">
              Order total <span className="font-mono text-xs">× {priceQuantity}</span>
            </span>
            <span className="font-display text-xl font-bold">
              {promoApplied && <del className="mr-2 text-sm font-normal text-ink/50">{formatPrice(baseTotalCents)}</del>}
              {promoApplied || deliveryDetails ? formatPrice(totalCents) : "—"}
            </span>
          </div>
          {!promoApplied && !deliveryDetails && (
            <p className="mt-2 text-right text-xs text-ink/50">
              Enter a valid Canadian postal code to calculate delivery and the final total.
            </p>
          )}
        </div>
      </div>

      {promoApplied ? (
        <div className="border border-ink/10 bg-paper/60 p-4 rounded-sm">
          <p className="field-label mb-1">Delivery destination</p>
          <p className="font-display font-semibold">{PROMO_CONFERENCE}</p>
          <p className="text-sm text-ink/60 mt-1">This destination is fixed for promo orders.</p>
        </div>
      ) : (
        <fieldset className="border border-ink/10 p-4 rounded-sm">
          <legend className="field-label px-1">Delivery address</legend>
          <p className="mb-4 text-sm text-ink/60">
            Delivery pricing is based on your Canadian postal code.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="delivery-address-line1" className="field-label">Street address</label>
              <input
                id="delivery-address-line1"
                className="field-input"
                value={deliveryAddress.line1}
                onChange={(event) => setDeliveryAddress({ ...deliveryAddress, line1: event.target.value })}
                autoComplete="address-line1"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label htmlFor="delivery-address-line2" className="field-label">
                Apartment, unit, or suite <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="delivery-address-line2"
                className="field-input"
                value={deliveryAddress.line2}
                onChange={(event) => setDeliveryAddress({ ...deliveryAddress, line2: event.target.value })}
                autoComplete="address-line2"
                maxLength={100}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="delivery-address-city" className="field-label">City</label>
                <input
                  id="delivery-address-city"
                  className="field-input"
                  value={deliveryAddress.city}
                  onChange={(event) => setDeliveryAddress({ ...deliveryAddress, city: event.target.value })}
                  autoComplete="address-level2"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="delivery-address-region" className="field-label">Province / state</label>
                <input
                  id="delivery-address-region"
                  className="field-input"
                  value={deliveryAddress.region}
                  onChange={(event) => setDeliveryAddress({ ...deliveryAddress, region: event.target.value })}
                  autoComplete="address-level1"
                  maxLength={100}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="delivery-address-postal-code" className="field-label">Postal / ZIP code</label>
                <input
                  id="delivery-address-postal-code"
                  className="field-input"
                  value={deliveryAddress.postalCode}
                  onChange={(event) => setDeliveryAddress({ ...deliveryAddress, postalCode: event.target.value })}
                  autoComplete="postal-code"
                  maxLength={20}
                  required
                />
                <p
                  className={`mt-2 border px-3 py-2 text-xs ${
                    deliveryDetails?.isLocal
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : deliveryDetails
                        ? "border-cyan/30 bg-cyan/5 text-ink"
                        : "border-ink/10 bg-paper/60 text-ink/60"
                  }`}
                  aria-live="polite"
                  role="status"
                >
                  {deliveryDetails
                    ? deliveryDetails.label
                    : "Free delivery in GTA & Kitchener-Waterloo · $20 flat-rate tracked shipping across Canada"}
                </p>
                {deliveryDetails && (
                  <p className="mt-1 text-[11px] text-ink/50">
                    {deliveryDetails.estimatedWindow}
                  </p>
                )}
                {deliveryDetails && (
                  <p className="mt-1 text-[11px] text-ink/50">
                    Use this same postal code in Stripe checkout so the delivery rate stays accurate.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="delivery-address-country" className="field-label">Country</label>
                <input
                  id="delivery-address-country"
                  className="field-input"
                  value={deliveryAddress.country}
                  onChange={(event) => setDeliveryAddress({ ...deliveryAddress, country: event.target.value })}
                  autoComplete="country-name"
                  maxLength={100}
                  required
                />
              </div>
            </div>
          </div>
        </fieldset>
      )}

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
            <div className="p-3 sm:p-4">
              <PrintProofPreview file={file} />
            </div>
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
