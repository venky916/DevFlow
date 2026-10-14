"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@devflow/ui/components/button";
import {
  ColorPicker,
  DEFAULT_PROJECT_COLOR,
} from "@devflow/ui/components/color-picker";
import { Input } from "@devflow/ui/components/input";
import { Modal } from "@devflow/ui/components/modal";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@devflow/validators";

import { useCreateProject } from "../../hooks/use-projects";
import { slugify } from "../../lib/slugify";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function CreateProjectModal({
  open,
  onClose,
  workspaceId,
}: CreateProjectModalProps) {
  const { mutate: createProject, isPending } = useCreateProject(workspaceId);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { color: DEFAULT_PROJECT_COLOR },
  });

  const handleClose = () => {
    reset({ color: DEFAULT_PROJECT_COLOR });
    onClose();
  };

  const nameField = register("name");

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create project"
      description="Projects contain your board, backlog and sprints."
    >
      <form
        onSubmit={handleSubmit((data) =>
          createProject(data, { onSuccess: handleClose }),
        )}
        className="flex flex-col gap-4"
      >
        <Input
          label="Project name"
          placeholder="Frontend"
          error={errors.name?.message}
          {...nameField}
          onChange={(e) => {
            nameField.onChange(e);
            setValue("slug", slugify(e.target.value));
          }}
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
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
