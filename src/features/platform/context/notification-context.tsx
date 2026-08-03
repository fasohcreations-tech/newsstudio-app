"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { StatusTone } from "@/features/platform/constants/design";

export type AppNotificationKind =
  | "success"
  | "error"
  | "warning"
  | "job"
  | "ai";

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  push: (input: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function notificationTone(kind: AppNotificationKind): StatusTone {
  switch (kind) {
    case "success":
      return "success";
    case "error":
      return "danger";
    case "warning":
      return "warning";
    case "ai":
      return "ai";
    case "job":
    default:
      return "info";
  }
}

const SEED: AppNotification[] = [
  {
    id: "seed-ready",
    kind: "success",
    title: "MediaOS ready",
    body: "Newsroom operating system is online.",
    // Fixed ISO — live Date() at module load differs SSR vs client.
    createdAt: "2026-01-01T00:00:00.000Z",
    read: false,
  },
  {
    id: "seed-jobs",
    kind: "job",
    title: "Background jobs idle",
    body: "Upload, render, and publish queues are placeholders.",
    createdAt: "2026-01-01T00:00:00.000Z",
    read: false,
  },
  {
    id: "seed-ai",
    kind: "ai",
    title: "AI jobs placeholder",
    body: "Future AI job notifications will appear here.",
    createdAt: "2026-01-01T00:00:00.000Z",
    read: true,
  },
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED);
  const [panelOpen, setPanelOpen] = useState(false);

  const push = useCallback(
    (input: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      setNotifications((prev) => [
        {
          ...input,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ].slice(0, 50));
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      panelOpen,
      setPanelOpen,
      push,
      markAllRead,
      dismiss,
      clear,
    }),
    [notifications, panelOpen, push, markAllRead, dismiss, clear],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
