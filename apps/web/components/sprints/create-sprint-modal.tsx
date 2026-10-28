'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@devflow/ui/components/button';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Input } from '@devflow/ui/components/input';
import { Modal } from '@devflow/ui/components/modal';
import {
  createSprintSchema,
  type CreateSprintInput,
  type CreateSprintOutput,
} from '@devflow/validators';

import { useCreateSprint } from '../../hooks/use-sprints';

interface CreateSprintModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateSprintModal({ open, onClose, projectId }: CreateSprintModalProps) {
  const { mutate: createSprint, isPending } = useCreateSprint(projectId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSprintInput, unknown, CreateSprintOutput>({
    resolver: zodResolver(createSprintSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create sprint"
      description="Plan your next sprint with a name and dates."
    >
      <form
        onSubmit={handleSubmit((data) => createSprint(data, { onSuccess: handleClose }))}
        className="flex flex-col gap-4"
      >
        <Input
          label="Sprint name"
          placeholder="Sprint 1"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start date"
                value={(field.value as Date | null) ?? null}
                onChange={field.onChange}
                error={errors.startDate?.message}
              />
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End date"
                value={(field.value as Date | null) ?? null}
                onChange={field.onChange}
                error={errors.endDate?.message}
              />
            )}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Create sprint
          </Button>
        </div>
      </form>
    </Modal>
  );
}
