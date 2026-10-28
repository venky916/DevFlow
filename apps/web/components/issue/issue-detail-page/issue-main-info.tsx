'use client';

import type { IIssueDetail } from '@devflow/types';

import type { IssueFormState } from '../../../hooks/pages/use-issue-form';
import { ParentLink } from '../../shared/parent-link';
import { SubIssueList } from '../../shared/sub-issue-list';
import { AttachmentsSection } from './attachments-section';

interface IssueMainInfoProps {
  issue: IIssueDetail;
  form: IssueFormState;
  projectContext: { workspaceSlug: string; projectSlug: string };
  onNavigate: (issueId: string) => void;
}

export function IssueMainInfo({ issue, form, projectContext, onNavigate }: IssueMainInfoProps) {
  const { register, save, canEditIssue } = form;

  return (
    <div className="flex flex-col gap-4">
      <ParentLink issue={issue} onNavigate={onNavigate} />

      <input
        className="w-full bg-transparent text-[18px] font-semibold text-text-primary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Issue title"
        disabled={!canEditIssue}
        {...register('title')}
        onBlur={save}
      />

      <textarea
        className="min-h-[120px] w-full resize-none bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Add a description..."
        disabled={!canEditIssue}
        {...register('description')}
        onBlur={save}
      />

      <AttachmentsSection issue={issue} projectContext={projectContext} />

      <SubIssueList
        issue={issue}
        projectId={issue.project.id}
        projectContext={projectContext}
        onNavigate={onNavigate}
      />
    </div>
  );
}
