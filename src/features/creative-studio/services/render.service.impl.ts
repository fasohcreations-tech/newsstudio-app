import type {
  RenderJob,
  RenderRequest,
  RenderService,
} from "@/features/creative-studio/services/interfaces/render.service";

/**
 * Render placeholder — always returns queued then failed (not implemented).
 */
export class PlaceholderRenderService implements RenderService {
  private jobs = new Map<string, RenderJob>();

  async queueRender(request: RenderRequest): Promise<RenderJob> {
    const job: RenderJob = {
      id: `render-${Date.now()}`,
      status: "queued",
      progress: 0,
      outputUrl: null,
      error: null,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async getJob(jobId: string): Promise<RenderJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    this.jobs.set(jobId, { ...job, status: "failed", error: "Cancelled" });
    return true;
  }
}

export const placeholderRenderService = new PlaceholderRenderService();
