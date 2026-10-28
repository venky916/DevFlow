'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import type { ISprintWithCount } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Input } from '@devflow/ui/components/input';
import { Modal } from '@devflow/ui/components/modal';
import {
  updateSprintSchema,
  type UpdateSprintInput,
  type UpdateSprintOutput,
} from '@devflow/validators';

import { useUpdateSprint } from '../../hooks/use-sprints';

interface EditSprintModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprint: ISprintWithCount;
}

export function EditSprintModal({ open, onClose, projectId, sprint }: EditSprintModalProps) {
  const { mutate: updateSprint, isPending } = useUpdateSprint(projectId);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateSprintInput, unknown, UpdateSprintOutput>({
    resolver: zodResolver(updateSprintSchema),
    // the page mounts this modal only while a sprint is being edited, so defaults are fresh each time
    defaultValues: {
      name: sprint.name,
      startDate: sprint.startDate ? new Date(sprint.startDate) : null,
      endDate: sprint.endDate ? new Date(sprint.endDate) : null,
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit sprint"
      description="Update the sprint name or dates."
    >
      <form
        onSubmit={handleSubmit((data) =>
          updateSprint({ sprintId: sprint.id, data }, { onSuccess: onClose }),
        )}
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
