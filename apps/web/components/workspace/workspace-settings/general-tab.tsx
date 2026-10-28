'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { IWorkspaceSummary } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import { ImageUploadButton } from '@devflow/ui/components/image-upload-button';
import { Input } from '@devflow/ui/components/input';
import { updateWorkspaceSchema, type UpdateWorkspaceInput } from '@devflow/validators';

import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  useUploadWorkspaceLogo,
} from '../../../hooks/use-workspaces';
import { SectionHeading } from '../../shared/section-heading';

export function GeneralTab({ workspace }: { workspace: IWorkspaceSummary }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace(workspace.id);
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace(workspace.id);
  const { uploadLogo, isUploading } = useUploadWorkspaceLogo(workspace.id);

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<UpdateWorkspaceInput>({
    resolver: zodResolver(updateWorkspaceSchema),
    values: { name: workspace.name },
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <SectionHeading
            title="Workspace logo"
            description="Shown in the sidebar and workspace switcher."
          />
          <ImageUploadButton
            src={workspace.logoUrl}
            fallbackLabel={workspace.name.charAt(0).toUpperCase()}
            shape="square"
            size={56}
            isUploading={isUploading}
            onFileSelect={uploadLogo}
          />
        </div>

        <div className="h-px bg-border-default" />

        <div>
          <SectionHeading
            title="Workspace name"
            description="The display name shown across DevFlow."
          />
          <form
            onSubmit={handleSubmit((data) => updateWorkspace(data))}
            className="flex max-w-sm flex-col gap-3"
          >
            <Input placeholder="My workspace" error={errors.name?.message} {...register('name')} />
            <div>
              <Button type="submit" size="sm" loading={isUpdating} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          </form>
        </div>

        <div className="h-px bg-border-default" />

        <div className="flex flex-col gap-3 rounded-base border border-danger-text p-4">
          <p className="text-body font-medium text-danger-text">Danger Zone</p>
          <p className="text-xs text-text-muted">
            Permanently delete this workspace and all its projects, sprints, and issues. This cannot
            be undone.
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
      </div>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() =>
          deleteWorkspace(undefined, {
            onError: () => setShowDeleteModal(false),
          })
        }
        title="Delete workspace?"
        description="All projects, sprints, and issues will be permanently lost. This cannot be undone."
        confirmLabel="Delete workspace"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}
