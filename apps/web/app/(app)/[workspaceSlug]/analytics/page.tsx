"use client";

import { useParams } from "next/navigation";
import { Zap, FolderKanban, ListTodo, Users } from "lucide-react";
import { Spinner } from "@devflow/ui/components/spinner";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { useWorkspaces } from "../../../../hooks/use-workspaces";
import { useWorkspaceAnalytics } from "../../../../hooks/use-analytics";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#E24B4A",
  DEVELOPER: "#4B8BE2",
  VIEWER: "#777777",
};

export default function WorkspaceAnalyticsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const { data: analytics, isLoading } = useWorkspaceAnalytics(
    workspace?.id ?? "",
  );

  if (wsLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!workspace || !analytics) return null;

  const maxProjectCount = Math.max(
    ...analytics.issuesByProject.map((p) => p.count),
    1,
  );
  const maxRoleCount = Math.max(...Object.values(analytics.roleBreakdown), 1);

  return (
    <div className="p-8 max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          Analytics
        </h1>
        <p className="text-[13px] text-text-muted">{workspace.name}</p>
      </div>

      {/* same 4-stat pattern as project analytics — Projects/ActiveSprints/TotalIssues/Members */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Projects",
            value: analytics.issuesByProject.length,
            icon: FolderKanban,
          },
          {
            label: "Active Sprints",
            value: analytics.activeSprintsCount,
            icon: Zap,
          },
          {
            label: "Total Issues",
            value: analytics.totalIssues,
            icon: ListTodo,
          },
          { label: "Members", value: analytics.memberCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[6px] border border-border-default p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
                {label}
              </p>
            </div>
            <p className="text-[24px] font-semibold text-text-primary">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* issues by project — one bar per project, longest project name gets a fixed
          label column so bars stay aligned regardless of name length */}
      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Issues by Project
        </p>
        {analytics.issuesByProject.length === 0 ? (
          <p className="text-[13px] text-text-muted">No projects yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {analytics.issuesByProject.map(({ project, count }) => (
              <div key={project.id} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-[12px] text-text-secondary w-[130px] shrink-0 truncate">
                  {project.name}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxProjectCount) * 100}%`,
                      backgroundColor: project.color,
                    }}
                  />
                </div>
                <span className="text-[12px] font-mono text-text-muted w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* members list — reuses the same joinedAt/avatar shape you already
            show on the workspace Settings > Members tab */}
        <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
            Members{" "}
            <span className="text-text-disabled">
              ({analytics.members.length})
            </span>
          </p>
          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
            {analytics.members.slice(0, 6).map((m) => (
              <div
                key={m.user.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={m.user.name ?? m.user.email} size="sm" />
                  <span className="text-[13px] text-text-primary truncate">
                    {m.user.name ?? m.user.email}
                  </span>
                </div>
                <Badge variant={m.role === "ADMIN" ? "danger" : "neutral"}>
                  {ROLE_LABELS[m.role]}
                </Badge>
              </div>
            ))}
            {analytics.members.length > 6 && (
              <p className="text-[11px] text-text-muted">
                +{analytics.members.length - 6} more members
              </p>
            )}
          </div>
        </div>

        {/* role breakdown — small bar-per-role, same visual language as
            issues-by-type on the project analytics page */}
        <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
            Role Breakdown
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(analytics.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: ROLE_COLORS[role] }}
                />
                <span className="text-[12px] text-text-secondary w-[80px] shrink-0">
                  {ROLE_LABELS[role]}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxRoleCount) * 100}%`,
                      backgroundColor: ROLE_COLORS[role],
                    }}
                  />
                </div>
                <span className="text-[12px] font-mono text-text-muted w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
