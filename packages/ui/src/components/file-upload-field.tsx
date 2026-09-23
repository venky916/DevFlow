"use client";

import { useRef } from "react";
import { Upload, X, Loader2, FileText, AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";
import type { UploadedFileInfo } from "@devflow/types";

interface FileUploadFieldProps {
  file: UploadedFileInfo | null;
  status: "idle" | "uploading" | "done" | "error";
  progress?: number;
  errorMessage?: string;
  accept?: string;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  onPreview?: () => void;
  className?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  file,
  status,
  progress = 0,
  errorMessage,
  accept,
  onSelect,
  onRemove,
  onPreview,
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onSelect(selected);
    e.target.value = "";
  };

  if (status === "idle" && !file) {
    return (
      <div className={cn("w-full", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-1.5 py-6 rounded-[4px] border border-dashed border-border-emphasis bg-bg-surface hover:border-border-strong hover:bg-bg-hover transition-colors"
        >
          <Upload className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] text-text-secondary">
            Click to upload
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-full aspect-square flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-[4px] border bg-bg-surface",
        status === "error" ? "border-danger-text" : "border-border-default",
        status === "done" &&
          onPreview &&
          "cursor-pointer hover:border-border-strong",
        className,
      )}
      onClick={status === "done" ? onPreview : undefined}
      title={
        status === "error" ? (errorMessage ?? "Upload failed") : file?.fileName
      }
    >
      {status !== "uploading" && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-bg-overlay text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger-text transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {file?.mimeType.startsWith("image/") && file.url ? (
        <img
          src={file.url}
          alt={file.fileName}
          className="h-9 w-9 rounded-[4px] object-cover shrink-0"
        />
      ) : status === "error" ? (
        <AlertCircle className="h-5 w-5 text-danger-text shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-[4px] bg-bg-overlay flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-text-muted" />
        </div>
      )}

      <p className="w-full text-[11px] text-text-primary text-center truncate px-1">
        {file?.fileName}
      </p>

      {status === "uploading" ? (
        <div className="w-full h-[3px] bg-bg-overlay rounded-full mt-0.5 overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        file && (
          <span className="text-[10px] text-text-muted font-mono">
            {formatBytes(file.fileSize)}
          </span>
        )
      )}

      {status === "uploading" && (
        <Loader2 className="absolute top-1 right-1 h-3.5 w-3.5 animate-spin text-text-muted" />
      )}
    </div>
  );
}
