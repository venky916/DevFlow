'use client';

import { useParams } from 'next/navigation';

import { Avatar } from '@devflow/ui/components/avatar';
import { Badge } from '@devflow/ui/components/badge';
import { Button } from '@devflow/ui/components/button';
import { DEFAULT_PROJECT_COLOR } from '@devflow/ui/components/color-picker';
import { Spinner } from '@devflow/ui/components/spinner';

import { useProjectActivities, useProjectById, useProjectBySlug } from '../../hooks/use-projects';
import { formatTimeAgo } from '../../lib/format-date';
import { displayName } from '../../lib/roles';
import { BarTrack } from '../shared/bar-track';
import { PageContainer } from '../shared/page-container';
import { PageError } from '../shared/page-error';
import { PageHeading } from '../shared/page-heading';
import { PageLoading } from '../shared/page-loading';
import { PanelTitle } from '../shared/panel-title';
import { RoleBadge } from '../shared/role-badge';
import { StatCard } from '../shared/stat-card';

export function ProjectOverview() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  // already cached by ProjectAccessGuard, so this makes no request
  const { data: summary } = useProjectBySlug(workspaceSlug, projectSlug);
  const projectId = summary?.id ?? '';

  const { data: project, isLoading, isError, refetch } = useProjectById(projectId);
  const feed = useProjectActivities(projectId);

  if (!summary || isLoading) return <PageLoading />;
  if (isError || !project) {
    return <PageError message="Couldn't load project" onRetry={() => refetch()} />;
  }

  const color = project.color ?? DEFAULT_PROJECT_COLOR;
  const activeSprint = project.sprints.find((s) => s.status === 'ACTIVE');
  const sprintProgress =
    activeSprint && activeSprint._count.issues > 0
      ? (activeSprint.issues.length / activeSprint._count.issues) * 100
      : 0;

  return (
    <PageContainer size="medium" className="mx-0">
      <PageHeading title={project.name} description={project.description ?? undefined} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Issues" value={project._count.issues} />
        <StatCard label="Sprints" value={project._count.sprints} />
        <StatCard label="Members" value={project._count.members} />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>About</PanelTitle>
        <div className="flex flex-col gap-2 text-body">
          <div className="flex justify-between">
            <span className="text-text-muted">Description</span>
            <span className="max-w-3/5 text-right text-text-primary">
              {project.description ?? 'No description'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Color</span>
            <span className="flex items-center gap-1.5 text-text-primary">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
              {color}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Created</span>
            <span className="text-text-primary">{formatTimeAgo(project.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>Active Sprint</PanelTitle>
        {activeSprint ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-body font-medium text-text-primary">{activeSprint.name}</span>
              <Badge variant="success">Active</Badge>
            </div>
            <BarTrack percent={sprintProgress} fillClassName="bg-accent" className="w-full" />
            <span className="text-2xs text-text-muted">
              {activeSprint.issues.length} / {activeSprint._count.issues} issues done
            </span>
          </div>
        ) : (
          <p className="text-body text-text-muted">No active sprint</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>
          Members <span className="text-text-disabled">({project.members.length})</span>
        </PanelTitle>
        <div className="flex flex-col gap-2">
          {project.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={displayName(member.user)} size="sm" />
                <div className="flex flex-col">
                  <span className="text-body text-text-primary">{displayName(member.user)}</span>
                  <span className="text-2xs text-text-muted">{member.user.email}</span>
                </div>
              </div>
              <RoleBadge role={member.isWorkspaceAdmin ? 'ADMIN' : member.role} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
        <PanelTitle>Recent Activity</PanelTitle>
        {feed.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : feed.isError ? (
          <PageError message="Couldn't load activity" onRetry={() => feed.refetch()} />
        ) : feed.activities.length === 0 ? (
          <p className="text-body text-text-muted">No activity yet</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {feed.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-2">
                <Avatar name={activity.user?.name ?? '?'} size="sm" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {activity.user?.name ?? 'Someone'}
                    </span>{' '}
                    {activity.action.toLowerCase().replace(/_/g, ' ')}
                    {activity.issue && (
                      <span className="text-text-muted"> on {activity.issue.title}</span>
                    )}
                  </p>
                  <span className="text-2xs text-text-muted">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            {feed.hasMore && (
              <Button
                variant="ghost"
                size="sm"
                loading={feed.isLoadingMore}
                onClick={feed.loadMore}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
