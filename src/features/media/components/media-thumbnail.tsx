"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/shared/lib/supabase/client";
import { createSignedAssetUrl } from "@/features/media/services/media.service";
import type { MediaAsset } from "@/features/media/types/media.types";
import { cn } from "@/lib/utils";
import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  File,
} from "lucide-react";

type MediaThumbnailProps = {
  asset: Pick<
    MediaAsset,
    "id" | "name" | "file_type" | "storage_bucket" | "storage_path" | "mime_type"
  >;
  className?: string;
};

function TypeIcon({
  fileType,
  className,
}: {
  fileType: MediaAsset["file_type"];
  className?: string;
}) {
  if (fileType === "image") return <FileImage className={className} />;
  if (fileType === "video") return <FileVideo className={className} />;
  if (fileType === "audio") return <FileAudio className={className} />;
  if (fileType === "pdf" || fileType === "document" || fileType === "text") {
    return <FileText className={className} />;
  }
  return <File className={className} />;
}

export function MediaThumbnail({ asset, className }: MediaThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (asset.file_type !== "image" && asset.file_type !== "video") {
        setUrl(null);
        return;
      }
      const supabase = createClient();
      const { url: signed } = await createSignedAssetUrl(
        supabase,
        asset.storage_bucket,
        asset.storage_path,
        3600,
      );
      if (!cancelled) setUrl(signed);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [asset.file_type, asset.storage_bucket, asset.storage_path]);

  if (url && asset.file_type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={asset.name}
        className={cn("size-full object-cover", className)}
      />
    );
  }

  if (url && asset.file_type === "video") {
    return (
      <video
        src={url}
        className={cn("size-full object-cover", className)}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <TypeIcon fileType={asset.file_type} className="size-8 opacity-70" />
    </div>
  );
}
