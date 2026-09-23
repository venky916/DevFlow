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
  readOnly?: boolean; // gates the dropzone (add)
  canDeleteItem?: (item: PendingAttachment) => boolean; // gates each file's remove button individually
}

export function FileUploadList({
  items,
  onFilesAdded,
  onRemove,
  onDownload,
  readOnly,
  canDeleteItem,
}: FileUploadListProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesAdded,
  });

  const previewItem = items.find((i) => i.id === previewId);
  const previewItemCanDelete = previewItem
    ? (canDeleteItem?.(previewItem) ?? true)
    : false;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
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
        </div>
      )}

      {!readOnly && (
        <div
          {...getRootProps()}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[4px] border border-dashed transition-colors cursor-pointer ${
            isDragActive
              ? "border-accent bg-accent-subtle"
              : "border-border-emphasis bg-bg-surface hover:border-border-strong hover:bg-bg-hover"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-4 w-4 text-text-muted shrink-0" />
          <span className="text-[13px] text-text-secondary">
            {isDragActive ? (
              "Drop files here"
            ) : (
              <>
                Drop files or <span className="text-accent">browse</span>
              </>
            )}
          </span>
        </div>
      )}

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
        canDelete={previewItemCanDelete}
      />
    </div>
  );
}
