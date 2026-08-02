import type { Json, Tables, TablesInsert, TablesUpdate } from "@/shared/types/database.types";
import type {
  AIProductionStage,
  AIWorkflowStatus,
  AIWorkflowTaskStatus,
  AIWorkflowTaskType,
} from "@/features/ai-production/constants/production.constants";

export type AIWorkflow = Tables<"ai_workflows">;
export type AIWorkflowInsert = TablesInsert<"ai_workflows">;
export type AIWorkflowUpdate = TablesUpdate<"ai_workflows">;

export type AIWorkflowTask = Tables<"ai_workflow_tasks">;
export type AIWorkflowTaskInsert = TablesInsert<"ai_workflow_tasks">;
export type AIWorkflowTaskUpdate = TablesUpdate<"ai_workflow_tasks">;

export type AIWorkflowWithTasks = AIWorkflow & {
  tasks: AIWorkflowTask[];
};

export type AIProductionServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type MockTaskOutput = {
  title: string;
  body: string;
  locale?: string;
  extras?: Record<string, unknown>;
  mock: true;
  generatedAt: string;
};

export type TaskOutputDocument = {
  content: string;
  title?: string;
  structured?: Json;
  mock?: boolean;
  generatedAt?: string;
  editedAt?: string;
};

/** Narrow helpers when reading typed columns from generated rows. */
export type AIWorkflowRow = Omit<AIWorkflow, "status" | "current_stage"> & {
  status: AIWorkflowStatus;
  current_stage: AIProductionStage | null;
};

export type AIWorkflowTaskRow = Omit<
  AIWorkflowTask,
  "status" | "task_type" | "stage"
> & {
  status: AIWorkflowTaskStatus;
  task_type: AIWorkflowTaskType;
  stage: AIProductionStage;
};
