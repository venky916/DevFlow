"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Modal } from "@devflow/ui/components/modal";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Textarea } from "@devflow/ui/components/textarea";
import { Select } from "@devflow/ui/components/select";
import { DatePicker } from "@devflow/ui/components/date-picker";
import { useCreateIssue } from "../../hooks/use-issues";
import {
  createIssueSchema,
  type CreateIssueInput,
  type CreateIssueOutput,
} from "@devflow/validators";
import { PRIORITY_OPTIONS, TYPE_OPTIONS } from "../../lib/issue-constants";
import { IssueTypeSelect } from "../shared/issue-type-select";
import { ProjectLabelSelect } from "../shared/project-label-select";
import type { ISprint, IUserPublic } from "@devflow/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprints: ISprint[];
  members: IUserPublic[];
  activeSprint: ISprint | null;
}

export function CreateIssueModal({
  open,
  onClose,
  projectId,
  sprints,
  members,
  activeSprint,
}: Props) {
  const { mutateAsync, isPending } = useCreateIssue(projectId);

  // opened from the board (activeSprint passed) → issue is locked to that
  // sprint and starts at TODO. Opened from backlog (activeSprint === null)
  // → sprint stays optional/editable, status starts at BACKLOG.
  const isBoardContext = !!activeSprint;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateIssueInput, any, CreateIssueOutput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      priority: "NO_PRIORITY",
      type: "TASK",
      status: isBoardContext ? "TODO" : "BACKLOG",
      sprintId: activeSprint?.id ?? null,
      labelIds: [],
    },
  });

  const sprintOptions = sprints.map((s) => ({ label: s.name, value: s.id }));
  const memberOptions = members.map((m) => ({
    label: m.name ?? m.email,
    value: m.id,
  }));

  const onSubmit = async (data: CreateIssueOutput) => {
    try {
      await mutateAsync({
        ...data,
        status: isBoardContext ? "TODO" : (data.status ?? "BACKLOG"),
        sprintId: data.sprintId || null,
        assigneeId: data.assigneeId || null,
      });
      toast.success("Issue created!");
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create issue");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create issue">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Title */}
        <Input
          label="Title"
          placeholder="Issue title"
          error={errors.title?.message}
          {...register("title")}
        />

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="Add a description..."
          error={errors.description?.message}
          {...register("description")}
        />

        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <IssueTypeSelect
            label="Type"
            value={watch("type")}
            onValueChange={(v) => setValue("type", v)}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v) =>
              setValue("priority", v as CreateIssueInput["priority"])
            }
          />
        </div>

        {/* Sprint + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          {isBoardContext ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] text-text-secondary">Sprint</span>
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-[4px] border border-border-default bg-bg-surface text-[13px] text-text-muted">
                <Lock className="h-3 w-3" />
                {activeSprint!.name}
              </div>
            </div>
          ) : (
            <Select
              label="Sprint"
              placeholder="No sprint"
              options={sprintOptions}
              value={watch("sprintId") ?? ""}
              onValueChange={(v) => setValue("sprintId", v || null)}
            />
          )}
          <Select
            label="Assignee"
            placeholder="Unassigned"
            options={memberOptions}
            value={watch("assigneeId") ?? ""}
            onValueChange={(v) => setValue("assigneeId", v || null)}
          />
        </div>

        {/* Due date */}
        <Controller
          name="dueDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Due date"
              value={(field.value as Date | null) ?? null}
              onChange={field.onChange}
              error={errors.dueDate?.message}
            />
          )}
        />

        {/* Labels */}
        <ProjectLabelSelect
          projectId={projectId}
          label="Labels"
          selectedIds={watch("labelIds") ?? []}
          onChange={(ids) => setValue("labelIds", ids)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create issue"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
