import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getDeliveryDetails } from "@/lib/delivery";
import { isValidStripeCheckoutUrl } from "@/lib/stripe/checkout-url";
import {
  PROMO_CONFERENCE,
  PROMO_CODE,
  PROMO_UNIT_PRICE_CENTS,
  STANDARD_UNIT_PRICE_CENTS,
  isPromoCode,
} from "@/lib/checkout-pricing";

const POSTER_WIDTH_IN = 36;
const POSTER_HEIGHT_IN = 48;

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function parseDeliveryAddress(formData, promoOrder) {
  if (promoOrder) return { address: null };

  const fields = [
    ["deliveryAddressLine1", "line1", 200],
    ["deliveryAddressLine2", "line2", 100],
    ["deliveryCity", "city", 100],
    ["deliveryRegion", "region", 100],
    ["deliveryPostalCode", "postalCode", 20],
    ["deliveryCountry", "country", 100],
  ];
  const address = {};

  for (const [formKey, addressKey, maxLength] of fields) {
    const entry = formData.get(formKey);
    if (entry !== null && typeof entry !== "string") {
      return { error: "Enter a valid delivery address." };
    }

    const value = typeof entry === "string" ? entry.trim() : "";
    if (value.length > maxLength) {
      return { error: `The delivery address field ${addressKey} is too long.` };
    }
    address[addressKey] = value || null;
  }

  const requiredFields = ["line1", "city", "region", "postalCode", "country"];
  if (requiredFields.some((field) => !address[field])) {
    return { error: "Enter the complete delivery address for this order." };
  }
  if (address.country.toUpperCase() !== "CANADA") {
    return { error: "Delivery is currently available to Canadian addresses only." };
  }

  return { address };
}

