'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, Loader2, X } from 'lucide-react';

import type { IssueStatus } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { cn } from '@devflow/ui/lib/cn';

import { useCanMoveIssue } from '../../hooks/use-can-move-issue';
import { useIssueById } from '../../hooks/use-issues';
import { getStatusVariant, STATUS_LABELS } from '../../lib/issue-constants';
import { IssueActionsMenu } from '../shared/issue-actions-menu';
import { ActivityPanel } from './activity-panel';
import { IssueFields } from './issue-fields';

interface Props {
  issueId: string | null;
  onClose: () => void;
  projectId: string;
  workspaceSlug: string;
  projectSlug: string;
}

export function IssueSlideOver({ issueId, onClose, projectId, workspaceSlug, projectSlug }: Props) {
  const isOpen = !!issueId;
  const router = useRouter();
  const pathname = usePathname();

  const from = pathname.includes('/backlog')
    ? 'backlog'
    : pathname.includes('/board')
      ? 'board'
      : pathname.includes('/my-issues')
        ? 'my-issues'
        : undefined;
  const [saving, setSaving] = useState(false);
  const { data: issue, isLoading } = useIssueById(issueId ?? '');
  const { canDeleteIssue } = useCanMoveIssue({ workspaceSlug, projectSlug });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 transition-opacity duration-200',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed top-[38px] right-0 bottom-0 z-40 flex w-1/2 flex-col border-l border-border-default bg-bg-surface transition-transform duration-200 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : issue ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-accent">
                  #{issue.id.slice(-6).toUpperCase()}
                </span>
                <Badge variant={getStatusVariant(issue.status as IssueStatus)}>
                  {STATUS_LABELS[issue.status as IssueStatus]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {saving && (
                  <span className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
                <button
                  onClick={() =>
                    router.push(
                      `/${workspaceSlug}/${projectSlug}/issues/${issue.id}${from ? `?from=${from}` : ''}`,
                    )
                  }
                  className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <IssueActionsMenu
                  issue={issue}
                  projectId={projectId}
                  canDelete={canDeleteIssue}
                  onDeleted={onClose}
                  onDuplicated={(id: string) => {
                    onClose();
                    router.push(`/${workspaceSlug}/${projectSlug}/issues/${id}`);
                  }}
                />
                <button
                  onClick={onClose}
                  className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <IssueFields
                  issue={issue}
                  projectId={projectId}
                  onSaving={setSaving}
                  onNavigate={(id) => router.push(`/${workspaceSlug}/${projectSlug}/issues/${id}`)}
                  workspaceSlug={workspaceSlug} // NEW
                  projectSlug={projectSlug} // NEW
                />
              </div>
              <div className="w-[250px] shrink-0 overflow-y-auto border-l border-border-default p-3">
                <ActivityPanel issueId={issue.id} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
