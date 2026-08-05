import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TemplateDesignerShell } from "@/features/template-designer/components/template-designer-shell";
import { TemplatePanelPlaceholder } from "@/features/template-designer/components/template-panel-placeholder";
import {
  loadTemplateOrNotFound,
  requireTemplateContext,
} from "@/features/template-designer/lib/load-template";
import type { TemplateDesignerPanel } from "@/features/template-designer/types/template-designer.types";

const PANEL_COPY: Record<
  TemplateDesignerPanel,
  { title: string; description: string; integrates?: string }
> = {
  design: {
    title: "Design Canvas",
    description:
      "Main designer surface. Layout is authored in Scene Composer; this shell is the professional template home.",
    integrates: "Scene Composer workspace",
  },
  assets: {
    title: "Template Assets",
    description:
      "Assets scoped to this template package. Uses the existing Asset Engine — no duplicate media store.",
    integrates: "Asset Engine / Media Library",
  },
  layers: {
    title: "Layer Manager",
    description:
      "Professional layer tree: video, image, text, shape, ticker, logo, groups, masks, adjustment layers.",
    integrates: "Scene Composer object tree",
  },
  properties: {
    title: "Property Inspector",
    description:
      "Transform, typography, fill, stroke, shadow, glow, blend, binding, animation, and behaviour for the selected layer.",
    integrates: "Scene Composer inspector",
  },
  animations: {
    title: "Animation Editor",
    description:
      "Entrance / idle / exit, keyframes, easing. Driven by the existing Motion Library.",
    integrates: "Motion Library",
  },
  behaviours: {
    title: "Behaviour Editor",
    description:
      "Float, bounce, pulse, shake, orbit, wave, edge sweep, light sweep — existing Behaviour Engine.",
    integrates: "Behaviour Engine",
  },
  shapes: {
    title: "Shape Composer",
    description:
      "Rectangles, paths, booleans, masks, gradients — existing Shape Composer UI.",
    integrates: "Shape Composer",
  },
  effects: {
    title: "Effects Studio",
    description:
      "Glow, blur, glass, noise, edge highlight, and broadcast effect overlays.",
    integrates: "Broadcast Effects stack",
  },
  bindings: {
    title: "Data Bindings",
    description:
      "Map layers to Story fields (headline, ticker, logo, media…). Templates never store Story values.",
    integrates: "Story Data / variable binding",
  },
  preview: {
    title: "Live Preview",
    description:
      "Uses the existing Story Preview runtime. Template changes update Preview immediately.",
    integrates: "StoryLivePreview",
  },
};

export function templatePanelMetadata(panel: TemplateDesignerPanel): Metadata {
  return { title: PANEL_COPY[panel].title };
}

export async function renderTemplatePanelPage(
  templateId: string,
  panel: TemplateDesignerPanel,
) {
  const { membership, error } = await requireTemplateContext(
    `/templates/${templateId}/${panel}`,
  );

  if (!membership || error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Designer unavailable</AlertTitle>
          <AlertDescription>
            {error ?? "Organization context required."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const template = await loadTemplateOrNotFound(templateId);
  const copy = PANEL_COPY[panel];

  return (
    <TemplateDesignerShell template={template} activePanel={panel}>
      <TemplatePanelPlaceholder
        template={template}
        title={copy.title}
        description={copy.description}
        integrates={copy.integrates}
      />
    </TemplateDesignerShell>
  );
}
