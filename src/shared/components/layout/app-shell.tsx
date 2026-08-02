import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { TopNav } from "@/shared/components/layout/top-nav";
import { JobStatusBar } from "@/features/platform/components/job-status-bar";
import { CommandPalette } from "@/features/platform/components/command-palette";
import { NotificationProvider } from "@/features/platform/context/notification-context";
import { CommandPaletteProvider } from "@/features/platform/context/command-palette-context";
import { PlatformShortcuts } from "@/features/platform/components/platform-shortcuts";
import type { ProfileSummary } from "@/features/profile/types/profile.types";
import type { OrganizationMembership } from "@/features/organization/types/organization.types";

type AppShellProps = {
  children: React.ReactNode;
  profile: ProfileSummary;
  memberships: OrganizationMembership[];
};

export async function AppShell({
  children,
  profile,
  memberships,
}: AppShellProps) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    <CommandPaletteProvider>
      <NotificationProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <TopNav profile={profile} memberships={memberships} />
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <main className="flex-1 p-4 md:p-6">{children}</main>
              <JobStatusBar email={profile.email} />
            </div>
          </SidebarInset>
          <CommandPalette />
          <PlatformShortcuts />
        </SidebarProvider>
      </NotificationProvider>
    </CommandPaletteProvider>
  );
}
