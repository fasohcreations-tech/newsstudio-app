/**
 * Public API for MediaOS Creative Studio (Module 3.0).
 */

export { CreativeStudioHome } from "@/features/creative-studio/components/creative-studio-home";
export { CreativeStudioWorkspace } from "@/features/creative-studio/components/creative-studio-workspace";
export { CreateProjectDialog } from "@/features/creative-studio/components/dialogs/create-project-dialog";

export { ProjectExplorerPanel } from "@/features/creative-studio/components/panels/project-explorer-panel";
export { MediaBinPanel } from "@/features/creative-studio/components/panels/media-bin-panel";
export { TemplateLibraryPanel } from "@/features/creative-studio/components/panels/template-library-panel";
export { PreviewMonitor } from "@/features/creative-studio/components/panels/preview-monitor";
export { PlaybackControls } from "@/features/creative-studio/components/panels/playback-controls";
export { TimelineEditor } from "@/features/creative-studio/components/panels/timeline-editor";
export { TimelineEngine } from "@/features/creative-studio/components/timeline-engine/timeline-engine";

export { InspectorPanel } from "@/features/creative-studio/components/panels/inspector-panel";
export { AiAssistantPanel } from "@/features/creative-studio/components/panels/ai-assistant-panel";

export { useStudioLayout } from "@/features/creative-studio/hooks/use-studio-layout";
export { useTimelineSelection } from "@/features/creative-studio/hooks/use-timeline-selection";
export { useUndoRedo } from "@/features/creative-studio/hooks/use-undo-redo";
export {
  usePreviewPlayback,
  formatTimecode,
} from "@/features/creative-studio/hooks/use-preview-playback";
export { useStudioShortcuts } from "@/features/creative-studio/hooks/use-studio-shortcuts";

export type * from "@/features/creative-studio/types/creative-studio.types";
export type * from "@/features/creative-studio/types/timeline-engine.types";
export type { TrackService } from "@/features/creative-studio/services/interfaces/track.service";
export type { ClipService } from "@/features/creative-studio/services/interfaces/clip.service";
export type { SelectionService } from "@/features/creative-studio/services/interfaces/selection.service";
export type { UndoRedoService } from "@/features/creative-studio/services/interfaces/undo-redo.service";
export type { EnterpriseTimelineService } from "@/features/creative-studio/services/interfaces/enterprise-timeline.service";
export type { ProjectService } from "@/features/creative-studio/services/interfaces/project.service";
export type { TimelineService } from "@/features/creative-studio/services/interfaces/timeline.service";
export type { TemplateService } from "@/features/creative-studio/services/interfaces/template.service";
export type { PreviewService } from "@/features/creative-studio/services/interfaces/preview.service";
export type { RenderService } from "@/features/creative-studio/services/interfaces/render.service";

export {
  createProjectService,
} from "@/features/creative-studio/services/project.service.impl";
export {
  createTimelineService,
} from "@/features/creative-studio/services/timeline.service.impl";
export {
  createTrackService,
} from "@/features/creative-studio/services/track.service.impl";
export {
  createClipService,
} from "@/features/creative-studio/services/clip.service.impl";
export {
  createSelectionService,
} from "@/features/creative-studio/services/selection.service.impl";
export {
  createUndoRedoService,
} from "@/features/creative-studio/services/undo-redo.service.impl";
export {
  createEnterpriseTimelineService,
} from "@/features/creative-studio/services/enterprise-timeline.service.impl";
export {
  createTemplateService,
} from "@/features/creative-studio/services/template.service.impl";
export {
  createPreviewService,
} from "@/features/creative-studio/services/preview.service.impl";
export {
  placeholderRenderService,
} from "@/features/creative-studio/services/render.service.impl";

export {
  CREATIVE_PROJECT_STATUSES,
  CREATIVE_TRACK_KINDS,
  CREATIVE_CLIP_KINDS,
  CREATIVE_PLACEHOLDER_KINDS,
  DEFAULT_STUDIO_TRACKS,
  MEDIA_BIN_CATEGORIES,
  STUDIO_LAYOUT_STORAGE_KEY,
} from "@/features/creative-studio/constants/creative-studio.constants";
export {
  DEFAULT_ENTERPRISE_TRACKS,
  ENTERPRISE_TRACK_KINDS,
  ENTERPRISE_TRACK_COLORS,
  RIPPLE_MODES,
} from "@/features/creative-studio/constants/timeline-engine.constants";
export { STUDIO_SHORTCUTS } from "@/features/creative-studio/constants/studio-shortcuts";
