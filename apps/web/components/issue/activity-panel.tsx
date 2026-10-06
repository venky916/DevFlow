'use client';

import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Avatar } from '@devflow/ui/components/avatar';

import { useIssueActivities } from '../../hooks/use-issues';
import { activityText } from '../../lib/issue-constants';

interface Props {
  issueId: string;
}

export function ActivityPanel({ issueId }: Props) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useIssueActivities(issueId);

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center pt-4">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
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
          {activities.map((activity: any) => {
            const lines = activityText(activity.action, activity.meta);
            return (
              <div key={activity.id} className="flex items-start gap-2">
                <Avatar name={activity.user?.name ?? '?'} size="sm" />
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
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
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
