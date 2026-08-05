import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TemplateLibraryHome } from "@/features/template-designer/components/template-library-home";
import { requireTemplateContext } from "@/features/template-designer/lib/load-template";
import { createTemplateDesignerService } from "@/features/template-designer/services/template-designer.service.impl";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Professional Broadcast Template Designer — reusable graphics packages for every story.",
};

export default async function TemplatesPage() {
  const { membership, error } = await requireTemplateContext("/templates");

  if (!membership || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Templates unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "Organization context required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const service = createTemplateDesignerService();
  const result = await service.listTemplates(membership.organization.id);

  return (
    <TemplateLibraryHome
      organizationName={membership.organization.name}
      templates={result.data ?? []}
    />
  );
}
