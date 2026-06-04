"use client";

import { useIssueActivities } from "../../hooks/use-issues";
import { Loader2 } from "lucide-react";

interface Props {
  issueId: string;
}

export function ActivityPanel({ issueId }: Props) {
  const { data: activities, isLoading } = useIssueActivities(issueId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-4">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
        Activity
      </p>
      {!activities?.length ? (
        <p className="text-[11px] text-text-disabled">No activity yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((activity: any) => (
            <div key={activity.id} className="flex flex-col gap-0.5">
              <p className="text-[11px] text-text-secondary leading-snug">
                {activity.action.replace(/_/g, " ").toLowerCase()}
              </p>
              <p className="text-[10px] text-text-disabled font-mono">
                {new Date(activity.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
