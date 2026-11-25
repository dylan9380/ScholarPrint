import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return errorResponse(userError.message, 401);
  if (!user) return errorResponse("Please sign in to request an order cancellation.", 401);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Enter a reason for your cancellation request.", 400);
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse("Enter a reason for your cancellation request.", 400);
  }

  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!orderId || !message || message.length > 2000) {
    return errorResponse("Enter a reason for your cancellation request (up to 2,000 characters).", 400);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) return errorResponse(orderError.message, 500);
  if (!order) return errorResponse("That order could not be found.", 404);
  if (["cancelled", "completed"].includes(order.status)) {
    return errorResponse("This order can no longer be cancelled.", 400);
  }

  const { error: insertError } = await supabase
    .from("order_cancellation_requests")
    .insert({ order_id: order.id, user_id: user.id, message });

  if (insertError?.code === "23505") {
    return errorResponse("A cancellation request is already pending for this order.", 409);
  }
  if (insertError) return errorResponse(insertError.message, 500);

  return NextResponse.json({ received: true }, { status: 201 });
}
