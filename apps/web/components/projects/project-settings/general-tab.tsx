"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import type { IProjectSummary } from "@devflow/types";
import { Button } from "@devflow/ui/components/button";
import {
  ColorPicker,
  DEFAULT_PROJECT_COLOR,
} from "@devflow/ui/components/color-picker";
import { ConfirmModal } from "@devflow/ui/components/confirm-modal";
import { Input } from "@devflow/ui/components/input";
import {
  updateProjectSchema,
  type UpdateProjectInput,
} from "@devflow/validators";

import {
  useDeleteProject,
  useUpdateProject,
} from "../../../hooks/use-projects";
import { canDeleteProject } from "../../../lib/permissions";
import { SectionHeading } from "../../shared/section-heading";

interface GeneralTabProps {
  project: IProjectSummary;
  workspaceSlug: string;
}

export function GeneralTab({ project, workspaceSlug }: GeneralTabProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // workspace admins only. A project LEAD can edit the project but not delete it
  const canDelete = canDeleteProject(project.currentUserAccess);

  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(
    project.id,
  );
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject(
    project.id,
    workspaceSlug,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty, errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    values: {
      name: project.name,
      description: project.description ?? "",
      color: project.color ?? DEFAULT_PROJECT_COLOR,
    },
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <SectionHeading
            title="Project details"
            description="Update the project name, description and color."
          />
          <form
            onSubmit={handleSubmit((data) => updateProject(data))}
            className="flex max-w-sm flex-col gap-3"
          >
            <Input
              label="Project name"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Description"
              error={errors.description?.message}
              {...register("description")}
            />
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker
                  label="Color"
                  value={field.value ?? DEFAULT_PROJECT_COLOR}
                  onChange={field.onChange}
                />
              )}
            />
            <div>
              <Button
                type="submit"
                size="sm"
                loading={isUpdating}
                disabled={!isDirty}
              >
                Save changes
              </Button>
            </div>
          </form>
        </div>

        {canDelete && (
          <>
            <div className="h-px bg-border-default" />
            <div className="flex flex-col gap-3 rounded-base border border-danger-text p-4">
              <p className="text-body font-medium text-danger-text">
                Danger Zone
              </p>
              <p className="text-xs text-text-muted">
                Permanently delete this project and all its issues, sprints, and
                data. This cannot be undone.
              </p>
              <div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                >
                  Delete project
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() =>
          deleteProject(undefined, { onError: () => setShowDeleteModal(false) })
        }
        title="Delete project?"
        description="All issues, sprints, and data will be permanently lost. This cannot be undone."
        confirmLabel="Delete project"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
