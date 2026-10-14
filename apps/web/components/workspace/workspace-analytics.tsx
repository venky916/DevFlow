"use client";

import { useParams } from "next/navigation";
import { FolderKanban, ListTodo, Users, Zap } from "lucide-react";

import type { WorkspaceRole } from "@devflow/types";
import { Avatar } from "@devflow/ui/components/avatar";
import { DEFAULT_PROJECT_COLOR } from "@devflow/ui/components/color-picker";

import {
  useRequireWorkspaceRole,
  useWorkspaceAnalytics,
} from "../../hooks/use-workspaces";
import { displayName } from "../../lib/roles";
import { BarRow } from "../shared/bar-row";
import { PageContainer } from "../shared/page-container";
import {PageError} from "../shared/page-error";
import { PageHeading } from "../shared/page-heading";
import {PageLoading} from "../shared/page-loading";
import { RoleBadge } from "../shared/role-badge";
import { StatCard } from "../shared/stat-card";
import { PanelTitle } from "../shared/panel-title";

const ROLES: WorkspaceRole[] = ["ADMIN", "MEMBER"];

// Theme tokens, not hex. Values are CSS variables, so they work in inline style.
const ROLE_COLORS: Record<WorkspaceRole, string> = {
  ADMIN: "var(--color-danger-text)",
  MEMBER: "var(--color-info-text)",
};

const MEMBER_PREVIEW_LIMIT = 6;


export function WorkspaceAnalytics() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspace, isAllowed } = useRequireWorkspaceRole(
    workspaceSlug,
    "VIEW_WORKSPACE_ANALYTICS",
  );
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useWorkspaceAnalytics(isAllowed && workspace ? workspace.id : "");

  if (!workspace || !isAllowed || isLoading) return <PageLoading />;
  if (isError || !analytics) {
    return (
      <PageError message="Couldn't load analytics" onRetry={() => refetch()} />
    );
  }

  const maxProjectCount = Math.max(
    ...analytics.issuesByProject.map((p) => p.count),
    1,
  );
  const maxRoleCount = Math.max(...Object.values(analytics.roleBreakdown), 1);

  return (
    <PageContainer className="mx-0">
      <PageHeading title="Analytics" description={workspace.name} />

      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Projects"
          value={analytics.issuesByProject.length}
          icon={FolderKanban}
        />
        <StatCard
          label="Active Sprints"
          value={analytics.activeSprintsCount}
          icon={Zap}
        />
        <StatCard
          label="Total Issues"
          value={analytics.totalIssues}
          icon={ListTodo}
        />
        <StatCard label="Members" value={analytics.memberCount} icon={Users} />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>Issues by Project</PanelTitle>
        {analytics.issuesByProject.length === 0 ? (
          <p className="text-body text-text-muted">No projects yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {analytics.issuesByProject.map(({ project, count }) => (
              <BarRow
                key={project.id}
                label={
                  <span className="w-32 shrink-0 truncate text-xs text-text-secondary">
                    {project.name}
                  </span>
                }
                value={count}
                max={maxProjectCount}
                color={project.color ?? DEFAULT_PROJECT_COLOR}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
          <PanelTitle>
            Members{" "}
            <span className="text-text-disabled">
              ({analytics.members.length})
            </span>
          </PanelTitle>
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {analytics.members.slice(0, MEMBER_PREVIEW_LIMIT).map((member) => (
              <div
                key={member.user.id}
                className="flex items-center justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={displayName(member.user)} size="sm" />
                  <span className="truncate text-body text-text-primary">
                    {displayName(member.user)}
                  </span>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}
            {analytics.members.length > MEMBER_PREVIEW_LIMIT && (
              <p className="text-2xs text-text-muted">
                +{analytics.members.length - MEMBER_PREVIEW_LIMIT} more members
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
          <PanelTitle>Role Breakdown</PanelTitle>
          <div className="flex flex-col gap-2">
            {ROLES.map((role) => (
              <BarRow
                key={role}
                label={<RoleBadge role={role} />}
                value={analytics.roleBreakdown[role]}
                max={maxRoleCount}
                color={ROLE_COLORS[role]}
              />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
