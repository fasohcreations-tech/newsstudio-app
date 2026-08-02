"use client";

import { useEffect, useState } from "react";

import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "@/features/newsroom/lib/story-utils";

type RelativeTimeProps = {
  value: string;
  className?: string;
};

/**
 * Renders a stable absolute timestamp on SSR + first client paint,
 * then switches to a relative label after mount (avoids hydration drift).
 */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const [label, setLabel] = useState(() => formatAbsoluteTime(value));

  useEffect(() => {
    const update = () => setLabel(formatRelativeTime(value));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <time dateTime={value} className={className} title={formatAbsoluteTime(value)}>
      {label}
    </time>
  );
}
