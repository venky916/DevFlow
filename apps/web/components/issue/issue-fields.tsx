'use client';

import type { IIssueDetail } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';

import type { IssueFormState } from '../../hooks/pages/use-issue-form';
import { displayName } from '../../lib/roles';
import { ParentLink } from '../shared/parent-link';
import { SubIssueList } from '../shared/sub-issue-list';
import { IssueProperties } from './issue-properties';

interface IssueFieldsProps {
  issue: IIssueDetail;
  projectId: string;
  form: IssueFormState;
  projectContext: { workspaceSlug: string; projectSlug: string };
  onNavigate: (issueId: string) => void;
}

export function IssueFields({
  issue,
  projectId,
  form,
  projectContext,
  onNavigate,
}: IssueFieldsProps) {
  const { register, save, canEditIssue } = form;

  return (
    <div className="flex flex-col gap-5">
      <ParentLink issue={issue} onNavigate={onNavigate} />

      <input
        className="w-full border-b border-transparent bg-transparent pb-1 text-[15px] font-medium text-text-primary transition-colors placeholder:text-text-disabled focus:border-border-emphasis focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Issue title"
        disabled={!canEditIssue}
        {...register('title')}
        onBlur={save}
      />

      <textarea
        className="min-h-[80px] w-full resize-none bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Add description..."
        disabled={!canEditIssue}
        {...register('description')}
        onBlur={save}
      />

      <div className="h-px bg-border-default" />

      <IssueProperties issue={issue} form={form} />

      <SubIssueList
        issue={issue}
        projectId={projectId}
        projectContext={projectContext}
        onNavigate={onNavigate}
      />

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
          Created by
        </span>
        <div className="flex items-center gap-2">
          <Avatar
            name={displayName(issue?.creator)}
            src={issue?.creator?.avatarUrl ?? undefined}
            size="sm"
          />
          <span className="text-[12px] text-text-secondary">{displayName(issue.creator)}</span>
        </div>
      </div>
    </div>
  );
}
