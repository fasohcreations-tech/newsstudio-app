import "server-only";

import { spawn } from "node:child_process";

export type FfmpegProgressEvent = {
  outTimeMs: number | null;
  ended: boolean;
};

/**
 * Run an FFmpeg/FFprobe binary and optionally stream `-progress` lines.
 */
export function runProcess(input: {
  bin: string;
  args: string[];
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  shouldCancel?: () => Promise<boolean>;
}): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.bin, input.args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const cancelTimer = setInterval(() => {
      void (async () => {
        if (!input.shouldCancel) return;
        try {
          if (await input.shouldCancel()) {
            child.kill("SIGKILL");
          }
        } catch {
          /* ignore */
        }
      })();
    }, 1000);

    child.stdout.on("data", (buf: Buffer) => {
      const text = buf.toString("utf8");
      stdout += text;
      input.onStdout?.(text);
    });
    child.stderr.on("data", (buf: Buffer) => {
      const text = buf.toString("utf8");
      stderr += text;
      input.onStderr?.(text);
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearInterval(cancelTimer);
      reject(err);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearInterval(cancelTimer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export function parseFfmpegProgress(chunk: string): FfmpegProgressEvent {
  let outTimeMs: number | null = null;
  let ended = false;
  for (const line of chunk.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("out_time_ms=")) {
      const n = Number(trimmed.slice("out_time_ms=".length));
      if (Number.isFinite(n)) outTimeMs = n / 1000;
    } else if (trimmed.startsWith("out_time_us=")) {
      const n = Number(trimmed.slice("out_time_us=".length));
      if (Number.isFinite(n)) outTimeMs = n / 1000;
    } else if (trimmed === "progress=end") {
      ended = true;
    }
  }
  return { outTimeMs, ended };
}
