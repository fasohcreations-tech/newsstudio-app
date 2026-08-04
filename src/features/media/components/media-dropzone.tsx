"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MEDIA_ACCEPT } from "@/features/media/constants/media.constants";

type MediaDropzoneProps = {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

export function MediaDropzone({ disabled, onFiles }: MediaDropzoneProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Upload className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium">Upload media assets</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Drag and drop images, video, audio, PDF, Word, or text files here — or
          choose files to upload (max 250MB each).
        </p>
      </div>
      <label>
        <input
          type="file"
          className="sr-only"
          accept={MEDIA_ACCEPT}
          multiple
          disabled={disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) onFiles(files);
            event.target.value = "";
          }}
        />
        <Button type="button" disabled={disabled}
          onClick={(event) => {
            const input = event.currentTarget.parentElement?.querySelector(
              'input[type="file"]',
            ) as HTMLInputElement | null;
            input?.click();
          }}
        >
          Choose files
        </Button>
      </label>
    </div>
  );
}
