"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Modal } from "@devflow/ui/components/modal";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Textarea } from "@devflow/ui/components/textarea";
import { Select } from "@devflow/ui/components/select";
import { useCreateIssue } from "../../hooks/use-issues";
import { createIssueSchema, type CreateIssueInput } from "@devflow/validators";
import type { ISprint, IUserPublic } from "@devflow/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprints: ISprint[];
  members: IUserPublic[];
  activeSprint: ISprint | null;
}

const PRIORITY_OPTIONS = [
  { label: "No Priority", value: "NO_PRIORITY" },
  { label: "Urgent", value: "URGENT" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

export function CreateIssueModal({
  open,
  onClose,
  projectId,
  sprints,
  members,
  activeSprint,
}: Props) {
  const { mutateAsync, isPending } = useCreateIssue(projectId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      priority: "NO_PRIORITY",
      sprintId: activeSprint?.id ?? null,
    },
  });

  const sprintOptions = [
    ...sprints.map((s) => ({ label: s.name, value: s.id })),
  ];

  const memberOptions = [
    ...members.map((m) => ({
      label: m.name ?? m.email,
      value: m.id,
    })),
  ];

  const onSubmit = async (data: CreateIssueInput) => {
    try {
      await mutateAsync({
        ...data,
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

        {/* Priority + Sprint row */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={watch("priority")}
            onValueChange={(v) =>
              setValue("priority", v as CreateIssueInput["priority"])
            }
          />
          <Select
            label="Sprint"
            placeholder="No sprint"
            options={sprintOptions}
            value={watch("sprintId") ?? ""}
            onValueChange={(v) => setValue("sprintId", v || null)}
          />
        </div>

        {/* Assignee */}
        <Select
          label="Assignee"
          placeholder="Unassigned"
          options={memberOptions}
          value={watch("assigneeId") ?? ""}
          onValueChange={(v) => setValue("assigneeId", v || null)}
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
