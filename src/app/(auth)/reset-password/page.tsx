import type { Metadata } from "next";

import { ResetPasswordClient } from "@/features/auth/components/reset-password-client";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
