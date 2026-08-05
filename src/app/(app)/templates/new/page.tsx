import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateTemplateForm } from "@/features/template-designer/components/create-template-form";
import { requireTemplateContext } from "@/features/template-designer/lib/load-template";

export const metadata: Metadata = {
  title: "New Template",
  description: "Create a reusable broadcast graphics template.",
};

export default async function NewTemplatePage() {
  const { membership, error } = await requireTemplateContext("/templates/new");

  if (!membership || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Cannot create template</AlertTitle>
          <AlertDescription>
            {error ?? "Organization context required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <CreateTemplateForm />;
}
