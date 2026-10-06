'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import type { IIssueWithRelations, IssueStatus } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';

import { useCanMoveIssue } from '../../../hooks/use-can-move-issue';
import { useIssueForm } from '../../../hooks/use-issue-form';
import { useIssueById } from '../../../hooks/use-issues';
import { usePermissions } from '../../../hooks/use-permissions';
import { getStatusVariant, STATUS_LABELS } from '../../../lib/issue-constants';
import { IssueActionsMenu } from '../../shared/issue-actions-menu';
import { ActivityPanel } from '../activity-panel';
import { CommentsSection } from './comments-section';
import { IssueMainInfo } from './issue-main-info';
import { IssuePropertiesPanel } from './issue-properties-panel';

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const router = useRouter();
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { data: issue, isLoading } = useIssueById(issueId);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-text-muted">Issue not found</p>
      </div>
    );
  }

  return (
    <IssueDetailContent
      issue={issue}
      onBack={() => router.back()}
      onNavigate={(id: string) => router.push(`/${workspaceSlug}/${projectSlug}/issues/${id}`)}
      saving={saving}
      onSaving={setSaving}
    />
  );
}

function IssueDetailContent({
  issue,
  onBack,
  onNavigate,
  saving,
  onSaving,
}: {
  issue: IIssueWithRelations;
  onBack: () => void;
  onNavigate: (id: string) => void;
  saving: boolean;
  onSaving: (v: boolean) => void;
}) {
  const form = useIssueForm(issue, issue.projectId, onSaving);
  const { canDeleteIssue } = useCanMoveIssue();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-[38px] shrink-0 items-center justify-between gap-3 border-b border-border-default px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-accent">
            #{issue.id.slice(-6).toUpperCase()}
          </span>
          <Badge variant={getStatusVariant(issue.status as IssueStatus)}>
            {STATUS_LABELS[issue.status as IssueStatus]}
          </Badge>
        </div>
        <div>
          <IssueActionsMenu
            issue={issue}
            projectId={issue.projectId}
            canDelete={canDeleteIssue}
            onDeleted={onBack}
            onDuplicated={onNavigate}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
          <IssueMainInfo
            issue={issue}
            projectId={issue.projectId}
            saving={saving}
            register={form.register}
            handleSubmit={form.handleSubmit}
            save={form.save}
            onNavigate={onNavigate}
            canEditIssue={form.canEditIssue}
            canUploadAttachment={form.canUploadAttachment}
          />
          <div className="h-px bg-border-default" />
          <CommentsSection projectId={issue.projectId} issueId={issue.id} />
        </div>
        <div className="flex w-[400px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-border-default px-4 py-6">
          <IssuePropertiesPanel issue={issue} projectId={issue.projectId} form={form} />
          <div className="h-px bg-border-default" />
          <ActivityPanel issueId={issue.id} />
        </div>
      </div>
    </div>
  );
}
