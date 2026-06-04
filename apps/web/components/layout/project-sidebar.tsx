"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutGrid, List, Zap, Users, Settings } from "lucide-react";
import { cn } from "@devflow/ui/lib/cn";

const PROJECT_NAV = [
  { label: "Board", href: "/board", icon: LayoutGrid },
  { label: "Backlog", href: "/backlog", icon: List },
  { label: "Sprints", href: "/sprints", icon: Zap },
  { label: "Members", href: "/members", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function ProjectSidebar() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const pathname = usePathname();
  const base = `/${workspaceSlug}/${projectSlug}`;

  return (
    <aside className="w-[200px] h-full bg-bg-sidebar border-r border-border-default flex flex-col shrink-0">
      {/* Workspace link at top */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border-default">
        <Link
          href={`/${workspaceSlug}`}
          className="flex items-center gap-2 w-full group"
        >
          <div className="h-[22px] w-[22px] rounded-[5px] bg-accent-subtle flex items-center justify-center shrink-0">
            <span className="text-accent text-[11px] font-bold font-mono">
              {workspaceSlug?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-[12px] font-medium text-text-muted group-hover:text-text-primary transition-colors truncate">
            {workspaceSlug}
          </span>
        </Link>
      </div>

      {/* Project name */}
      <div className="px-3 py-2 border-b border-border-default">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.04em] font-mono mb-1">
          Project
        </p>
        <p className="text-[13px] font-medium text-text-primary truncate">
          {projectSlug}
        </p>
      </div>

      {/* Project nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {PROJECT_NAV.map(({ label, href, icon: Icon }) => {
          const to = `${base}${href}`;
          const isActive = pathname.startsWith(to);

          return (
            <Link
              key={label}
              href={to}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[13px] transition-colors",
                isActive
                  ? "bg-bg-active text-text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text-primary",
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
