"use client";

import { useParams } from "next/navigation";
import { Spinner } from "@devflow/ui/components/spinner";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { useProjects } from "../../../../../hooks/use-projects";
import { useWorkspaces } from "../../../../../hooks/use-workspaces";
import { useProjectAnalytics } from "../../../../../hooks/use-analytics";

const STATUS_ORDER = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const;
const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};
const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#555555",
  TODO: "#4B8BE2",
  IN_PROGRESS: "#EF9F27",
  IN_REVIEW: "#8B5CF6",
  DONE: "#22C55E",
};
const TYPE_COLORS: Record<string, string> = {
  BUG: "#E24B4A",
  FEATURE: "#8B5CF6",
  TASK: "#4B8BE2",
  IMPROVEMENT: "#EF9F27",
  OTHER: "#777777",
};
const TYPE_LABELS: Record<string, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  TASK: "Task",
  IMPROVEMENT: "Improvement",
  OTHER: "Other",
};

export default function ProjectAnalyticsPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects, isLoading: listLoading } = useProjects(
    currentWorkspace?.id ?? "",
  );
  const project = projects?.find((p) => p.slug === projectSlug);

  const { data: analytics, isLoading } = useProjectAnalytics(project?.id ?? "");

  if (listLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!project || !analytics) return null;

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
    <div className="p-8 max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          Analytics
        </h1>
        <p className="text-[13px] text-text-muted">{project.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Issues", value: totalIssues },
          { label: "In Progress", value: analytics.issuesByStatus.IN_PROGRESS },
          {
            label: "Overdue",
            value: analytics.overdueCount,
            danger: analytics.overdueCount > 0,
          },
          { label: "Done This Sprint", value: activeSprint?.doneCount ?? "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[6px] border border-border-default p-4"
          >
            <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-2">
              {stat.label}
            </p>
            <p
              className={`text-[24px] font-semibold ${stat.danger ? "text-status-danger-text" : "text-text-primary"}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
            Issues by Status
          </p>
          <div className="flex flex-col gap-2">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-[12px] text-text-secondary w-[90px] shrink-0">
                  {STATUS_LABELS[status]}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(analytics.issuesByStatus[status] / maxStatusCount) * 100}%`,
                      backgroundColor: STATUS_COLORS[status],
                    }}
                  />
                </div>
                <span className="text-[12px] font-mono text-text-muted w-6 text-right">
                  {analytics.issuesByStatus[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
            Issues by Type
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(analytics.issuesByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                />
                <span className="text-[12px] text-text-secondary w-[90px] shrink-0">
                  {TYPE_LABELS[type]}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxTypeCount) * 100}%`,
                      backgroundColor: TYPE_COLORS[type],
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

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Sprint Velocity
        </p>
        {analytics.sprintVelocity.length === 0 ? (
          <p className="text-[13px] text-text-muted">No sprints yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.sprintVelocity.map((s) => (
              <div key={s.sprintId} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-primary">
                    {s.name}
                  </span>
                  {s.status === "ACTIVE" && (
                    <Badge variant="success">Active</Badge>
                  )}
                  <span className="ml-auto text-[12px] font-mono text-text-muted">
                    {s.doneCount} / {s.totalCount} — {s.percentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${s.status === "ACTIVE" ? "bg-accent" : "bg-text-muted"}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[6px] border border-border-default p-4 flex flex-col gap-3">
        <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono">
          Issues by Assignee
        </p>
        {analytics.issuesByAssignee.length === 0 ? (
          <p className="text-[13px] text-text-muted">No assigned open issues</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.issuesByAssignee.map((a) => (
              <div
                key={a.user?.id ?? "unknown"}
                className="flex items-center gap-3"
              >
                <Avatar name={a.user?.name ?? "?"} size="sm" />
                <div className="flex flex-col shrink-0 w-[140px]">
                  <span className="text-[13px] text-text-primary">
                    {a.user?.name ?? "Unknown"}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {a.count} issues
                    {a.overdueCount > 0 && (
                      <span className="text-status-danger-text">
                        {" "}
                        · {a.overdueCount} overdue
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(a.count / maxAssigneeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
