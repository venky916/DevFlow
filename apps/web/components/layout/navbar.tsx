"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  // build breadcrumb from pathname
  // /:workspaceSlug/:projectSlug/board
  const segments = pathname.split("/").filter(Boolean);
  const workspaceSlug = segments[0];
  const projectSlug = segments[1];

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <header className="h-[42px] w-full flex items-center justify-between px-4 bg-bg-sidebar border-b border-border-default shrink-0">
      {/* Left — logo + breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <Link
          href="/workspaces"
          className="font-semibold text-text-primary text-[14px] font-mono tracking-tight"
        >
          DevFlow
        </Link>
        {workspaceSlug && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-muted">{workspaceSlug}</span>
          </>
        )}
        {projectSlug && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">{projectSlug}</span>
          </>
        )}
      </div>

      {/* Right — search, bell, avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="text-text-muted hover:text-text-primary transition-colors">
          <Search className="h-4 w-4" />
        </button>

        {/* Bell */}
        <button className="relative text-text-muted hover:text-text-primary transition-colors">
          <Bell className="h-4 w-4" />
          {/* notification dot */}
          <span className="absolute -top-0.5 -right-0.5 h-[7px] w-[7px] rounded-full bg-accent" />
        </button>

        {/* Avatar */}
        <Link href="/profile">
          <div className="h-[26px] w-[26px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[10px] font-medium shrink-0">
            {user?.name
              ? getInitials(user.name)
              : (user?.email?.[0]?.toUpperCase() ?? "U")}
          </div>
        </Link>
      </div>
    </header>
  );
}
