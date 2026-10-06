'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ISprintWithCount } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { Input } from '@devflow/ui/components/input';
import { Modal } from '@devflow/ui/components/modal';
import { updateSprintSchema, type UpdateSprintInput } from '@devflow/validators';

import { useUpdateSprint } from '../../hooks/use-sprints';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprint: ISprintWithCount;
}

export function EditSprintModal({ open, onClose, projectId, sprint }: Props) {
  const { mutateAsync, isPending } = useUpdateSprint(projectId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UpdateSprintInput>({
    resolver: zodResolver(updateSprintSchema),
    defaultValues: {
      name: sprint.name,
      startDate: sprint.startDate ? new Date(sprint.startDate) : null,
      endDate: sprint.endDate ? new Date(sprint.endDate) : null,
    },
  });

  // re-sync if a different sprint is opened into the same modal instance
  useEffect(() => {
    reset({
      name: sprint.name,
      startDate: sprint.startDate ? new Date(sprint.startDate) : null,
      endDate: sprint.endDate ? new Date(sprint.endDate) : null,
    });
  }, [sprint.id, reset]);

  const onSubmit = async (data: UpdateSprintInput) => {
    try {
      await mutateAsync({ sprintId: sprint.id, data });
      toast.success('Sprint updated!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update sprint');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit sprint"
      description="Update the sprint name or dates."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
