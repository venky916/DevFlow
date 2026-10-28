'use client';

import { Avatar } from '@devflow/ui/components/avatar';
import { Spinner } from '@devflow/ui/components/spinner';

import { useIssueActivities } from '../../hooks/use-issues';
import { formatTimeAgo } from '../../lib/format-date';
import { activityText } from '../../lib/issue-constants';

interface ActivityPanelProps {
  issueId: string;
}

export function ActivityPanel({ issueId }: ActivityPanelProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useIssueActivities(issueId);

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center pt-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">Activity</p>
      {!activities.length ? (
        <p className="text-[11px] text-text-disabled">No activity yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((activity) => {
            const lines = activityText(activity.action, activity.meta);
            return (
              <div key={activity.id} className="flex items-start gap-2">
                <Avatar
                  name={activity.user?.name ?? '?'}
                  src={activity.user?.avatarUrl ?? undefined}
                  size="sm"
                />
                <div className="flex flex-col gap-0.5">
                  {lines.map((line, i) => (
                    <p key={i} className="text-[12px] leading-snug text-text-secondary">
                      {i === 0 && (
                        <span className="font-medium text-text-primary">
                          {activity.user?.name ?? 'Someone'}{' '}
                        </span>
                      )}
                      {line}
                    </p>
                  ))}
                  <span className="font-mono text-[10px] text-text-muted">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="self-start text-[11px] text-accent hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading...' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
