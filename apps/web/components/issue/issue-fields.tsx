'use client';

import { Controller } from 'react-hook-form';

import type { IIssueWithRelations, IssueType } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Select } from '@devflow/ui/components/select';

import { useIssueForm } from '../../hooks/use-issue-form';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/issue-constants';
import { FieldRow } from '../shared/field-row';
import { IssueTypeSelect } from '../shared/issue-type-select';
import { ParentLink } from '../shared/parent-link';
import { ProjectLabelSelect } from '../shared/project-label-select';
import { SubIssueList } from '../shared/sub-issue-list';

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  onSaving: (saving: boolean) => void;
  onNavigate: (issueId: string) => void;
  workspaceSlug: string; // NEW
  projectSlug: string; // NEW
}

export function IssueFields({
  issue,
  projectId,
  onSaving,
  onNavigate,
  workspaceSlug,
  projectSlug,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    save,
    sprintOptions,
    memberOptions,
    hasChildren,
    canEditIssue,
    canMoveToSprint,
    canEditDueDate,
  } = useIssueForm(issue, projectId, onSaving, { workspaceSlug, projectSlug });

  return (
    <div className="flex flex-col gap-5">
      <ParentLink issue={issue} onNavigate={onNavigate} />

      <input
        className="w-full border-b border-transparent bg-transparent pb-1 text-[15px] font-medium text-text-primary transition-colors placeholder:text-text-disabled focus:border-border-emphasis focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Issue title"
        disabled={!canEditIssue}
        {...register('title')}
        onBlur={handleSubmit(save)}
      />

      <textarea
        className="min-h-[80px] w-full resize-none bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Add description..."
        disabled={!canEditIssue}
        {...register('description')}
        onBlur={handleSubmit(save)}
      />

      <div className="h-px bg-border-default" />

      <div className="flex flex-col gap-3">
        <FieldRow label="Status">
          <Select
            options={STATUS_OPTIONS}
            value={watch('status')}
            disabled={hasChildren || !canEditIssue}
            onValueChange={(v) => {
              setValue('status', v as any);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Priority">
          <Select
            options={PRIORITY_OPTIONS}
            value={watch('priority')}
            disabled={!canEditIssue}
            onValueChange={(v) => {
              setValue('priority', v as any);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Type">
          <IssueTypeSelect
            value={watch('type') as IssueType}
            disabled={!canEditIssue}
            onValueChange={(v) => {
              setValue('type', v);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Assignee">
          <Select
            placeholder="Unassigned"
            options={memberOptions}
            value={watch('assigneeId') ?? undefined}
            disabled={!canEditIssue}
            onValueChange={(v) => {
              setValue('assigneeId', v || null);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Sprint">
          <Select
            placeholder="No sprint"
            options={sprintOptions}
            value={watch('sprintId') ?? undefined}
            disabled={!canEditIssue || !canMoveToSprint}
            onValueChange={(v) => {
              setValue('sprintId' as any, v || null);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Due date">
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value as string) : null}
                disabled={!canEditIssue || !canEditDueDate}
                onChange={(date) => {
                  field.onChange(date ? date.toISOString() : null);
                  handleSubmit(save)();
                }}
              />
            )}
          />
        </FieldRow>

        <FieldRow label="Labels">
          <ProjectLabelSelect
            projectId={projectId}
            selectedIds={watch('labelIds') ?? []}
            disabled={!canEditIssue}
            onChange={(ids) => {
              setValue('labelIds', ids);
              handleSubmit(save)();
            }}
          />
        </FieldRow>
      </div>

      <SubIssueList issue={issue} projectId={projectId} onNavigate={onNavigate} />

      {issue.creator && (
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
            Created by
          </span>
          <div className="flex items-center gap-2">
            <Avatar name={issue.creator.name ?? issue.creator.email} size="sm" />
            <span className="text-[12px] text-text-secondary">
              {issue.creator.name ?? issue.creator.email}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
