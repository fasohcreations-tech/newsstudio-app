"use client";

import { NEWSROOM_NAV_ITEMS, type NewsroomView } from "@/features/newsroom/constants/newsroom-nav";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type NewsroomSidebarProps = {
  activeView: NewsroomView;
  categories: string[];
  selectedCategory: string | null;
  onViewChange: (view: NewsroomView) => void;
  onCategorySelect: (category: string | null) => void;
};

export function NewsroomSidebar({
  activeView,
  categories,
  selectedCategory,
  onViewChange,
  onCategorySelect,
}: NewsroomSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-border/60 bg-muted/15 md:w-56 lg:w-60">
      <div className="border-b border-border/60 px-3 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Newsroom
        </p>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2" aria-label="Newsroom sections">
          {NEWSROOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onViewChange(item.id);
                  if (item.id !== "categories") {
                    onCategorySelect(null);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {item.placeholder ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Soon
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        {activeView === "categories" ? (
          <div className="border-t border-border/60 p-2">
            <p className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
              Categories
            </p>
            {categories.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No categories yet. Add one when creating a story.
              </p>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onCategorySelect(null)}
                  className={cn(
                    "w-full rounded-md px-2.5 py-1.5 text-left text-sm",
                    !selectedCategory
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  All categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onCategorySelect(category)}
                    className={cn(
                      "w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm",
                      selectedCategory === category
                        ? "bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </ScrollArea>
    </aside>
  );
}
