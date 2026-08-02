"use client";

import { useEffect, useState } from "react";

import {
  formatSystemDate,
  formatSystemTime,
} from "@/features/story-production/lib/story-binding-engine";

/**
 * Live system clock — starts after mount to avoid SSR/hydration mismatches.
 */
export function useSystemClock(tickMs = 1000) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date(0));

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  if (!mounted) {
    return {
      mounted: false,
      time: "08:00",
      date: "28 Jul 2026",
      now: null as Date | null,
    };
  }

  return {
    mounted: true,
    time: formatSystemTime(now),
    date: formatSystemDate(now),
    now,
  };
}
