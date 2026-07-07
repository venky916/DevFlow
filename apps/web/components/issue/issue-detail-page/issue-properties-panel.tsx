"use client";

import { Controller } from "react-hook-form";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { DatePicker } from "@devflow/ui/components/date-picker";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "../../../lib/issue-constants";
import { FieldRow } from "../../shared/field-row";
import { IssueTypeSelect } from "../../shared/issue-type-select";
import { ProjectLabelSelect } from "../../shared/project-label-select";
import type { IIssueWithRelations, IssueType } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  form: any; // return value of useIssueForm
}

export function IssuePropertiesPanel({ issue, projectId, form }: Props) {
  const {
    control,
    setValue,
    watch,
    handleSubmit,
    save,
    sprintOptions,
    memberOptions,
    hasChildren,
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
        Properties
      </p>
      <div className="flex flex-col gap-3">
        <FieldRow label="Status">
          <Select
            options={STATUS_OPTIONS}
            value={watch("status")}
            disabled={hasChildren}
            onValueChange={(v: string) => {
              setValue("status", v);
              handleSubmit(save)();
            }}
          />
          {hasChildren && (
            <p className="text-[11px] text-text-muted mt-1">
              Set automatically from sub-issues
            </p>
          )}
        </FieldRow>

        <FieldRow label="Priority">
          <Select
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v: string) => {
              setValue("priority", v);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Type">
          <IssueTypeSelect
            value={watch("type") as IssueType}
            onValueChange={(v: IssueType) => {
              setValue("type", v);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Assignee">
          <Select
            placeholder="Unassigned"
            options={memberOptions}
            value={watch("assigneeId") ?? undefined}
            onValueChange={(v: string) => {
              setValue("assigneeId", v || null);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Sprint">
          <Select
            placeholder="No sprint"
            options={sprintOptions}
            value={issue.sprintId ?? undefined}
            onValueChange={(v: string) => {
              setValue("sprintId", v || null);
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
            selectedIds={watch("labelIds") ?? []}
            onChange={(ids: string[]) => {
              setValue("labelIds", ids);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        {issue.creator && (
          <FieldRow label="Created by">
            <div className="flex items-center gap-2">
              <Avatar
                name={issue.creator.name ?? issue.creator.email}
                size="sm"
              />
              <span className="text-[12px] text-text-secondary">
                {issue.creator.name ?? issue.creator.email}
              </span>
            </div>
          </FieldRow>
        )}
      </div>
    </div>
  );
}
