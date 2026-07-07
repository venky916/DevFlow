"use client";

import { Controller } from "react-hook-form";
import { Select } from "@devflow/ui/components/select";
import { Avatar } from "@devflow/ui/components/avatar";
import { DatePicker } from "@devflow/ui/components/date-picker";
import { useIssueForm } from "../../hooks/use-issue-form";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "../../lib/issue-constants";
import { FieldRow } from "../shared/field-row";
import { IssueTypeSelect } from "../shared/issue-type-select";
import { ProjectLabelSelect } from "../shared/project-label-select";
import { ParentLink } from "../shared/parent-link";
import { SubIssueList } from "../shared/sub-issue-list";
import type { IIssueWithRelations, IssueType } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  onSaving: (saving: boolean) => void;
  onNavigate: (issueId: string) => void;
}

export function IssueFields({ issue, projectId, onSaving, onNavigate }: Props) {
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
  } = useIssueForm(issue, projectId, onSaving);

  return (
    <div className="flex flex-col gap-5">
      <ParentLink issue={issue} onNavigate={onNavigate} />

      <input
        className="w-full bg-transparent text-[15px] font-medium text-text-primary placeholder:text-text-disabled focus:outline-none border-b border-transparent focus:border-border-emphasis pb-1 transition-colors"
        placeholder="Issue title"
        {...register("title")}
        onBlur={handleSubmit(save)}
      />

      <textarea
        className="w-full bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none resize-none min-h-[80px]"
        placeholder="Add description..."
        {...register("description")}
        onBlur={handleSubmit(save)}
      />

      <div className="h-px bg-border-default" />

      <div className="flex flex-col gap-3">
        <FieldRow label="Status">
          <Select
            options={STATUS_OPTIONS}
            value={watch("status")}
            disabled={hasChildren}
            onValueChange={(v) => {
              setValue("status", v as any);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Priority">
          <Select
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v) => {
              setValue("priority", v as any);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Type">
          <IssueTypeSelect
            value={watch("type") as IssueType}
            onValueChange={(v) => {
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
            onValueChange={(v) => {
              setValue("assigneeId", v || null);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Sprint">
          <Select
            placeholder="No sprint"
            options={sprintOptions}
            value={watch("sprintId") ?? undefined}
            onValueChange={(v) => {
              setValue("sprintId" as any, v || null);
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
            onChange={(ids) => {
              setValue("labelIds", ids);
              handleSubmit(save)();
            }}
          />
        </FieldRow>
      </div>

      <SubIssueList
        issue={issue}
        projectId={projectId}
        onNavigate={onNavigate}
      />

      {issue.creator && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
            Created by
          </span>
          <div className="flex items-center gap-2">
            <Avatar
              name={issue.creator.name ?? issue.creator.email}
              size="sm"
            />
            <span className="text-[12px] text-text-secondary">
              {issue.creator.name ?? issue.creator.email}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
