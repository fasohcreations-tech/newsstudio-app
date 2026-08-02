import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CheckCircle2,
  FileText,
  FolderOpen,
  Inbox,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import type { StoryStatus } from "@/shared/types/database.types";

export type NewsroomView =
  | "all"
  | "assignments"
  | "categories"
  | "drafts"
  | "review"
  | "published"
  | "archived"
  | "trash";

export type NewsroomNavItem = {
  id: NewsroomView;
  title: string;
  icon: LucideIcon;
  status?: StoryStatus;
  trash?: boolean;
  placeholder?: boolean;
};

export const NEWSROOM_NAV_ITEMS: NewsroomNavItem[] = [
  { id: "all", title: "Stories", icon: FileText },
  { id: "assignments", title: "Assignments", icon: Users, placeholder: true },
  { id: "categories", title: "Categories", icon: FolderOpen },
  { id: "drafts", title: "Drafts", icon: Inbox, status: "draft" },
  { id: "review", title: "Review", icon: CheckCircle2, status: "review" },
  { id: "published", title: "Published", icon: Send, status: "published" },
  { id: "archived", title: "Archived", icon: Archive, status: "archived" },
  { id: "trash", title: "Trash", icon: Trash2, trash: true },
];