async function markOrderFailed(admin, orderId, message) {
  const { error } = await admin
    .from("orders")
    .update({ status: "payment_failed", payment_status: "failed" })
    .eq("id", orderId);

  return error ? `${message} The order status could not be updated: ${error.message}` : message;
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return errorResponse(userError.message, 401);
  if (!user) return errorResponse("Please sign in before checkout.", 401);

  let stripe;
  let admin;
  let siteUrl;
  try {
    stripe = getStripe();
    admin = createAdminClient();
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  } catch (configurationError) {
    return errorResponse(configurationError.message, 503);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The order details could not be read.", 400);
  }

  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return errorResponse("Choose between 1 and 20 copies.", 400);
  }

  const rawPromoCode = String(formData.get("promoCode") ?? "").trim();
  const promoCode = rawPromoCode && isPromoCode(rawPromoCode) ? PROMO_CODE : null;
  if (rawPromoCode && !promoCode) {
    return errorResponse("That promo code is not valid.", 400);
  }

  const conference = promoCode ? PROMO_CONFERENCE : null;
  const { address: deliveryAddress, error: addressError } = parseDeliveryAddress(
    formData,
    Boolean(promoCode)
  );
  if (addressError) return errorResponse(addressError, 400);
  const deliveryDetails = promoCode
    ? { deliveryMethod: "conference", shippingCents: 0 }
    : getDeliveryDetails(deliveryAddress.postalCode);
  if (!deliveryDetails) {
    return errorResponse("Enter a valid Canadian postal code to calculate delivery.", 400);
  }

  const titleEntry = formData.get("title");
  const customerNameEntry = formData.get("customerName");
  const title = typeof titleEntry === "string" ? titleEntry.trim().slice(0, 200) : "";
  const customerName =
    typeof customerNameEntry === "string" ? customerNameEntry.trim().slice(0, 120) : "";
  if (!customerName) return errorResponse("Enter the customer name for this order.", 400);
  if (!title) return errorResponse("Enter a poster title for this order.", 400);

  const notes = String(formData.get("notes") ?? "").slice(0, 2000);
  const fileEntry = formData.get("file");
  const file =
    fileEntry && typeof fileEntry !== "string" && typeof fileEntry.arrayBuffer === "function"
      ? fileEntry
      : null;

  if (!file || file.size === 0) {
    return errorResponse("Upload the print-ready PDF or PPTX file before checkout.", 400);
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "pptx"].includes(extension)) {
    return errorResponse("Upload a PDF or PPTX file.", 400);
  }

  const unitPriceCents = promoCode ? PROMO_UNIT_PRICE_CENTS : STANDARD_UNIT_PRICE_CENTS;
  const totalPriceCents = unitPriceCents * quantity;
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      title,
      width_in: POSTER_WIDTH_IN,
      height_in: POSTER_HEIGHT_IN,
      material: "matte",
      quantity,
      customer_name: customerName,
      rush: false,
      status: "awaiting_payment",
      payment_status: "unpaid",
      promo_code: promoCode || null,
      conference,
      delivery_method: deliveryDetails.deliveryMethod,
      shipping_cost_cents: deliveryDetails.shippingCents,
      delivery_address_line1: deliveryAddress?.line1 ?? null,
      delivery_address_line2: deliveryAddress?.line2 ?? null,
      delivery_city: deliveryAddress?.city ?? null,
      delivery_region: deliveryAddress?.region ?? null,
      delivery_postal_code: deliveryAddress?.postalCode ?? null,
      delivery_country: deliveryAddress?.country ?? null,
      price_cents: totalPriceCents,
      notes,
    })
    .select(
      "id, price_cents, promo_code, conference, delivery_method, shipping_cost_cents, delivery_address_line1, delivery_address_line2, delivery_city, delivery_region, delivery_postal_code, delivery_country"
    )
    .single();

  if (orderError) return errorResponse(`Could not create the order: ${orderError.message}`, 500);

  if (
    order.price_cents !== totalPriceCents ||
    order.promo_code !== (promoCode || null) ||
    order.conference !== conference ||
    order.delivery_method !== deliveryDetails.deliveryMethod ||
    order.shipping_cost_cents !== deliveryDetails.shippingCents ||
    order.delivery_address_line1 !== (deliveryAddress?.line1 ?? null) ||
    order.delivery_address_line2 !== (deliveryAddress?.line2 ?? null) ||
    order.delivery_city !== (deliveryAddress?.city ?? null) ||
    order.delivery_region !== (deliveryAddress?.region ?? null) ||
    order.delivery_postal_code !== (deliveryAddress?.postalCode ?? null) ||
    order.delivery_country !== (deliveryAddress?.country ?? null)
  ) {
    const message = await markOrderFailed(
      admin,
      order.id,
      "Supabase checkout or delivery settings are out of date. Apply the latest migration and try again."
    );
    return errorResponse(message, 503);
  }

  if (file) {
    const safeFilename = file.name.replace(/[\\/?#]/g, "_");
    const path = `${user.id}/${order.id}/${safeFilename}`;
    const { error: uploadError } = await admin.storage
      .from("poster-files")
      .upload(path, file, { contentType: file.type || undefined });

    if (uploadError) {
      const message = await markOrderFailed(
        admin,
        order.id,
        `The order was created, but the file upload failed: ${uploadError.message}`
      );
      return errorResponse(message, 500);
    }

    const { error: fileRecordError } = await admin.from("order_files").insert({
      order_id: order.id,
      storage_path: path,
      filename: safeFilename,
    });

    if (fileRecordError) {
      const { error: removeError } = await admin.storage.from("poster-files").remove([path]);
      const message = await markOrderFailed(
        admin,
        order.id,
        `The order was created, but its file could not be attached: ${fileRecordError.message}`
      );
      return errorResponse(
        removeError ? `${message} The uploaded file could not be removed: ${removeError.message}` : message,
        500
      );
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "cad",
              product_data: {
                name: "Conference poster",
                description: "Standard 3 ft × 4 ft matte paper poster",
              },
              unit_amount: unitPriceCents,
            },
            quantity,
          },
        ],
        client_reference_id: order.id,
        customer_email: user.email || undefined,
        metadata: {
          order_id: order.id,
          user_id: user.id,
          promo_code: promoCode || "",
          conference: conference || "",
          delivery_method: deliveryDetails.deliveryMethod,
          shipping_cost_cents: String(deliveryDetails.shippingCents),
        },
        ...(!promoCode && {
          shipping_address_collection: { allowed_countries: ["CA"] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: deliveryDetails.shippingCents,
                  currency: "cad",
                },
                display_name:
                  deliveryDetails.deliveryMethod === "local"
                    ? "Free Local Delivery (GTA & Kitchener-Waterloo)"
                    : 'Tracked Courier Tube Shipping (38" Protective Tube)',
              },
            },
          ],
        }),
        success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/order/cancelled`,
      },
      { idempotencyKey: `conference-poster-${order.id}` }
    );
  } catch (checkoutError) {
    const message = await markOrderFailed(
      admin,
      order.id,
      `Could not create secure checkout: ${checkoutError.message}`
    );
    return errorResponse(message, 502);
  }

  if (!isValidStripeCheckoutUrl(session.url)) {
    let expireWarning = "";
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (expireError) {
      expireWarning = ` Stripe checkout could not be expired: ${expireError.message}`;
    }

    const reason = session.url
      ? "Stripe returned an invalid checkout URL."
      : "Stripe did not return a checkout URL.";
    const message = await markOrderFailed(admin, order.id, reason);
    return errorResponse(`${message}${expireWarning}`, 502);
  }

  const { error: sessionUpdateError } = await admin
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);

  if (sessionUpdateError) {
    let expireWarning = "";
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (expireError) {
      expireWarning = ` Stripe checkout could not be expired: ${expireError.message}`;
    }

    const message = await markOrderFailed(
      admin,
      order.id,
      `Checkout was created, but the order could not be linked to it: ${sessionUpdateError.message}`
    );
    return errorResponse(`${message}${expireWarning}`, 500);
  }

  return NextResponse.json({ url: session.url });
}
