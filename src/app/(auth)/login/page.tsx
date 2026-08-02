import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/guards/require-auth";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  await requireGuest();

  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
