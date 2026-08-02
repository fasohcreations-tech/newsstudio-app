import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/shared/lib/supabase/server";
import { getAppUrl } from "@/shared/lib/app-url";

/**
 * Dedicated password-recovery callback.
 * Email reset links must use this path so users always land on /reset-password.
 *
 * Supabase Redirect URL allow list must include:
 *   http://localhost:3003/auth/callback/recovery
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appUrl = getAppUrl();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "recovery";
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (errorDescription) {
    return NextResponse.redirect(
      `${appUrl}/forgot-password?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appUrl}/reset-password`);
    }

    return NextResponse.redirect(
      `${appUrl}/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${appUrl}/reset-password`);
    }

    return NextResponse.redirect(
      `${appUrl}/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${appUrl}/forgot-password?error=${encodeURIComponent("recovery_link_invalid")}`,
  );
}
