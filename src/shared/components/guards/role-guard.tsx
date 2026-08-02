"use client";

type RoleGuardProps = {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Client role-guard foundation.
 * Pair with server requireOrgRole / requireOrgPermission for enforcement.
 */
export function RoleGuard({ allowed, children, fallback = null }: RoleGuardProps) {
  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
