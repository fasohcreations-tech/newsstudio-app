import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Organization" };

export default function OrganizationFoundationPage() {
  return (
    <div>
      <PageHeader
        title="Organization"
        description="Organization data model and navigation foundation. Management UI is not enabled yet."
      />
      <ModulePlaceholder
        title="Organization foundation"
        description="Backed by the organizations table with RLS. Create/update UI lands in a later feature."
      />
    </div>
  );
}
