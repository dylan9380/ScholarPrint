export function isValidStripeCheckoutUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "checkout.stripe.com" &&
      url.port === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}
