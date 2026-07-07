"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Modal } from "@devflow/ui/components/modal";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import {
  ColorPicker,
  DEFAULT_PROJECT_COLOR,
} from "@devflow/ui/components/color-picker";
import { useCreateProject } from "../../hooks/use-projects";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@devflow/validators";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceSlug: string;
}

export function CreateProjectModal({
  open,
  onClose,
  workspaceId,
  workspaceSlug,
}: Props) {
  const { mutateAsync, isPending } = useCreateProject(workspaceId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { color: DEFAULT_PROJECT_COLOR },
  });

  const name = watch("name");
  useEffect(() => {
    if (name) {
      setValue(
        "slug",
        name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
    }
  }, [name, setValue]);

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      await mutateAsync(data);
      toast.success("Project created!");
      reset({ color: DEFAULT_PROJECT_COLOR });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create project");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create project"
      description="Projects contain your board, backlog and sprints."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Project name"
          placeholder="Frontend"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Slug"
          placeholder="frontend"
          error={errors.slug?.message}
          {...register("slug")}
        />
        <Input
          label="Description"
          placeholder="What is this project about?"
          error={errors.description?.message}
          {...register("description")}
        />
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorPicker
              label="Color"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create project"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
