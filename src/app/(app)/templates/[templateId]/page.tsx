import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ templateId: string }>;
};

/** Opening a template lands in the Design panel. */
export default async function TemplateRootPage({ params }: PageProps) {
  const { templateId } = await params;
  redirect(`/templates/${templateId}/design`);
}
