"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { FileUploadField } from "./file-upload-field";
import type { PendingAttachment } from "@devflow/types";
import { AttachmentPreviewModal } from "./attachment-preview-modal";

interface FileUploadListProps {
  items: PendingAttachment[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (id: string) => void;
  onDownload?: (item: PendingAttachment) => Promise<void>;
}

export function FileUploadList({
  items,
  onFilesAdded,
  onRemove,
  onDownload,
}: FileUploadListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesAdded,
  });

  const previewItem = items.find((i) => i.id === previewId);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const fileInfo = item.file ?? {
          fileName: item.localName,
          fileSize: item.localSize,
          mimeType: item.localMimeType,
          url: "",
        };
        return (
          <FileUploadField
            key={item.id}
            status={item.status}
            progress={item.progress}
            errorMessage={item.errorMessage}
            file={fileInfo}
            onSelect={() => {}}
            onRemove={() => onRemove(item.id)}
            onPreview={() => setPreviewId(item.id)}
          />
        );
      })}

      <div
        {...getRootProps()}
        className={`w-full flex flex-col items-center gap-1.5 py-5 rounded-[4px] border border-dashed transition-colors cursor-pointer ${
          isDragActive
            ? "border-accent bg-accent-subtle"
            : "border-border-emphasis bg-bg-surface hover:border-border-strong hover:bg-bg-hover"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-4 w-4 text-text-muted" />
        <span className="text-[13px] text-text-secondary">
          {isDragActive ? "Drop files here" : "Click or drag files to attach"}
        </span>
      </div>

      <AttachmentPreviewModal
        open={!!previewItem}
        onClose={() => setPreviewId(null)}
        file={previewItem?.file ?? null}
        onDownload={
          previewItem && onDownload ? () => onDownload(previewItem) : undefined
        }
        onDelete={() => {
          if (previewId) onRemove(previewId);
          setPreviewId(null);
        }}
      />
    </div>
  );
}
