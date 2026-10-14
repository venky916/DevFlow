"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { cn } from "@devflow/ui/lib/cn";

import { ROUTES } from "../../constants/routes";
import { useUIStore } from "../../stores/ui.store";
import { Logo } from "../shared/logo";
import { SidebarContent } from "./sidebar-content";

export function MobileSidebar() {
  const mobileDrawerOpen = useUIStore((state) => state.mobileDrawerOpen);
  const closeMobileDrawer = useUIStore((state) => state.closeMobileDrawer);

  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileDrawer();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileDrawerOpen, closeMobileDrawer]);

  return (
    <div className="min-[1025px]:hidden">
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={closeMobileDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border-default bg-bg-sidebar transition-transform duration-200 ease-out",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-default pr-2">
          <Link
            href={ROUTES.workspaces}
            onClick={closeMobileDrawer}
            className="flex h-9.5 items-center px-4"
          >
            <Logo size="sm" />
          </Link>

          <button
            type="button"
            onClick={closeMobileDrawer}
            className="p-1 text-text-muted hover:text-text-primary"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SidebarContent onNavigate={closeMobileDrawer} />
        </div>
      </aside>
    </div>
  );
}
