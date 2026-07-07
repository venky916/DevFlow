"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import {
  ColorPicker,
  DEFAULT_PROJECT_COLOR,
} from "@devflow/ui/components/color-picker";
import { ConfirmModal } from "@devflow/ui/components/confirm-modal";
import { SectionHeading } from "../../shared/section-heading";
import {
  useUpdateProject,
  useDeleteProject,
} from "../../../hooks/use-projects";
import type { UpdateProjectInput } from "@devflow/validators";

interface Props {
  projectId: string;
  workspaceId: string;
  projectName: string;
  projectDescription: string | null;
  projectColor: string | null;
  canDelete: boolean;
}

export function GeneralTab({
  projectId,
  workspaceId,
  projectName,
  projectDescription,
  projectColor,
  canDelete,
}: Props) {
  const router = useRouter();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(
    projectId,
    workspaceId,
  );
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject(
    projectId,
    workspaceId,
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty },
  } = useForm<UpdateProjectInput>({
    values: {
      name: projectName,
      description: projectDescription ?? "",
      color: projectColor ?? DEFAULT_PROJECT_COLOR,
    },
  });

  const onSave = (data: UpdateProjectInput) => {
    updateProject(data, {
      onSuccess: () => toast.success("Project updated"),
      onError: () => toast.error("Failed to update project"),
    });
  };

  const onDelete = () => {
    deleteProject(undefined, {
      onSuccess: () => {
        toast.success("Project deleted");
        router.push(`/${workspaceSlug}`);
      },
      onError: () => {
        toast.error("Failed to delete project");
        setShowDeleteModal(false);
      },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <SectionHeading
            title="Project details"
            description="Update the project name, description and color."
          />
          <form
            onSubmit={handleSubmit(onSave)}
            className="flex flex-col gap-3 max-w-[400px]"
          >
            <Input label="Project name" {...register("name")} />
            <Input label="Description" {...register("description")} />
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
            <div>
              <Button type="submit" size="sm" disabled={isUpdating || !isDirty}>
                {isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </div>

        {canDelete && (
          <>
            <div className="h-px bg-border-default" />
            <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
              <p className="text-[13px] font-medium text-danger-text">
                Danger Zone
              </p>
              <p className="text-[12px] text-text-muted">
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
        onConfirm={onDelete}
        title="Delete project?"
        description="All issues, sprints, and data will be permanently lost. This cannot be undone."
        confirmLabel="Delete project"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
