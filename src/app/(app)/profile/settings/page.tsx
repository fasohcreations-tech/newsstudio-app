import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ProfileSettingsForm } from "@/features/profile/components/profile-settings-form";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireAuth("/profile/settings");
  const supabase = await createClient();
  const { profile, error } = await getCurrentProfile(supabase, user.id);

  if (!profile) {
    return (
      <div>
        <PageHeader
          title="Profile settings"
          description="Unable to load your profile record."
        />
        <p className="text-sm text-destructive" role="alert">
          {error ??
            "Profile not found. Ensure the foundation migration has been applied."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile settings"
        description="Update your display name and locale preferences."
      />
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
