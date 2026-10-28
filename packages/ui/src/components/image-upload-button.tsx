'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useRef } from 'react';

import { cn } from '../lib/cn';

interface ImageUploadButtonProps {
  src: string | null;
  fallbackLabel: string;
  shape?: 'circle' | 'square';
  size?: number;
  isUploading?: boolean;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
}

export function ImageUploadButton({
  src,
  fallbackLabel,
  shape = 'circle',
  size = 40,
  isUploading = false,
  disabled = false,
  onFileSelect,
  accept = 'image/*',
  className,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-[6px]';

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => !disabled && inputRef.current?.click()}
        className="relative shrink-0"
        disabled={disabled || isUploading}
        style={{ width: size, height: size }}
        type="button"
      >
        {src ? (
          <img
            src={src}
            alt=""
            className={cn('h-full w-full border border-border-default object-cover', shapeClass)}
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center border border-border-default bg-bg-surface font-medium text-text-muted',
              shapeClass,
            )}
            style={{ fontSize: size * 0.35 }}
          >
            {fallbackLabel}
          </div>
        )}
        {!disabled && (
          <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border-default bg-bg-surface">
            {isUploading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin text-text-muted" />
            ) : (
              <Pencil className="h-2.5 w-2.5 text-text-muted" />
            )}
          </span>
        )}
      </button>
    </div>
  );
}
