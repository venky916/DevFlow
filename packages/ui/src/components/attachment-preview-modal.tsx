"use client";

import { useState } from "react";
import {
  Download,
  ExternalLink,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import type { UploadedFileInfo } from "@devflow/types";

interface AttachmentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: UploadedFileInfo | null;
  onDownload?: () => Promise<void>; // CHANGED — was issueId/attachmentId + internal fetch
  onDelete?: () => void;
  isDeleting?: boolean;
  canDelete?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreviewModal({
  open,
  onClose,
  file,
  onDownload,
  onDelete,
  isDeleting,
  canDelete = true,
}: AttachmentPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!file) return null;

  const isImage = file.mimeType.startsWith("image/");

  const handleOpen = () => {
    window.open(file.url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={file.fileName}
      description={formatBytes(file.fileSize)}
      className="max-w-[560px]"
    >
      <div className="flex flex-col gap-4">
        {isImage ? (
          <img
            src={file.url}
            alt={file.fileName}
            className="w-full max-h-[380px] object-contain rounded-[4px] bg-bg-overlay"
          />
        ) : (
          <div className="w-full h-[160px] flex flex-col items-center justify-center gap-2 rounded-[4px] bg-bg-overlay">
            <FileText className="h-8 w-8 text-text-muted" />
            <span className="text-[12px] text-text-muted">
              Preview not available for this file type
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-danger-text hover:bg-danger-subtle mr-auto"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleOpen}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
          {onDownload && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
