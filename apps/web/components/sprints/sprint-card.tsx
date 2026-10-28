'use client';

import { useState } from 'react';
import { CheckCheck, Pencil, Play, Trash2 } from 'lucide-react';

import type { ISprintWithCount } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { Button } from '@devflow/ui/components/button';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import { cn } from '@devflow/ui/lib/cn';

import { formatShortDate } from '../../lib/format-date';

const STATUS_BADGE = {
  ACTIVE: 'success',
  PLANNED: 'warning',
  COMPLETED: 'neutral',
} as const;

const ICON_BUTTON =
  'flex size-7 items-center justify-center rounded-base text-text-muted transition-colors hover:bg-bg-hover';

interface SprintCardProps {
  sprint: ISprintWithCount;
  active?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  starting?: boolean;
  completing?: boolean;
  deleting?: boolean;
  hasActiveSprint?: boolean;
}

export function SprintCard({
  sprint,
  active,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  starting,
  completing,
  deleting,
  hasActiveSprint,
}: SprintCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const issueCount = sprint._count.issues;
  const isCompleted = sprint.status === 'COMPLETED';
  const percent = issueCount > 0 ? Math.round((sprint.doneCount / issueCount) * 100) : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-base border bg-bg-surface p-4',
        active ? 'border-3 border-border-default border-l-accent' : 'border-border-default',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-text-primary">{sprint.name}</span>
            <Badge variant={STATUS_BADGE[sprint.status]}>
              {sprint.status.charAt(0) + sprint.status.slice(1).toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-2xs text-text-muted">
            <span>
              {formatShortDate(sprint.startDate)} → {formatShortDate(sprint.endDate)}
            </span>
            <span>{issueCount} issues</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit sprint"
              title="Edit sprint"
              className={cn(ICON_BUTTON, 'hover:text-text-primary')}
            >
              <Pencil className="size-3.5" />
            </button>
          )}

          {!isCompleted && !active && onDelete && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete sprint"
              title="Delete sprint"
              className={cn(ICON_BUTTON, 'hover:text-danger-text')}
            >
              <Trash2 className="size-3.5" />
            </button>
          )}

          {active && onComplete && (
            <Button variant="secondary" size="sm" onClick={onComplete} loading={completing}>
              {!completing && <CheckCheck className="mr-1.5 size-3.5" />}
              Complete
            </Button>
          )}

          {!active && sprint.status === 'PLANNED' && onStart && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onStart}
              loading={starting}
              disabled={hasActiveSprint}
            >
              {!starting && <Play className="mr-1.5 size-3.5" />}
              Start
            </Button>
          )}
        </div>
      </div>

      {active && (
        <div className="flex items-center gap-2">
          <div className="h-0.75 flex-1 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-2xs text-text-muted">
            {sprint.doneCount}/{issueCount}
          </span>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          onDelete?.();
          setConfirmOpen(false);
        }}
        title="Delete sprint?"
        description={`This will permanently delete "${sprint.name}". Issues in this sprint will move back to the backlog.`}
        confirmLabel="Delete"
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
