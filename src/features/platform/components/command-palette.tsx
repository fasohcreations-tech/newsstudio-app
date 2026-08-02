"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Building2,
  FileImage,
  FileText,
  Loader2,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommandPalette } from "@/features/platform/context/command-palette-context";
import { useKeyboardShortcut } from "@/features/platform/hooks/use-keyboard-shortcut";
import {
  globalSearchAction,
  type GlobalSearchHit,
} from "@/features/platform/actions/global-search.actions";
import { APP_NAV_ITEMS } from "@/shared/config/navigation";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  story: Newspaper,
  asset: FileImage,
  user: User,
  organization: Building2,
  ai_job: Sparkles,
} as const;

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen, toggle } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useKeyboardShortcut("ctrl+k", () => toggle(), { allowInInputs: true });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setSearchError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearchAction(q);
        setHits(result.hits);
        setSearchError(result.error);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  const actions = useMemo(
    () => [
      {
        id: "create-story",
        label: "Create Story",
        hint: "Newsroom",
        href: "/newsroom/new",
        icon: FileText,
      },
      {
        id: "upload-media",
        label: "Upload Media",
        hint: "Media Library",
        href: "/media-library",
        icon: Upload,
      },
      {
        id: "search-assets",
        label: "Search Assets",
        hint: "Media Library",
        href: "/media-library",
        icon: Search,
      },
      {
        id: "open-settings",
        label: "Open Settings",
        hint: "Preferences",
        href: "/settings",
        icon: Settings,
      },
      {
        id: "ai-settings",
        label: "AI Settings",
        hint: "Orchestrator",
        href: "/settings/ai",
        icon: Sparkles,
      },
    ],
    [],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>
            Search stories, assets, people, and navigate MediaOS.
          </DialogDescription>
        </DialogHeader>
        <Command
          className="flex max-h-[min(70vh,32rem)] flex-col"
          shouldFilter={false}
          label="Global command palette"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or jump to…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search MediaOS"
            />
            {pending ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <kbd className="hidden rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                Esc
              </kbd>
            )}
          </div>

          <Command.List className="flex-1 overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query.trim().length < 2
                ? "Type at least 2 characters to search, or pick an action."
                : "No matches found."}
            </Command.Empty>

            {searchError ? (
              <p className="px-3 py-2 text-xs text-destructive">{searchError}</p>
            ) : null}

            {hits.length > 0 ? (
              <Command.Group
                heading="Results"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {hits.map((hit) => {
                  const Icon = KIND_ICON[hit.kind];
                  return (
                    <Command.Item
                      key={`${hit.kind}-${hit.id}`}
                      value={`${hit.kind}-${hit.title}-${hit.id}`}
                      onSelect={() => navigate(hit.href)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {hit.title}
                        </span>
                        {hit.subtitle ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Quick actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {actions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => navigate(action.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <action.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {action.hint}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {APP_NAV_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`nav-${item.title}`}
                  onSelect={() => navigate(item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
