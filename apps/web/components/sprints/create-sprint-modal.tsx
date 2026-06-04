"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Modal } from "@devflow/ui/components/modal";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { useCreateSprint } from "../../hooks/use-sprints";
import {
  createSprintSchema,
  type CreateSprintInput,
} from "@devflow/validators";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateSprintModal({ open, onClose, projectId }: Props) {
  const { mutateAsync, isPending } = useCreateSprint(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSprintInput>({
    resolver: zodResolver(createSprintSchema),
  });

  const onSubmit = async (data: CreateSprintInput) => {
    try {
      await mutateAsync(data);
      toast.success("Sprint created!");
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create sprint");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create sprint"
      description="Plan your next sprint with a name and dates."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Sprint name"
          placeholder="Sprint 1"
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start date"
            type="date"
            error={errors.startDate?.message}
            {...register("startDate")}
          />
          <Input
            label="End date"
            type="date"
            error={errors.endDate?.message}
            {...register("endDate")}
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create sprint"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
