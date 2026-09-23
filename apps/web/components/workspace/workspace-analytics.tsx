"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Zap, FolderKanban, ListTodo, Users } from "lucide-react";
import { Avatar } from "@devflow/ui/components/avatar";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useWorkspaceAnalytics } from "../../hooks/use-analytics";
import { usePermissions } from "../../hooks/use-permissions";
import { canWorkspace } from "../../lib/permissions";
import { RoleBadge } from "../shared/role-badge";
import { displayName } from "../../lib/roles";
import PageLoading from "../shared/page-loading";
import PageError from "../shared/page-error";

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#E24B4A",
  MEMBER: "#4B8BE2",
};

export function WorkspaceAnalytics() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useWorkspaceAnalytics(workspace?.id ?? "");

  const { workspaceRole, isLoading: permLoading } = usePermissions();
  const isAdmin = canWorkspace(workspaceRole, "VIEW_WORKSPACE_ANALYTICS");

  useEffect(() => {
    if (wsLoading || permLoading || !workspace) return;
    if (!isAdmin) {
      router.replace(
        `/no-access?reason=insufficient-role&workspace=${workspaceSlug}`,
      );
    }
  }, [wsLoading, permLoading, isAdmin, workspace, router, workspaceSlug]);

  if (wsLoading || analyticsLoading || permLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return (
      <PageError
        message="Couldn't load workspace"
        onRetry={() => refetchWorkspaces()}
      />
    );
  }

  if (analyticsError) {
    return (
      <PageError
        message="Couldn't load analytics"
        onRetry={() => refetchAnalytics()}
      />
    );
  }

  if (!workspace || !analytics || !isAdmin) {
    return <PageLoading />;
  }

  const maxProjectCount = Math.max(
    ...analytics.issuesByProject.map((p) => p.count),
    1,
  );
  const maxRoleCount = Math.max(...Object.values(analytics.roleBreakdown), 1);

  return (
    <div className="px-8 py-6 max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          Analytics
        </h1>
        <p className="text-[13px] text-text-muted">{workspace.name}</p>
      </div>

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
                  <Avatar name={displayName(m.user)} size="sm" />
                  <span className="text-[13px] text-text-primary truncate">
                    {displayName(m.user)}
                  </span>
                </div>
                <RoleBadge role={m.role as "ADMIN" | "MEMBER"} />
              </div>
            ))}
            {analytics.members.length > 6 && (
              <p className="text-[11px] text-text-muted">
                +{analytics.members.length - 6} more members
              </p>
            )}
          </div>
        </div>

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
                <RoleBadge role={role as "ADMIN" | "MEMBER"} />
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
