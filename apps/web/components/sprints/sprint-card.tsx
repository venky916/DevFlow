'use client';

import { useState } from 'react';
import { CheckCheck, Loader2, Pencil, Play, Trash2 } from 'lucide-react';

import type { ISprintWithCount } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { Button } from '@devflow/ui/components/button';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import { cn } from '@devflow/ui/lib/cn';

interface Props {
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
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const issueCount = sprint._count?.issues ?? 0;
  const isCompleted = sprint.status === 'COMPLETED';

  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[4px] border bg-bg-surface p-4',
        active ? 'border-[3px] border-border-default border-l-accent' : 'border-border-default',
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-primary">{sprint.name}</span>
            <Badge
              variant={
                sprint.status === 'ACTIVE'
                  ? 'success'
                  : sprint.status === 'PLANNED'
                    ? 'warning'
                    : 'neutral'
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
          {!isCompleted && onEdit && (
            <button
              onClick={onEdit}
              title="Edit sprint"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {!isCompleted && !active && onDelete && (
            <button
              onClick={() => setConfirmOpen(true)}
              title="Delete sprint"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-danger-text"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {active && onComplete && (
            <Button variant="secondary" size="sm" onClick={onComplete} disabled={completing}>
              {completing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Complete
                </>
              )}
            </Button>
          )}
          {!active && sprint.status === 'PLANNED' && onStart && (
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
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Start
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar — active sprint only */}
      {active && (
        <div className="flex items-center gap-2">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width:
                  issueCount > 0 ? `${Math.round((sprint.doneCount / issueCount) * 100)}%` : '0%',
              }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] text-text-muted">
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
