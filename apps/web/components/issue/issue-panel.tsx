'use client';

import { ExternalLink, X } from 'lucide-react';

import type { IIssueDetail } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { Spinner } from '@devflow/ui/components/spinner';

import { useIssueForm } from '../../hooks/pages/use-issue-form';
import { getStatusVariant, STATUS_LABELS } from '../../lib/issue-constants';
import { IssueActionsMenu } from '../shared/issue-actions-menu';
import { ActivityPanel } from './activity-panel';
import { IssueFields } from './issue-fields';

interface IssuePanelProps {
  issue: IIssueDetail;
  canDelete: boolean;
  onClose: () => void;
  onExpand: () => void;
  onNavigate: (issueId: string) => void;
}

export function IssuePanel({ issue, canDelete, onClose, onExpand, onNavigate }: IssuePanelProps) {
  const projectId = issue.project.id;
  const projectContext = {
    workspaceSlug: issue.project.workspace.slug,
    projectSlug: issue.project.slug,
  };
  const form = useIssueForm(issue, projectId, projectContext);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-accent">
            #{issue.id.slice(-6).toUpperCase()}
          </span>
          <Badge variant={getStatusVariant(issue.status)}>{STATUS_LABELS[issue.status]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {form.isSaving && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <Spinner size="sm" />
              Saving...
            </span>
          )}
          <button
            type="button"
            onClick={onExpand}
            aria-label="Open full page"
            className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <IssueActionsMenu
            issue={issue}
            projectId={projectId}
            canDelete={canDelete}
            onDeleted={onClose}
            onDuplicated={(id) => {
              onClose();
              onNavigate(id);
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
            form={form}
            projectContext={projectContext}
            onNavigate={onNavigate}
          />
        </div>
        <div className="w-[250px] shrink-0 overflow-y-auto border-l border-border-default p-3">
          <ActivityPanel issueId={issue.id} />
        </div>
      </div>
    </>
  );
}
