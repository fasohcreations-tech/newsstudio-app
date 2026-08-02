"use client";

import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarPlaceholderProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  if (email) {
    return email[0]?.toUpperCase() ?? "?";
  }

  return "?";
}

export function AvatarPlaceholder({
  name,
  email,
  avatarUrl,
  className,
}: AvatarPlaceholderProps) {
  const initials = getInitials(name, email);

  return (
    <Avatar className={cn("size-9 border border-border/60", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? email ?? "User"} /> : null}
      <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
        {initials === "?" ? <User className="size-4" /> : initials}
      </AvatarFallback>
    </Avatar>
  );
}
