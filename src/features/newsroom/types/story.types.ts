import type {
  StoryPriority,
  StoryStatus,
  Tables,
} from "@/shared/types/database.types";
import type { NewsroomView } from "@/features/newsroom/constants/newsroom-nav";
import type { StorySortOption } from "@/features/newsroom/constants/story.constants";

export type Story = Tables<"stories">;

export type StoryProfileRef = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export type StoryWithRelations = Story & {
  reporter: StoryProfileRef | null;
  editor: StoryProfileRef | null;
  creator: StoryProfileRef | null;
};

export type StoryListFilters = {
  organizationId: string;
  view?: NewsroomView;
  status?: StoryStatus | "all";
  category?: string | null;
  priority?: StoryPriority | "all";
  search?: string;
  sort?: StorySortOption;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
};

export type StoryListResult = {
  stories: StoryWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
};

export type StoryDashboardStats = {
  draftCount: number;
  reviewCount: number;
  publishedTodayCount: number;
  recentStories: StoryWithRelations[];
};
