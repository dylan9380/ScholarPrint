import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  let safeRedirectUrl = new URL("/dashboard", origin);
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
    const redirectUrl = new URL(nextPath, origin);
    if (redirectUrl.origin === origin) safeRedirectUrl = redirectUrl;
  }

  return NextResponse.redirect(safeRedirectUrl);
}
