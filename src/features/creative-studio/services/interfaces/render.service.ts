export type RenderJobStatus = "queued" | "running" | "succeeded" | "failed";

export type RenderRequest = {
  projectId: string;
  timelineId: string;
  format: "mp4" | "mov" | "webm";
  resolution: { width: number; height: number };
};

export type RenderJob = {
  id: string;
  status: RenderJobStatus;
  progress: number;
  outputUrl: string | null;
  error: string | null;
};

/**
 * Render pipeline placeholder — FFmpeg / export not implemented.
 */
export interface RenderService {
  queueRender(request: RenderRequest): Promise<RenderJob>;
  getJob(jobId: string): Promise<RenderJob | null>;
  cancelJob(jobId: string): Promise<boolean>;
}
