import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesFoundationPage() {
  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Workspace data model and navigation foundation for multi-desk operations."
      />
      <ModulePlaceholder
        title="Workspace foundation"
        description="Backed by the workspaces table scoped to organizations. Management UI is deferred."
      />
    </div>
  );
}
