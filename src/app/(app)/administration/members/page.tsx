import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Members" };

export default function MembersFoundationPage() {
  return (
    <div>
      <PageHeader
        title="Members"
        description="Membership and role assignment foundation for organizations."
      />
      <ModulePlaceholder
        title="Membership foundation"
        description="Backed by organization_members, roles, and permissions with RLS helpers."
      />
    </div>
  );
}
