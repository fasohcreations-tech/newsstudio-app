"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AvatarPlaceholder } from "@/features/profile/components/avatar-placeholder";
import { createClient } from "@/shared/lib/supabase/client";
import { signOut } from "@/features/auth/services/auth.service";
import { DEFAULT_UNAUTHENTICATED_ROUTE } from "@/shared/config/constants";
import type { ProfileSummary } from "@/features/profile/types/profile.types";

type ProfileMenuProps = {
  profile: ProfileSummary;
};

function ProfileMenuChrome({
  profile,
  displayName,
}: {
  profile: ProfileSummary;
  displayName: string;
}) {
  return (
    <>
      <AvatarPlaceholder
        name={profile.full_name}
        email={profile.email}
        avatarUrl={profile.avatar_url}
      />
      <div className="hidden min-w-0 text-left md:block">
        <p className="truncate text-sm font-medium leading-none">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
      </div>
      <ChevronsUpDown className="hidden size-4 text-muted-foreground md:block" />
    </>
  );
}

export function ProfileMenu({ profile }: ProfileMenuProps) {
  const router = useRouter();
  const displayName = profile.full_name?.trim() || profile.email;
  // Base UI Menu Trigger mints useId()-based ids that diverge between SSR and
  // client under Next 15.5 (same class of bug as sidebar TooltipTrigger).
  // Keep first paint as a plain button; attach the menu after mount.
  const [menuReady, setMenuReady] = useState(false);

  useEffect(() => {
    setMenuReady(true);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    const result = await signOut(supabase);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Signed out");
    router.replace(DEFAULT_UNAUTHENTICATED_ROUTE);
    router.refresh();
  }

  const triggerClassName =
    "h-auto gap-2 px-2 py-1.5 data-popup-open:bg-accent";

  if (!menuReady) {
    return (
      <Button
        variant="ghost"
        className={triggerClassName}
        aria-label="Open profile menu"
        disabled
      >
        <ProfileMenuChrome profile={profile} displayName={displayName} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={triggerClassName}
            aria-label="Open profile menu"
          />
        }
      >
        <ProfileMenuChrome profile={profile} displayName={displayName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <User />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile/settings" />}>
            <Settings />
            Profile settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
