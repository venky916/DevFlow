"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { ConfirmModal } from "@devflow/ui/components/confirm-modal";
import { SectionHeading } from "../../shared/section-heading";
import {
  useUpdateWorkspace,
  useDeleteWorkspace,
} from "../../../hooks/use-workspaces";
import type { UpdateWorkspaceInput } from "@devflow/validators";

interface Props {
  workspaceId: string;
  workspaceName: string;
  isAdmin: boolean;
}

export function GeneralTab({ workspaceId, workspaceName, isAdmin }: Props) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: updateWorkspace, isPending: isUpdating } =
    useUpdateWorkspace(workspaceId);
  const { mutate: deleteWorkspace, isPending: isDeleting } =
    useDeleteWorkspace(workspaceId);

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<UpdateWorkspaceInput>({
    values: { name: workspaceName },
  });

  const onSave = (data: UpdateWorkspaceInput) => {
    updateWorkspace(data, {
      onSuccess: () => toast.success("Workspace updated"),
      onError: () => toast.error("Failed to update workspace"),
    });
  };

  const onDelete = () => {
    deleteWorkspace(undefined, {
      onSuccess: () => {
        toast.success("Workspace deleted");
        router.push("/workspaces");
      },
      onError: () => {
        toast.error("Failed to delete workspace");
        setShowDeleteModal(false);
      },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <SectionHeading
            title="Workspace name"
            description="The display name shown across DevFlow."
          />
          <form
            onSubmit={handleSubmit(onSave)}
            className="flex flex-col gap-3 max-w-[400px]"
          >
            <Input {...register("name")} placeholder="My workspace" />
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

        {isAdmin && (
          <>
            <div className="h-px bg-border-default" />
            <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
              <p className="text-[13px] font-medium text-danger-text">
                Danger Zone
              </p>
              <p className="text-[12px] text-text-muted">
                Permanently delete this workspace and all its projects, sprints,
                and issues. This cannot be undone.
              </p>
              <div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                >
                  Delete workspace
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
        title="Delete workspace?"
        description="All projects, sprints, and issues will be permanently lost. This cannot be undone."
        confirmLabel="Delete workspace"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
