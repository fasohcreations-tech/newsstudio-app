"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AppBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function AppBreadcrumbs({ items, className }: AppBreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="truncate hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn("truncate", last && "font-medium text-foreground")}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
