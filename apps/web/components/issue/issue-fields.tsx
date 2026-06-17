"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Select } from "@devflow/ui/components/select";
import { Avatar } from "@devflow/ui/components/avatar";
import {
  useUpdateIssue,
  useProjectSprints,
  useProjectMembers,
} from "../../hooks/use-issues";
import { updateIssueSchema, type UpdateIssueInput } from "@devflow/validators";
import type { IIssueWithRelations } from "@devflow/types";

const PRIORITY_OPTIONS = [
  { label: "No Priority", value: "NO_PRIORITY" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const STATUS_OPTIONS = [
  { label: "Backlog", value: "BACKLOG" },
  { label: "Todo", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "In Review", value: "IN_REVIEW" },
  { label: "Done", value: "DONE" },
];

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  onSaving: (saving: boolean) => void;
}

export function IssueFields({ issue, projectId, onSaving }: Props) {
  const { mutateAsync } = useUpdateIssue(issue.id, projectId);
  const { data: sprints } = useProjectSprints(projectId);
  const { data: members } = useProjectMembers(projectId);

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<UpdateIssueInput>({
      resolver: zodResolver(updateIssueSchema),
      defaultValues: {
        title: issue.title,
        description: issue.description ?? "",
        priority: issue.priority,
        status: issue.status,
        assigneeId: issue.assigneeId ?? undefined,
      },
    });

  useEffect(() => {
    reset({
      title: issue.title,
      description: issue.description ?? "",
      priority: issue.priority,
      status: issue.status,
      assigneeId: issue.assigneeId ?? undefined,
    });
  }, [issue.id]);

  const save = async (data: UpdateIssueInput) => {
    try {
      onSaving(true);
      await mutateAsync(data);
    } catch {
      toast.error("Failed to update issue");
    } finally {
      onSaving(false);
    }
  };

  const sprintOptions =
    sprints?.map((s) => ({ label: s.name, value: s.id })) ?? [];
  const memberOptions =
    members?.map((m) => ({
      label: m.user?.name ?? m.user?.email ?? "Unknown",
      value: m.userId,
    })) ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <input
        className="w-full bg-transparent text-[15px] font-medium text-text-primary placeholder:text-text-disabled focus:outline-none border-b border-transparent focus:border-border-emphasis pb-1 transition-colors"
        placeholder="Issue title"
        {...register("title")}
        onBlur={handleSubmit(save)}
      />

      {/* Description */}
      <textarea
        className="w-full bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none resize-none min-h-[80px]"
        placeholder="Add description..."
        {...register("description")}
        onBlur={handleSubmit(save)}
      />

      <div className="h-px bg-border-default" />

      {/* Fields */}
      <div className="flex flex-col gap-3">
        <FieldRow label="Status">
          <Select
            options={STATUS_OPTIONS}
            value={watch("status")}
            onValueChange={(v) => {
              setValue("status", v as UpdateIssueInput["status"]);
              handleSubmit(save)();
            }}
          />
        </FieldRow>

        <FieldRow label="Priority">
          <Select
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v) => {
              setValue("priority", v as UpdateIssueInput["priority"]);
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
            value={issue.sprintId ?? undefined}
            onValueChange={(v) => {
              handleSubmit(save)();
            }}
            disabled
          />
        </FieldRow>
      </div>

      {/* Creator */}
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

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted w-[80px] shrink-0">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
