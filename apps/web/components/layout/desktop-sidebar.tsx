"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { SidebarContent } from "./sidebar-content";

export function DesktopSidebar() {
  const router = useRouter();

  return (
    <aside
      className="
        hidden
        min-[1025px]:flex
        w-[200px]
        min-w-[200px]
        h-full
        bg-bg-sidebar
        border-r
        border-border-default
        flex-col
        shrink-0
      "
    >
      <div className="flex items-center border-b border-border-default shrink-0">
        <button
          onClick={() => router.push("/workspaces")}
          className="flex items-center gap-2 px-4 h-[38px]"
        >
          <div className="h-[20px] w-[20px] rounded-[4px] bg-accent flex items-center justify-center shrink-0">
            <Zap className="h-3 w-3 text-bg-app" />
          </div>

          <span className="text-[13px] font-semibold text-text-primary tracking-tight">
            DevFlow
          </span>
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <SidebarContent />
      </div>
    </aside>
  );
}
