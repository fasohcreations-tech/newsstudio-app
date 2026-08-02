import type { Metadata } from "next";
import { Suspense } from "react";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { requireGuest } from "@/features/auth/guards/require-auth";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default async function ForgotPasswordPage() {
  await requireGuest();

  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
