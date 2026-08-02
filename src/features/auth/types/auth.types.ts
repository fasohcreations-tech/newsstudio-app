import type { User, Session } from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;

export type AuthResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
