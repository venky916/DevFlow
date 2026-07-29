"use client";

import { useRef } from "react";
import { Loader2, Pencil } from "lucide-react";
import { cn } from "../lib/cn";

interface ImageUploadButtonProps {
  src: string | null;
  fallbackLabel: string;
  shape?: "circle" | "square";
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
  shape = "circle",
  size = 40,
  isUploading = false,
  disabled = false,
  onFileSelect,
  accept = "image/*",
  className,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-[6px]";

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
        type="button"
        onClick={() => !disabled && inputRef.current?.click()}
        className="relative shrink-0"
        disabled={disabled || isUploading}
        style={{ width: size, height: size }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className={cn(
              "w-full h-full object-cover border border-border-default",
              shapeClass,
            )}
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center bg-bg-surface border border-border-default text-text-muted font-medium",
              shapeClass,
            )}
            style={{ fontSize: size * 0.35 }}
          >
            {fallbackLabel}
          </div>
        )}
        {!disabled && (
          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-bg-surface border border-border-default flex items-center justify-center">
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
