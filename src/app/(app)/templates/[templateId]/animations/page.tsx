import {
  renderTemplatePanelPage,
  templatePanelMetadata,
} from "@/features/template-designer/lib/render-template-panel";

type PageProps = { params: Promise<{ templateId: string }> };

export const metadata = templatePanelMetadata("animations");

export default async function Page({ params }: PageProps) {
  const { templateId } = await params;
  return renderTemplatePanelPage(templateId, "animations");
}
