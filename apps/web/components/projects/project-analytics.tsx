"use client";

import { useParams } from "next/navigation";

import { Avatar } from "@devflow/ui/components/avatar";
import { Badge } from "@devflow/ui/components/badge";

import {
  useProjectAnalytics,
  useRequireProjectAccess,
} from "../../hooks/use-projects";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_ORDER,
} from "../../lib/issue-constants";
import { displayName } from "../../lib/roles";
import { BarRow } from "../shared/bar-row";
import { BarTrack } from "../shared/bar-track";
import { PageContainer } from "../shared/page-container";
import {PageError} from "../shared/page-error";
import { PageHeading } from "../shared/page-heading";
import {PageLoading} from "../shared/page-loading";
import { PanelTitle } from "../shared/panel-title";
import { StatCard } from "../shared/stat-card";

export function ProjectAnalytics() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { project, isAllowed } = useRequireProjectAccess(
    workspaceSlug,
    projectSlug,
    "VIEW_PROJECT_ANALYTICS",
  );
  // only fetches once the role check passes, so a non-lead never sends the request
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useProjectAnalytics(isAllowed && project ? project.id : "");

  if (!project || !isAllowed || isLoading) return <PageLoading />;
  if (isError || !analytics) {
    return (
      <PageError message="Couldn't load analytics" onRetry={() => refetch()} />
    );
  }

  const totalIssues = Object.values(analytics.issuesByStatus).reduce(
    (a, b) => a + b,
    0,
  );
  const activeSprint = analytics.sprintVelocity.find(
    (s) => s.status === "ACTIVE",
  );
  const maxStatusCount = Math.max(
    ...Object.values(analytics.issuesByStatus),
    1,
  );
  const maxTypeCount = Math.max(...Object.values(analytics.issuesByType), 1);
  const maxAssigneeCount = Math.max(
    ...analytics.issuesByAssignee.map((a) => a.count),
    1,
  );

  return (
    <PageContainer className="mx-0">
      <PageHeading title="Analytics" description={project.name} />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Issues" value={totalIssues} />
        <StatCard
          label="In Progress"
          value={analytics.issuesByStatus.IN_PROGRESS}
        />
        <StatCard
          label="Overdue"
          value={analytics.overdueCount}
          tone={analytics.overdueCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Done This Sprint"
          value={activeSprint?.doneCount ?? "—"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
          <PanelTitle>Issues by Status</PanelTitle>
          <div className="flex flex-col gap-2">
            {STATUS_ORDER.map((status) => (
              <BarRow
                key={status}
                showDot={false}
                label={
                  <span className="w-24 shrink-0 text-xs text-text-secondary">
                    {STATUS_LABELS[status]}
                  </span>
                }
                value={analytics.issuesByStatus[status]}
                max={maxStatusCount}
                color={STATUS_COLORS[status]}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
          <PanelTitle>Issues by Type</PanelTitle>
          <div className="flex flex-col gap-2">
            {TYPE_ORDER.map((type) => (
              <BarRow
                key={type}
                label={
                  <span className="w-24 shrink-0 text-xs text-text-secondary">
                    {TYPE_LABELS[type]}
                  </span>
                }
                value={analytics.issuesByType[type]}
                max={maxTypeCount}
                color={TYPE_COLORS[type]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>Sprint Velocity</PanelTitle>
        {analytics.sprintVelocity.length === 0 ? (
          <p className="text-body text-text-muted">No sprints yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.sprintVelocity.map((sprint) => (
              <div key={sprint.sprintId} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-body text-text-primary">
                    {sprint.name}
                  </span>
                  {sprint.status === "ACTIVE" && (
                    <Badge variant="success">Active</Badge>
                  )}
                  <span className="ml-auto font-mono text-xs text-text-muted">
                    {sprint.doneCount} / {sprint.totalCount} —{" "}
                    {sprint.percentage}%
                  </span>
                </div>
                <BarTrack
                  percent={sprint.percentage}
                  fillClassName={
                    sprint.status === "ACTIVE" ? "bg-accent" : "bg-text-muted"
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>Issues by Assignee</PanelTitle>
        {analytics.issuesByAssignee.length === 0 ? (
          <p className="text-body text-text-muted">No assigned open issues</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.issuesByAssignee.map((assignee) => {
              const name = displayName(assignee.user ?? { name: "Unassigned" });
              return (
                <div
                  key={assignee.user?.id ?? "unassigned"}
                  className="flex items-center gap-3"
                >
                  <Avatar name={name} size="sm" />
                  <div className="flex w-36 shrink-0 flex-col">
                    <span className="text-body text-text-primary">{name}</span>
                    <span className="text-2xs text-text-muted">
                      {assignee.count} issues
                      {assignee.overdueCount > 0 && (
                        <span className="text-danger-text">
                          {" "}
                          · {assignee.overdueCount} overdue
                        </span>
                      )}
                    </span>
                  </div>
                  <BarTrack
                    percent={(assignee.count / maxAssigneeCount) * 100}
                    fillClassName="bg-accent"
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
