'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

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

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateSprintModal({ open, onClose, projectId }: Props) {
  const { mutateAsync, isPending } = useCreateSprint(projectId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSprintInput, any, CreateSprintOutput>({
    resolver: zodResolver(createSprintSchema),
  });

  const onSubmit = async (data: CreateSprintOutput) => {
    try {
      await mutateAsync(data);
      toast.success('Sprint created!');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create sprint');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create sprint"
      description="Plan your next sprint with a name and dates."
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create sprint'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
