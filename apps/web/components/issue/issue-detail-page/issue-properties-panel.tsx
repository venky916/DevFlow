'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Controller } from 'react-hook-form';

import type { IIssueWithRelations, IssueType } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Select } from '@devflow/ui/components/select';

import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../../lib/issue-constants';
import { FieldRow } from '../../shared/field-row';
import { IssueTypeSelect } from '../../shared/issue-type-select';
import { ProjectLabelSelect } from '../../shared/project-label-select';

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  form: any; // return value of useIssueForm
}

export function IssuePropertiesPanel({ issue, projectId, form }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    save,
    sprintOptions,
    memberOptions,
    hasChildren,
    canEditIssue,
    canMoveToSprint,
    canEditDueDate,
  } = form;

  return (
    <div className="flex flex-col rounded-md border border-border-default">
      <button
        type="button"
        onClick={() => setIsOpen((v: boolean) => !v)}
        className={`flex cursor-pointer items-center justify-between px-4 py-3 font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase ${
          isOpen ? 'border-b border-border-default' : ''
        }`}
      >
        Properties
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
          <FieldRow label="Status">
            <Select
              options={STATUS_OPTIONS}
              value={watch('status')}
              disabled={hasChildren || !canEditIssue}
              onValueChange={(v: string) => {
                setValue('status', v);
                handleSubmit(save)();
              }}
            />
            {hasChildren && (
              <p className="mt-1 text-[11px] text-text-muted">Set automatically from sub-issues</p>
            )}
          </FieldRow>

          <FieldRow label="Priority">
            <Select
              options={PRIORITY_OPTIONS}
              value={watch('priority')}
              disabled={!canEditIssue}
              onValueChange={(v: string) => {
                setValue('priority', v);
                handleSubmit(save)();
              }}
            />
          </FieldRow>

          <FieldRow label="Type">
            <IssueTypeSelect
              value={watch('type') as IssueType}
              disabled={!canEditIssue}
              onValueChange={(v: IssueType) => {
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
              onValueChange={(v: string) => {
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
              onValueChange={(v: string) => {
                setValue('sprintId', v || null);
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
              onChange={(ids: string[]) => {
                setValue('labelIds', ids);
                handleSubmit(save)();
              }}
            />
          </FieldRow>

          {issue.creator && (
            <FieldRow label="Created by">
              <div className="flex items-center gap-2">
                <Avatar name={issue.creator.name ?? issue.creator.email} size="sm" />
                <span className="text-[12px] text-text-secondary">
                  {issue.creator.name ?? issue.creator.email}
                </span>
              </div>
            </FieldRow>
          )}
        </div>
      )}
    </div>
  );
}
