type StatusBarProps = {
  email?: string | null;
};

export function StatusBar({ email }: StatusBarProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          System ready
        </span>
        <span className="hidden sm:inline">MediaOS v1.0 · Foundation</span>
      </div>
      <div className="truncate">{email ?? "Signed in"}</div>
    </footer>
  );
}
