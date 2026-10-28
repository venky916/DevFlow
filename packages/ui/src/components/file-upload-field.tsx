'use client';

import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { useRef } from 'react';

import type { UploadedFileInfo } from '@devflow/types';

import { cn } from '../lib/cn';

interface FileUploadFieldProps {
  file: UploadedFileInfo | null;
  status: 'idle' | 'uploading' | 'done' | 'error';
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
    e.target.value = '';
  };

  if (status === 'idle' && !file) {
    return (
      <div className={cn('w-full', className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-[4px] border border-dashed border-border-emphasis bg-bg-surface py-6 transition-colors hover:border-border-strong hover:bg-bg-hover"
        >
          <Upload className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] text-text-secondary">Click to upload</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-[4px] border bg-bg-surface p-2.5',
        status === 'error' ? 'border-danger-text' : 'border-border-default',
        status === 'done' && onPreview && 'cursor-pointer hover:border-border-strong',
        className,
      )}
      onClick={status === 'done' ? onPreview : undefined}
      title={status === 'error' ? (errorMessage ?? 'Upload failed') : file?.fileName}
    >
      {status !== 'uploading' && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg-overlay text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger-text"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {file?.mimeType.startsWith('image/') && file.url ? (
        <img
          src={file.url}
          alt={file.fileName}
          className="h-9 w-9 shrink-0 rounded-[4px] object-cover"
        />
      ) : status === 'error' ? (
        <AlertCircle className="h-5 w-5 shrink-0 text-danger-text" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-bg-overlay">
          <FileText className="h-4 w-4 text-text-muted" />
        </div>
      )}

      <p className="w-full truncate px-1 text-center text-[11px] text-text-primary">
        {file?.fileName}
      </p>

      {status === 'uploading' ? (
        <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-bg-overlay">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : (
        file && (
          <span className="font-mono text-[10px] text-text-muted">
            {formatBytes(file.fileSize)}
          </span>
        )
      )}

      {status === 'uploading' && (
        <Loader2 className="absolute top-1 right-1 h-3.5 w-3.5 animate-spin text-text-muted" />
      )}
    </div>
  );
}
