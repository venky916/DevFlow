"use client";

import { useParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";

const PAGE_LABELS: Record<string, string> = {
  board: "Board",
  backlog: "Backlog",
  sprints: "Sprints",
  settings: "Settings",
  members: "Members",
  notifications: "Notifications",
  profile: "Profile",
  "my-issues": "My Issues",
  inbox: "Inbox",
};

interface PageHeaderProps {
  pageTitle?: string;
}

export function PageHeader({ pageTitle }: PageHeaderProps) {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();
  const pathname = usePathname();

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects } = useProjects(currentWorkspace?.id ?? "");
  const currentProject = projects?.find((p) => p.slug === projectSlug);

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const page =
    pageTitle ??
    (lastSegment !== projectSlug && lastSegment !== workspaceSlug
      ? (PAGE_LABELS[lastSegment as string] ?? null)
      : null);

  return (
    <div className="flex items-center justify-between px-5 h-[38px] border-b border-border-default shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[12px] font-mono">
        {workspaceSlug && (
          <span className="text-text-muted">
            {currentWorkspace?.name ?? workspaceSlug}
          </span>
        )}
        {projectSlug && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-muted">
              {currentProject?.name ?? projectSlug}
            </span>
          </>
        )}
        {page && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">{page}</span>
          </>
        )}
      </div>

      {/* Search / CMD+K */}
      <button
        className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            }),
          );
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-[11px] font-mono border border-border-default rounded-[3px] px-1.5 py-0.5">
          ⌘K
        </span>
      </button>
    </div>
  );
}
