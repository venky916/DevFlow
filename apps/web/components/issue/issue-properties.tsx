'use client';

import type { IIssueDetail, IssuePriority, IssueType } from '@devflow/types';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Select } from '@devflow/ui/components/select';

import type { IssueFormState } from '../../hooks/pages/use-issue-form';
import { PRIORITY_OPTIONS } from '../../lib/issue-constants';
import { FieldRow } from '../shared/field-row';
import { IssueTypeSelect } from '../shared/issue-type-select';
import { ProjectLabelSelect } from '../shared/project-label-select';

interface IssuePropertiesProps {
  issue: IIssueDetail;
  form: IssueFormState;
}

export function IssueProperties({ issue, form }: IssuePropertiesProps) {
  const {
    watch,
    setField,
    changeStatus,
    statusOptions,
    canChangeStatus,
    memberOptions,
    canEditIssue,
    canEditDueDate,
  } = form;

  const dueDate = watch('dueDate');

  return (
    <div className="flex flex-col gap-3">
      <FieldRow label="Status">
        <Select
          options={statusOptions}
          value={issue.status}
          disabled={!canChangeStatus}
          onValueChange={changeStatus}
        />
        {issue.children.length > 0 && (
          <p className="mt-1 text-[11px] text-text-muted">Set automatically from sub-issues</p>
        )}
      </FieldRow>

      <FieldRow label="Priority">
        <Select
          options={PRIORITY_OPTIONS}
          value={watch('priority')}
          disabled={!canEditIssue}
          onValueChange={(v) => setField('priority', v as IssuePriority)}
        />
      </FieldRow>

      <FieldRow label="Type">
        <IssueTypeSelect
          value={watch('type') as IssueType | undefined}
          disabled={!canEditIssue}
          onValueChange={(v) => setField('type', v)}
        />
      </FieldRow>

      <FieldRow label="Assignee">
        <Select
          placeholder="Unassigned"
          options={memberOptions}
          value={watch('assigneeId') ?? undefined}
          disabled={!canEditIssue}
          onValueChange={(v) => setField('assigneeId', v || null)}
        />
      </FieldRow>

      {/* moving an issue between sprints is done from the backlog page */}
      <FieldRow label="Sprint">
        <Select
          placeholder="No sprint"
          options={issue.sprint ? [{ label: issue.sprint.name, value: issue.sprint.id }] : []}
          value={issue.sprint?.id}
          disabled
          onValueChange={() => {}}
        />
      </FieldRow>

      <FieldRow label="Due date">
        <DatePicker
          value={dueDate ? new Date(dueDate as string) : null}
          disabled={!canEditIssue || !canEditDueDate}
          onChange={(date) => setField('dueDate', date ? date.toISOString() : null)}
        />
      </FieldRow>

      <FieldRow label="Labels">
        <ProjectLabelSelect
          projectId={issue.project.id}
          selectedIds={watch('labelIds') ?? []}
          disabled={!canEditIssue}
          onChange={(ids) => setField('labelIds', ids)}
        />
      </FieldRow>
    </div>
  );
}
