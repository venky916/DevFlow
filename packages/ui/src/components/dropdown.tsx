"use client";

import { useRef, useEffect } from "react";
import { cn } from "../lib/cn";

// ─── DropdownMenu ─────────────────────────────────────────────────
export function DropdownMenu({
  open,
  onClose,
  anchor = "bottom",
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor?: "bottom" | "top";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-2 z-50 w-[184px] bg-bg-surface border border-border-default rounded-[4px] py-1 shadow-lg",
        anchor === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
      )}
    >
      {children}
    </div>
  );
}

// ─── DropdownItem ─────────────────────────────────────────────────
export function DropdownItem({
  onClick,
  icon: Icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-1.5 text-[13px] transition-colors",
        danger
          ? "text-danger-text hover:bg-bg-hover"
          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}

// ─── DropdownDivider ──────────────────────────────────────────────
export function DropdownDivider() {
  return <div className="h-px bg-border-default mx-2 my-1" />;
}

// ─── DropdownLabel ────────────────────────────────────────────────
export function DropdownLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] text-text-muted uppercase tracking-[0.06em] font-mono px-3 py-1.5">
      {label}
    </p>
  );
}
