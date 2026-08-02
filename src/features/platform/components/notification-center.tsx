"use client";

import Link from "next/link";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  notificationTone,
  useNotifications,
  type AppNotificationKind,
} from "@/features/platform/context/notification-context";
import { STATUS_TONE_CLASSES } from "@/features/platform/constants/design";
import { useKeyboardShortcut } from "@/features/platform/hooks/use-keyboard-shortcut";
import { RelativeTime } from "@/features/newsroom/components/relative-time";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<AppNotificationKind, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  job: "Background job",
  ai: "AI job",
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    panelOpen,
    setPanelOpen,
    markAllRead,
    dismiss,
    clear,
  } = useNotifications();

  useKeyboardShortcut("ctrl+shift+n", () => setPanelOpen(true));

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => setPanelOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          aria-describedby={undefined}
        >
          <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-2 pr-8">
              <div>
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>
                  Success, errors, warnings, and job updates.
                </SheetDescription>
              </div>
              <Badge variant="secondary">{unreadCount} unread</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clear}>
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.map((item) => {
                  const tone = notificationTone(item.kind);
                  const body = (
                    <div className="flex gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          STATUS_TONE_CLASSES[tone].dot,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !item.read && "text-foreground",
                              item.read && "text-muted-foreground",
                            )}
                          >
                            {item.title}
                          </p>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Dismiss notification"
                            onClick={(e) => {
                              e.preventDefault();
                              dismiss(item.id);
                            }}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {KIND_LABEL[item.kind]} ·{" "}
                          <RelativeTime value={item.createdAt} />
                        </p>
                        {item.body ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.body}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );

                  return (
                    <li
                      key={item.id}
                      className={cn(!item.read && "bg-muted/30")}
                    >
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setPanelOpen(false)}
                          className="block hover:bg-muted/40"
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
