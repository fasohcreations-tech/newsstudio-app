import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Clapperboard,
  Inbox,
  LayoutDashboard,
  Library,
  Newspaper,
  Radio,
  Send,
  Settings,
  Shield,
  Sparkles,
  Wand2,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

/**
 * Primary product navigation for the MediaOS application shell.
 * Module pages are foundation stubs until their feature tracks land.
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Operational overview",
  },
  {
    title: "Newsroom",
    href: "/newsroom",
    icon: Newspaper,
    description: "Story desk and editorial workflow",
  },
  {
    title: "News Intake",
    href: "/intake",
    icon: Inbox,
    description: "Import sources into Stories",
  },
  {
    title: "Media Library",
    href: "/media-library",
    icon: Library,
    description: "Assets, footage, clips, and brand media",
  },
  {
    title: "Creative Studio",
    href: "/creative-studio",
    icon: Wand2,
    description: "Posters, thumbnails, and design",
  },
  {
    title: "Publishing",
    href: "/publishing",
    icon: Send,
    description: "YouTube, OTT, and channel delivery",
  },
  {
    title: "BroadcastOS",
    href: "/broadcast",
    icon: Radio,
    description: "Playout and broadcast automation",
  },
  {
    title: "AI Center",
    href: "/ai-center",
    icon: Sparkles,
    description: "AI tooling and model workflows",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Performance and audience insights",
  },
  {
    title: "Administration",
    href: "/administration",
    icon: Shield,
    description: "Organization, members, and roles",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Application and workspace preferences",
  },
];

export const APP_BRAND = {
  name: "MediaOS",
  mark: Clapperboard,
} as const;
