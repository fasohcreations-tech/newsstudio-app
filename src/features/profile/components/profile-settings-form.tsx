"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/shared/lib/supabase/client";
import { updateCurrentProfile } from "@/features/profile/services/profile.service";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/features/profile/schemas/profile.schemas";
import type { Profile } from "@/features/profile/types/profile.types";
import { AvatarPlaceholder } from "@/features/profile/components/avatar-placeholder";

type ProfileSettingsFormProps = {
  profile: Profile;
};

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      preferred_locale: profile.preferred_locale,
      timezone: profile.timezone,
    },
  });

  async function onSubmit(values: ProfileUpdateInput) {
    setFormError(null);
    const supabase = createClient();
    const result = await updateCurrentProfile(supabase, profile.id, values);

    if (result.error || !result.profile) {
      setFormError(result.error ?? "Unable to update profile.");
      return;
    }

    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl border-border/60">
      <CardHeader>
        <div className="flex items-center gap-4">
          <AvatarPlaceholder
            name={profile.full_name}
            email={profile.email}
            avatarUrl={profile.avatar_url}
            className="size-14 text-base"
          />
          <div>
            <CardTitle>Profile settings</CardTitle>
            <CardDescription>
              Manage your identity and locale preferences. Avatar upload will
              connect to Supabase Storage in a later feature.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              Email is managed by authentication and cannot be changed here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              aria-invalid={Boolean(errors.full_name)}
              {...register("full_name")}
            />
            {errors.full_name ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.full_name.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferred_locale">Locale</Label>
              <Input
                id="preferred_locale"
                placeholder="en"
                aria-invalid={Boolean(errors.preferred_locale)}
                {...register("preferred_locale")}
              />
              {errors.preferred_locale ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.preferred_locale.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                placeholder="UTC"
                aria-invalid={Boolean(errors.timezone)}
                {...register("timezone")}
              />
              {errors.timezone ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.timezone.message}
                </p>
              ) : null}
            </div>
          </div>
          {formError ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
