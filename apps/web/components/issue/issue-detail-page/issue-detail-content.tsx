'use client';

import { useEffect, useRef } from 'react';

import type { IIssueDetail } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { AvatarGroup } from '@devflow/ui/components/avatar-group';
import { Badge } from '@devflow/ui/components/badge';
import { Spinner } from '@devflow/ui/components/spinner';

import { useIssueEvents } from '../../../hooks/events/use-issue-events';
import { useIssuePresence } from '../../../hooks/events/use-issue-presence';
import { usePresenceAction } from '../../../hooks/events/use-presence-action';
import { useProjectEvents } from '../../../hooks/events/use-project-events';
import { useIssueForm } from '../../../hooks/pages/use-issue-form';
import { getStatusVariant, STATUS_LABELS } from '../../../lib/issue-constants';
import { describeHints } from '../../../lib/presence-text';
import { displayName } from '../../../lib/roles';
import { FieldRow } from '../../shared/field-row';
import { IssueActionsMenu } from '../../shared/issue-actions-menu';
import { PanelTitle } from '../../shared/panel-title';
import { ActivityPanel } from '../activity-panel';
import { IssueProperties } from '../issue-properties';
import { CommentsSection } from './comments-section';
import { IssueMainInfo } from './issue-main-info';

interface IssueDetailContentProps {
  issue: IIssueDetail;
  canDelete: boolean;
  backHref?: string;
  backLabel?: string;
  onDeleted: () => void;
  onNavigate: (issueId: string) => void;
}

export function IssueDetailContent({
  issue,
  canDelete,
  onDeleted,
  onNavigate,
}: IssueDetailContentProps) {
  const projectContext = {
    workspaceSlug: issue.project.workspace.slug,
    projectSlug: issue.project.slug,
  };
  const form = useIssueForm(issue, issue.project.id, projectContext);
  useProjectEvents(issue.project.id); // fields, status, deletion
  useIssueEvents(issue.id); // comments, files, activity. This one joins the issue room.
  const presence = useIssuePresence(issue.id); // who else is here
  const hint = describeHints(presence.hints);

  const presenceAction = usePresenceAction(issue.id);

  // the hint ends when a save finishes. A save is what a property change ends with.
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !form.isSaving) presenceAction.stop();
    wasSaving.current = form.isSaving;
  }, [form.isSaving, presenceAction]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-[38px] shrink-0 items-center justify-between gap-3 border-b border-border-default px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-accent">
            #{issue.id.slice(-6).toUpperCase()}
          </span>
          <Badge variant={getStatusVariant(issue.status)}>{STATUS_LABELS[issue.status]}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {hint && (
            <span aria-live="polite" className="max-w-[280px] truncate text-[11px] text-text-muted">
              {hint}
            </span>
          )}
          <AvatarGroup users={presence.users} max={3} />
          {form.isSaving && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <Spinner size="sm" />
              Saving...
            </span>
          )}
          <IssueActionsMenu
            issue={issue}
            projectId={issue.project.id}
            canDelete={canDelete}
            onDeleted={onDeleted}
            onDuplicated={onNavigate}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
          <IssueMainInfo
            issue={issue}
            form={form}
            projectContext={projectContext}
            onNavigate={onNavigate}
          />
          <div className="h-px bg-border-default" />
          <CommentsSection
            issueId={issue.id}
            projectId={issue.project.id}
            projectContext={projectContext}
          />
        </div>

        <div className="flex w-[400px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border-default px-4 py-6">
          <div
            className="flex flex-col gap-4 rounded-md border border-border-default p-4"
            // the hint starts when someone presses on a property control (mouse or keyboard)
            onPointerDownCapture={() => form.canEditIssue && presenceAction.report('editing')}
            onKeyDownCapture={() => form.canEditIssue && presenceAction.report('editing')}
          >
            <PanelTitle>Properties</PanelTitle>
            <IssueProperties issue={issue} form={form} />
            <FieldRow label="Created by">
              <div className="flex items-center gap-2">
                <Avatar
                  name={displayName(issue?.creator)}
                  src={issue?.creator?.avatarUrl ?? undefined}
                  size="sm"
                />
                <span className="text-[12px] text-text-secondary">
                  {displayName(issue?.creator)}
                </span>
              </div>
            </FieldRow>
          </div>
          <div className="h-px shrink-0 bg-border-default" />
          <ActivityPanel issueId={issue.id} />
        </div>
      </div>
    </div>
  );
}
