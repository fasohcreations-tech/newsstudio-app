import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/shared/lib/supabase/server";
import { getAppUrl, safeAuthNextPath } from "@/shared/lib/app-url";

/**
 * Completes Supabase email / magic-link / confirmation flows via PKCE code
 * or token_hash OTP verification, then redirects into the app.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const appUrl = getAppUrl();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeAuthNextPath(searchParams.get("next"));
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (errorDescription) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }

    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const destination =
        type === "recovery" ? "/reset-password" : next;
      return NextResponse.redirect(`${appUrl}${destination}`);
    }

    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${appUrl}/login?error=${encodeURIComponent("auth_callback_failed")}`,
  );
}
