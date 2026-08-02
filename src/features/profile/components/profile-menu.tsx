"use client";

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

export function ProfileMenu({ profile }: ProfileMenuProps) {
  const router = useRouter();
  const displayName = profile.full_name?.trim() || profile.email;

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto gap-2 px-2 py-1.5 data-popup-open:bg-accent"
            aria-label="Open profile menu"
          />
        }
      >
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
