import { AppShell } from "@/shared/components/layout/app-shell";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { getUserMemberships } from "@/features/organization/services/organization.service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const supabase = await createClient();

  const [{ profile }, { memberships }] = await Promise.all([
    getCurrentProfile(supabase, user.id),
    getUserMemberships(supabase, user.id),
  ]);

  const profileSummary = {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    full_name: profile?.full_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };

  return (
    <AppShell profile={profileSummary} memberships={memberships}>
      {children}
    </AppShell>
  );
}
