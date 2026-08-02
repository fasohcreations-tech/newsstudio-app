import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Application and workspace preferences."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings/ai"
              className={cn(buttonVariants())}
            >
              AI Settings
            </Link>
            <Link
              href="/profile/settings"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Profile settings
            </Link>
          </div>
        }
      />
      <ModulePlaceholder
        title="Workspace settings"
        description="Organization preference panels will extend this surface. AI Orchestrator settings are available now."
      />
    </div>
  );
}
