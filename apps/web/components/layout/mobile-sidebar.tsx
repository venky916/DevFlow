"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { SidebarContent } from "./sidebar-content";

export function MobileSidebar() {
  const router = useRouter();

  const mobileDrawerOpen = useUIStore((state) => state.mobileDrawerOpen);

  const closeMobileDrawer = useUIStore((state) => state.closeMobileDrawer);

  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileDrawer();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileDrawerOpen, closeMobileDrawer]);

  return (
    <div className="min-[1025px]:hidden">
      {/* Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={closeMobileDrawer}
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          w-[240px]
          bg-bg-sidebar
          border-r
          border-border-default
          flex
          flex-col
          transition-transform
          duration-200
          ease-out
          ${mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default shrink-0 pr-2">
          <button
            onClick={() => {
              closeMobileDrawer();
              router.push("/workspaces");
            }}
            className="flex items-center gap-2 px-4 h-[38px]"
          >
            <div className="h-[20px] w-[20px] rounded-[4px] bg-accent flex items-center justify-center shrink-0">
              <Zap className="h-3 w-3 text-bg-app" />
            </div>

            <span className="text-[13px] font-semibold text-text-primary tracking-tight">
              DevFlow
            </span>
          </button>

          <button
            onClick={closeMobileDrawer}
            className="text-text-muted hover:text-text-primary p-1"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <SidebarContent onNavigate={closeMobileDrawer} />
        </div>
      </aside>
    </div>
  );
}
