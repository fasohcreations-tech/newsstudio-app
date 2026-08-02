import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/shared/types/database.types";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignUpInput,
} from "@/features/auth/schemas/auth.schemas";
import type { AuthResult } from "@/features/auth/types/auth.types";
import { getAppUrl } from "@/shared/lib/app-url";

type Client = SupabaseClient<Database>;

function mapAuthError(message: string | undefined): string {
  if (!message) return "An unexpected authentication error occurred.";

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please try again shortly.";
  }

  return message;
}

export async function signInWithPassword(
  client: Client,
  input: LoginInput,
): Promise<AuthResult<{ userId: string }>> {
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { success: false, error: "Sign-in failed. Please try again." };
  }

  return { success: true, data: { userId: data.user.id } };
}

export async function signUpWithPassword(
  client: Client,
  input: SignUpInput,
): Promise<
  AuthResult<{ userId: string; emailConfirmationRequired: boolean }>
> {
  const appUrl = getAppUrl();

  const { data, error } = await client.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        full_name: input.full_name.trim(),
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { success: false, error: "Sign-up failed. Please try again." };
  }

  // Supabase returns an empty identities array when the email is already registered
  // and "Confirm email" is enabled (anti-enumeration behavior).
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      success: false,
      error: "An account with this email already exists. Sign in instead.",
    };
  }

  const emailConfirmationRequired = !data.session;

  return {
    success: true,
    data: {
      userId: data.user.id,
      emailConfirmationRequired,
    },
  };
}

export async function signOut(client: Client): Promise<AuthResult> {
  const { error } = await client.auth.signOut();

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  return { success: true, data: undefined };
}

export async function requestPasswordReset(
  client: Client,
  input: ForgotPasswordInput,
): Promise<AuthResult> {
  // Dedicated recovery callback path — avoids losing redirect intent in query params
  const redirectTo = `${getAppUrl()}/auth/callback/recovery`;

  const { error } = await client.auth.resetPasswordForEmail(
    input.email.trim().toLowerCase(),
    { redirectTo },
  );

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  // Always succeed from the UI perspective to avoid email enumeration
  return { success: true, data: undefined };
}

export async function updatePassword(
  client: Client,
  input: ResetPasswordInput,
): Promise<AuthResult> {
  const { error } = await client.auth.updateUser({
    password: input.password,
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  return { success: true, data: undefined };
}

export async function getSession(client: Client) {
  const { data, error } = await client.auth.getSession();
  if (error) {
    return { session: null, error: mapAuthError(error.message) };
  }
  return { session: data.session, error: null };
}

export async function getUser(client: Client) {
  const { data, error } = await client.auth.getUser();
  if (error) {
    return { user: null, error: mapAuthError(error.message) };
  }
  return { user: data.user, error: null };
}
