export function getAuthConfirmationRedirect(nextPath, currentOrigin) {
  const configuredOrigin =
    process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : currentOrigin;
  const callbackUrl = new URL("/auth/callback", configuredOrigin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
