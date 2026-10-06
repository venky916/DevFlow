'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FolderKanban, ListTodo, Users, Zap } from 'lucide-react';

import { Avatar } from '@devflow/ui/components/avatar';

import { useWorkspaceAnalytics } from '../../hooks/use-analytics';
import { usePermissions } from '../../hooks/use-permissions';
import { useWorkspaces } from '../../hooks/use-workspaces';
import { canWorkspace } from '../../lib/permissions';
import { displayName } from '../../lib/roles';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';
import { RoleBadge } from '../shared/role-badge';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#E24B4A',
  MEMBER: '#4B8BE2',
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
  } = useWorkspaceAnalytics(workspace?.id ?? '');

  const { workspaceRole, isLoading: permLoading } = usePermissions();
  const isAdmin = canWorkspace(workspaceRole, 'VIEW_WORKSPACE_ANALYTICS');

  useEffect(() => {
    if (wsLoading || permLoading || !workspace) return;
    if (!isAdmin) {
      router.replace(`/no-access?reason=insufficient-role&workspace=${workspaceSlug}`);
    }
  }, [wsLoading, permLoading, isAdmin, workspace, router, workspaceSlug]);

  if (wsLoading || analyticsLoading || permLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return <PageError message="Couldn't load workspace" onRetry={() => refetchWorkspaces()} />;
  }

  if (analyticsError) {
    return <PageError message="Couldn't load analytics" onRetry={() => refetchAnalytics()} />;
  }

  if (!workspace || !analytics || !isAdmin) {
    return <PageLoading />;
  }

  const maxProjectCount = Math.max(...analytics.issuesByProject.map((p) => p.count), 1);
  const maxRoleCount = Math.max(...Object.values(analytics.roleBreakdown), 1);

  return (
    <div className="flex max-w-4xl flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="mb-1 text-[18px] font-semibold text-text-primary">Analytics</h1>
        <p className="text-[13px] text-text-muted">{workspace.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Projects',
            value: analytics.issuesByProject.length,
            icon: FolderKanban,
          },
          {
            label: 'Active Sprints',
            value: analytics.activeSprintsCount,
            icon: Zap,
          },
          {
            label: 'Total Issues',
            value: analytics.totalIssues,
            icon: ListTodo,
          },
          { label: 'Members', value: analytics.memberCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[6px] border border-border-default p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-text-muted" />
              <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
                {label}
              </p>
            </div>
            <p className="text-[24px] font-semibold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
        <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
          Issues by Project
        </p>
        {analytics.issuesByProject.length === 0 ? (
          <p className="text-[13px] text-text-muted">No projects yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {analytics.issuesByProject.map(({ project, count }) => (
              <div key={project.id} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="w-[130px] shrink-0 truncate text-[12px] text-text-secondary">
                  {project.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxProjectCount) * 100}%`,
                      backgroundColor: project.color,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[12px] text-text-muted">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
          <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Members <span className="text-text-disabled">({analytics.members.length})</span>
          </p>
          <div className="flex max-h-[240px] flex-col gap-2 overflow-y-auto">
            {analytics.members.slice(0, 6).map((m) => (
              <div key={m.user.id} className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar name={displayName(m.user)} size="sm" />
                  <span className="truncate text-[13px] text-text-primary">
                    {displayName(m.user)}
                  </span>
                </div>
                <RoleBadge role={m.role as 'ADMIN' | 'MEMBER'} />
              </div>
            ))}
            {analytics.members.length > 6 && (
              <p className="text-[11px] text-text-muted">
                +{analytics.members.length - 6} more members
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-4">
          <p className="font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
            Role Breakdown
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(analytics.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ROLE_COLORS[role] }}
                />
                <RoleBadge role={role as 'ADMIN' | 'MEMBER'} />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxRoleCount) * 100}%`,
                      backgroundColor: ROLE_COLORS[role],
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
    </div>
  );
}
