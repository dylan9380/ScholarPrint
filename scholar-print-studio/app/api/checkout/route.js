import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

const STANDARD_PRICE_CENTS = 7000;
const PROMO_PRICE_CENTS = 4000;
const PROMO_CODE = "LYDIA40";
const POSTER_WIDTH_IN = 36;
const POSTER_HEIGHT_IN = 48;

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
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
  const promoCode = rawPromoCode.toUpperCase();
  if (promoCode && promoCode !== PROMO_CODE) {
    return errorResponse("That promo code is not valid.", 400);
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const notes = String(formData.get("notes") ?? "").slice(0, 2000);
  const fileEntry = formData.get("file");
  const file =
    fileEntry && typeof fileEntry !== "string" && typeof fileEntry.arrayBuffer === "function"
      ? fileEntry
      : null;

  if (file) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "pptx"].includes(extension)) {
      return errorResponse("Upload a PDF or PPTX file.", 400);
    }
  }

  const unitPriceCents = promoCode ? PROMO_PRICE_CENTS : STANDARD_PRICE_CENTS;
  const totalPriceCents = unitPriceCents * quantity;
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      title: title || "Standard 3 ft × 4 ft conference poster",
      width_in: POSTER_WIDTH_IN,
      height_in: POSTER_HEIGHT_IN,
      material: "matte",
      quantity,
      rush: false,
      status: "awaiting_payment",
      payment_status: "unpaid",
      promo_code: promoCode || null,
      price_cents: totalPriceCents,
      notes,
    })
    .select("id")
    .single();

  if (orderError) return errorResponse(`Could not create the order: ${orderError.message}`, 500);

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
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
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
          promo_code: promoCode,
        },
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

  if (!session.url) {
    const message = await markOrderFailed(admin, order.id, "Stripe did not return a checkout URL.");
    return errorResponse(message, 502);
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
