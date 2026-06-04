"use client";

import { Loader2, Play, CheckCheck } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Badge } from "@devflow/ui/components/badge";
import { cn } from "@devflow/ui/lib/cn";
import type { ISprintWithCount } from "@devflow/types";

interface Props {
  sprint: ISprintWithCount;
  active?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  starting?: boolean;
  completing?: boolean;
  hasActiveSprint?: boolean;
}

export function SprintCard({
  sprint,
  active,
  onStart,
  onComplete,
  starting,
  completing,
  hasActiveSprint,
}: Props) {
  const issueCount = sprint._count?.issues ?? 0;

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-[4px] border bg-bg-surface",
        active
          ? "border-l-[3px] border-l-accent border-border-default"
          : "border-border-default",
      )}
    >
      {/* Left */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-primary">
            {sprint.name}
          </span>
          <Badge
            variant={
              sprint.status === "ACTIVE"
                ? "success"
                : sprint.status === "PLANNED"
                  ? "warning"
                  : "neutral"
            }
          >
            {sprint.status.charAt(0) + sprint.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span>
            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
          </span>
          <span>{issueCount} issues</span>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {active && onComplete && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onComplete}
            disabled={completing}
          >
            {completing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Complete
              </>
            )}
          </Button>
        )}
        {!active && sprint.status === "PLANNED" && onStart && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onStart}
            disabled={starting || hasActiveSprint}
          >
            {starting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Start
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
