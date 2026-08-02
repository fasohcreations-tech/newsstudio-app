"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

type AuthGuardProps = {
  children: React.ReactNode;
};

/**
 * Client-side authentication guard for interactive surfaces.
 * Server middleware and requireAuth remain the primary enforcement layer.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading session">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
