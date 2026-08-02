"use client";

import { Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import { ProfileMenu } from "@/features/profile/components/profile-menu";
import { NotificationCenter } from "@/features/platform/components/notification-center";
import { useCommandPalette } from "@/features/platform/context/command-palette-context";
import type { ProfileSummary } from "@/features/profile/types/profile.types";
import type { OrganizationMembership } from "@/features/organization/types/organization.types";

type TopNavProps = {
  profile: ProfileSummary;
  memberships: OrganizationMembership[];
};

export function TopNav({ profile, memberships }: TopNavProps) {
  const activeOrg = memberships[0]?.organization;
  const { setOpen } = useCommandPalette();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-4">
      <SidebarTrigger className="-ml-1" aria-label="Toggle navigation sidebar" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium tracking-tight">
          {activeOrg?.name ?? "Personal workspace"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Newsroom operating system
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden max-w-xs flex-1 justify-start gap-2 text-muted-foreground md:inline-flex lg:max-w-sm"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search stories, assets, modules…</span>
        <kbd className="ml-auto rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </Button>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open search"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4" />
        </Button>
        <NotificationCenter />
        <ThemeToggle />
        <ProfileMenu profile={profile} />
      </div>
    </header>
  );
}
