import { redirectToWorkspace } from "@/features/template-designer/lib/redirect-to-workspace";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function Page({ params }: PageProps) {
  const { templateId } = await params;
  redirectToWorkspace(templateId, "bindings");
}
