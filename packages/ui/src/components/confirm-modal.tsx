"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./button";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  isLoading = false,
  variant = "danger",
}: ConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* no onClick on backdrop — intentional */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-[500px] rounded-[4px] border border-border-emphasis bg-bg-surface p-6 shadow-2xl">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              variant === "danger" ? "bg-danger-text/10" : "bg-warning/10",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                variant === "danger" ? "text-danger-text" : "text-warning",
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-[14px] font-medium text-text-primary">
              {title}
            </h2>
            <p className="text-[13px] text-text-muted leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                  />
                </svg>
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
