'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@devflow/ui/components/button';
import { ImageUploadButton } from '@devflow/ui/components/image-upload-button';
import { Input } from '@devflow/ui/components/input';
import { Modal } from '@devflow/ui/components/modal';
import { createWorkspaceSchema, type CreateWorkspaceInput } from '@devflow/validators';

import { useUploadImage } from '../../hooks/use-upload';
import { useCreateWorkspace } from '../../hooks/use-workspaces';
import { slugify } from '../../lib/slugify';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const { mutate: createWorkspace, isPending } = useCreateWorkspace();
  const { uploadImage, isUploading } = useUploadImage('logos');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
  });

  const name = watch('name');

  const handleClose = () => {
    reset();
    setLogoUrl(null);
    setPreviewUrl(null);
    onClose();
  };

  const handleLogoSelect = async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    const url = await uploadImage(file); // the hook shows the error toast and returns null on failure
    if (url) setLogoUrl(url);
    else setPreviewUrl(null);
  };

  const nameField = register('name');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create workspace"
      description="A workspace contains your projects and team members."
    >
      <form
        onSubmit={handleSubmit((data) =>
          createWorkspace({ ...data, logoUrl: logoUrl ?? undefined }, { onSuccess: handleClose }),
        )}
        className="flex flex-col gap-4"
      >
        <ImageUploadButton
          src={previewUrl ?? logoUrl}
          fallbackLabel={name?.charAt(0).toUpperCase() || '?'}
          shape="square"
          size={56}
          isUploading={isUploading}
          onFileSelect={handleLogoSelect}
        />
        <Input
          label="Workspace name"
          placeholder="Acme Inc"
          error={errors.name?.message}
          {...nameField}
          onChange={(e) => {
            nameField.onChange(e);
            setValue('slug', slugify(e.target.value));
          }}
        />
        <Input
          label="Slug"
          placeholder="acme-inc"
          error={errors.slug?.message}
          {...register('slug')}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={isUploading}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
