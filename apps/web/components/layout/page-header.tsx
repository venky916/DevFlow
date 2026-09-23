"use client";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ArrowLeft, Menu, Search } from "lucide-react";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useUIStore } from "../../stores/ui.store";

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
  workspaces: "Workspaces",
  analytics: "Analytics",
};

interface PageHeaderProps {
  pageTitle?: string;
}

export function PageHeader({ pageTitle }: PageHeaderProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();
  const pathname = usePathname();
  const router = useRouter();
  const toggleMobileDrawer = useUIStore((s) => s.toggleMobileDrawer);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects } = useProjects(currentWorkspace?.id ?? "");
  const currentProject = projects?.find((p) => p.slug === projectSlug);

  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const onIssueDetailRoute = segments[segments.length - 2] === "issues";
  const page =
    pageTitle ??
    (onIssueDetailRoute && from
      ? (PAGE_LABELS[from] ?? null)
      : lastSegment !== projectSlug && lastSegment !== workspaceSlug
        ? (PAGE_LABELS[lastSegment as string] ?? null)
        : null);

  const crumbs = [
    workspaceSlug ? (currentWorkspace?.name ?? workspaceSlug) : null,
    projectSlug ? (currentProject?.name ?? projectSlug) : null,
    page,
  ].filter(Boolean) as string[];

  const backTarget =
    onIssueDetailRoute && from
      ? from === "my-issues"
        ? "/my-issues"
        : `/${workspaceSlug}/${projectSlug}/${from}`
      : "/" + segments.slice(0, -1).join("/");

  const showBack = segments.length > 1;

  return (
    <div className="flex items-center justify-between px-5 h-[38px] border-b border-border-default shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMobileDrawer}
          className="min-[1025px]:hidden text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
        {showBack && (
          <button
            onClick={() => router.push(backTarget)}
            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-[12px] font-mono">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-muted">/</span>}
              <span
                className={
                  i === crumbs.length - 1
                    ? "text-text-secondary"
                    : "text-text-muted"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

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
