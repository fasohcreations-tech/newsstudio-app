"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/shared/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

/**
 * Ensures recovery sessions from email links are established before
 * showing the password form (handles delayed cookie hydration).
 */
export function ResetPasswordClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function ensureSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        setHasSession(true);
        setReady(true);
        return;
      }

      // Wait briefly for cookie/session propagation from the recovery callback
      await new Promise((resolve) => setTimeout(resolve, 250));

      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (retrySession) {
        setHasSession(true);
      } else {
        router.replace("/forgot-password?error=recovery_session_missing");
      }
      setReady(true);
    }

    void ensureSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="w-full max-w-md space-y-3" aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return <ResetPasswordForm />;
}
