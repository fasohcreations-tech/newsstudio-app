/**
 * Dev-only Supabase query instrumentation for egress debugging.
 * No-ops in production builds.
 */

type QueryLog = {
  at: number;
  label: string;
  ms: number;
  rows?: number;
  bytesApprox?: number;
  duplicateOf?: string;
};

const recent = new Map<string, number>();
const logs: QueryLog[] = [];
const DEDUPE_WINDOW_MS = 750;

export async function withQueryLog<T>(
  label: string,
  run: () => PromiseLike<T> | T,
  options?: { rowCount?: (result: T) => number; payload?: (result: T) => unknown },
): Promise<T> {
  const started = Date.now();
  const last = recent.get(label);
  const duplicateOf =
    last != null && started - last < DEDUPE_WINDOW_MS ? label : undefined;
  recent.set(label, started);

  try {
    const result = await Promise.resolve(run());
    if (process.env.NODE_ENV === "development") {
      const rows = options?.rowCount?.(result);
      let bytesApprox: number | undefined;
      try {
        const payload = options?.payload?.(result) ?? result;
        bytesApprox = JSON.stringify(payload ?? null).length;
      } catch {
        bytesApprox = undefined;
      }
      const entry: QueryLog = {
        at: started,
        label,
        ms: Date.now() - started,
        rows,
        bytesApprox,
        duplicateOf,
      };
      logs.push(entry);
      if (logs.length > 200) logs.shift();
      const dup = duplicateOf ? " DUPLICATE" : "";
      // eslint-disable-next-line no-console -- intentional egress diagnostics
      console.debug(
        `[supabase]${dup} ${label} ${entry.ms}ms` +
          (rows != null ? ` rows=${rows}` : "") +
          (bytesApprox != null ? ` ~${Math.round(bytesApprox / 1024)}KB` : ""),
      );
    }
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- intentional egress diagnostics
      console.debug(`[supabase] FAIL ${label} ${Date.now() - started}ms`, error);
    }
    throw error;
  }
}

export function getRecentQueryLogs(): QueryLog[] {
  return [...logs];
}
