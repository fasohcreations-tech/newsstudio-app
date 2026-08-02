"use client";

type EmptyStateProps = {
  visible: boolean;
  label?: "drop" | "assign";
  onBrowse?: () => void;
};

/**
 * Elegant empty state — icon + short label, optional Browse Media action.
 */
export function EmptyState({
  visible,
  label = "drop",
  onBrowse,
}: EmptyStateProps) {
  if (!visible) return null;

  return (
    <div
      data-video-empty-state
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background:
          "radial-gradient(ellipse at center, rgba(28, 36, 52, 0.55) 0%, rgba(10, 14, 22, 0.85) 70%)",
        zIndex: 4,
        pointerEvents: onBrowse ? "auto" : "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(210, 220, 235, 0.14)",
        }}
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(200, 210, 230, 0.55)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="2" y="6" width="14" height="12" rx="2" />
          <path d="M16 10l6-3v10l-6-3" />
        </svg>
      </div>
      <span
        style={{
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(180, 195, 220, 0.55)",
        }}
      >
        {label === "assign" ? "Assign Media" : "Drop Video Here"}
      </span>
      {onBrowse ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowse();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.08)",
            color: "rgba(245,248,255,0.92)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Browse Media
        </button>
      ) : null}
    </div>
  );
}
