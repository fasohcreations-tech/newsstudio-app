/**
 * Helpers for displaying AI job token / prompt metadata from ai_jobs rows.
 */

import type { AiJob } from "@/features/content/types/content.types";
import type { Json } from "@/shared/types/database.types";

function asRecord(value: Json | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readJobPromptId(job: AiJob): string | null {
  const request = asRecord(job.request);
  const id = request?.promptId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function formatTokenCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

export function formatJobCost(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `$${num.toFixed(4)}`;
}
