"use client";

type VersionIndicatorProps = {
  revision: number;
  editorVersion: string;
  lastSavedAt: string | null;
};

export function VersionIndicator({
  revision,
  editorVersion,
  lastSavedAt,
}: VersionIndicatorProps) {
  return (
    <span className="ml-auto tabular-nums" title="Editor format / revision">
      v{editorVersion} · rev {revision}
      {lastSavedAt
        ? ` · ${new Date(lastSavedAt).toLocaleTimeString()}`
        : " · history placeholder"}
    </span>
  );
}
