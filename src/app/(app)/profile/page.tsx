import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/shared/components/layout/page-header";
import { requireAuth } from "@/features/auth/guards/require-auth";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/services/profile.service";
import { AvatarPlaceholder } from "@/features/profile/components/avatar-placeholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireAuth("/profile");
  const supabase = await createClient();
  const { profile } = await getCurrentProfile(supabase, user.id);

  const email = profile?.email ?? user.email ?? "";
  const fullName = profile?.full_name;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your MediaOS identity and account details."
        actions={
          <Link
            href="/profile/settings"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Edit settings
          </Link>
        }
      />
      <Card className="max-w-2xl border-border/60">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <AvatarPlaceholder
            name={fullName}
            email={email}
            avatarUrl={profile?.avatar_url}
            className="size-16 text-base"
          />
          <div>
            <CardTitle className="text-xl">
              {fullName?.trim() || "Unnamed user"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Locale</p>
            <p className="font-medium">{profile?.preferred_locale ?? "en"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Timezone</p>
            <p className="font-medium">{profile?.timezone ?? "UTC"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
