'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Avatar } from '@devflow/ui/components/avatar';
import { Badge } from '@devflow/ui/components/badge';

import { useProjectAnalytics } from '../../hooks/use-analytics';
import { usePermissions } from '../../hooks/use-permissions';
import { useProjects } from '../../hooks/use-projects';
import { useWorkspaces } from '../../hooks/use-workspaces';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_COLORS,
  TYPE_LABELS,
} from '../../lib/issue-constants';
import { canProject } from '../../lib/permissions';
import { displayName } from '../../lib/roles';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';

export function ProjectAnalytics() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const router = useRouter();

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  const {
    data: projects,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchProjects,
  } = useProjects(currentWorkspace?.id ?? '');
  const project = projects?.find((p) => p.slug === projectSlug);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useProjectAnalytics(project?.id ?? '');

  const { access, isLoading: permLoading } = usePermissions();
  const canAccessAnalytics = canProject(access, 'VIEW_PROJECT_ANALYTICS');

  useEffect(() => {
    if (wsLoading || listLoading || permLoading || !project) return;
    if (!canAccessAnalytics) {
      router.replace(`/no-access?reason=insufficient-role&workspace=${workspaceSlug}`);
    }
  }, [wsLoading, listLoading, permLoading, canAccessAnalytics, project, router, workspaceSlug]);

  if (wsLoading || listLoading || analyticsLoading || permLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return <PageError message="Couldn't load workspace" onRetry={() => refetchWorkspaces()} />;
  }

  if (listError) {
    return <PageError message="Couldn't load projects" onRetry={() => refetchProjects()} />;
  }

  if (analyticsError) {
    return <PageError message="Couldn't load analytics" onRetry={() => refetchAnalytics()} />;
  }

  if (!project || !analytics || !canAccessAnalytics) {
    return <PageLoading />;
  }

  const totalIssues = Object.values(analytics.issuesByStatus).reduce((a, b) => a + b, 0);
  const activeSprint = analytics.sprintVelocity.find((s) => s.status === 'ACTIVE');
  const maxStatusCount = Math.max(...Object.values(analytics.issuesByStatus), 1);
  const maxTypeCount = Math.max(...Object.values(analytics.issuesByType), 1);
  const maxAssigneeCount = Math.max(...analytics.issuesByAssignee.map((a) => a.count), 1);

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="mb-1 text-[18px] font-semibold text-text-primary">Analytics</h1>
        <p className="text-[13px] text-text-muted">{project.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Issues', value: totalIssues },
          { label: 'In Progress', value: analytics.issuesByStatus.IN_PROGRESS },
          {
            label: 'Overdue',
            value: analytics.overdueCount,
            danger: analytics.overdueCount > 0,
          },
          { label: 'Done This Sprint', value: activeSprint?.doneCount ?? '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[6px] border border-border-default p-4">
            <p className="mb-2 font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
              {stat.label}
            </p>
            <p
              className={`text-[24px] font-semibold ${stat.danger ? 'text-status-danger-text' : 'text-text-primary'}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
          <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Issues by Status
          </p>
          <div className="flex flex-col gap-2">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-[90px] shrink-0 text-[12px] text-text-secondary">
                  {STATUS_LABELS[status]}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(analytics.issuesByStatus[status] / maxStatusCount) * 100}%`,
                      backgroundColor: STATUS_COLORS[status],
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[12px] text-text-muted">
                  {analytics.issuesByStatus[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
          <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Issues by Type
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(analytics.issuesByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: TYPE_COLORS[type as keyof typeof TYPE_COLORS],
                  }}
                />
                <span className="w-[90px] shrink-0 text-[12px] text-text-secondary">
                  {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxTypeCount) * 100}%`,
                      backgroundColor: TYPE_COLORS[type as keyof typeof TYPE_COLORS],
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[12px] text-text-muted">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
        <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
          Sprint Velocity
        </p>
        {analytics.sprintVelocity.length === 0 ? (
          <p className="text-[13px] text-text-muted">No sprints yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.sprintVelocity.map((s) => (
              <div key={s.sprintId} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-primary">{s.name}</span>
                  {s.status === 'ACTIVE' && <Badge variant="success">Active</Badge>}
                  <span className="ml-auto font-mono text-[12px] text-text-muted">
                    {s.doneCount} / {s.totalCount} — {s.percentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-surface">
                  <div
                    className={`h-full rounded-full transition-all ${s.status === 'ACTIVE' ? 'bg-accent' : 'bg-text-muted'}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
        <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
          Issues by Assignee
        </p>
        {analytics.issuesByAssignee.length === 0 ? (
          <p className="text-[13px] text-text-muted">No assigned open issues</p>
        ) : (
          <div className="flex flex-col gap-3">
            {analytics.issuesByAssignee.map((a) => (
              <div key={a.user?.id ?? 'unknown'} className="flex items-center gap-3">
                <Avatar name={displayName(a?.user || { name: 'Unassigned' })} size="sm" />
                <div className="flex w-[140px] shrink-0 flex-col">
                  <span className="text-[13px] text-text-primary">
                    {displayName(a?.user || { name: 'Unassigned' })}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {a.count} issues
                    {a.overdueCount > 0 && (
                      <span className="text-status-danger-text"> · {a.overdueCount} overdue</span>
                    )}
                  </span>
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
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
