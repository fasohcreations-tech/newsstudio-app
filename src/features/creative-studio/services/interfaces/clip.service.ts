import type {
  ClipPatch,
  EnterpriseTimelineClip,
  EnterpriseTimelineTrackWithClips,
} from "@/features/creative-studio/types/timeline-engine.types";
import type {
  CreativeClipKind,
  CreativeServiceResult,
} from "@/features/creative-studio/types/creative-studio.types";

export type CreateClipInput = {
  trackId: string;
  organizationId: string;
  name: string;
  clipKind: CreativeClipKind;
  startMs: number;
  durationMs: number;
  mediaAssetId?: string | null;
  colorLabel?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Clip operations — trim, split, duplicate, delete, lock, mute, hide, rename.
 */
export interface ClipService {
  create(input: CreateClipInput): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  update(
    clipId: string,
    patch: ClipPatch,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  move(
    clipId: string,
    trackId: string,
    startMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  trim(
    clipId: string,
    startMs: number,
    endMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  split(
    clipId: string,
    atMs: number,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip[]>>;

  duplicate(
    clipId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  softDelete(
    clipId: string,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  setLocked(
    clipId: string,
    locked: boolean,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  setMuted(
    clipId: string,
    muted: boolean,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;

  setHidden(
    clipId: string,
    hidden: boolean,
  ): Promise<CreativeServiceResult<EnterpriseTimelineClip>>;
}

export type { ClipPatch };
