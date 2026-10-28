'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import type { ISprint, IUserPublic } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { DatePicker } from '@devflow/ui/components/date-picker';
import { FileUploadList } from '@devflow/ui/components/file-upload-list';
import { Input } from '@devflow/ui/components/input';
import { Modal } from '@devflow/ui/components/modal';
import { Select } from '@devflow/ui/components/select';
import { Textarea } from '@devflow/ui/components/textarea';
import {
  createIssueSchema,
  type CreateIssueInput,
  type CreateIssueOutput,
} from '@devflow/validators';

import { useAttachmentUpload } from '../../hooks/use-attachments';
import { useIssueAccess } from '../../hooks/use-issue-access';
import { useCreateIssue } from '../../hooks/use-issues';
import { PRIORITY_OPTIONS } from '../../lib/issue-constants';
import { IssueTypeSelect } from '../shared/issue-type-select';
import { ProjectLabelSelect } from '../shared/project-label-select';

// a field the user can see but not change (sprint)
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <div className="flex h-9 items-center gap-1.5 rounded-[4px] border border-border-default bg-bg-surface px-3 text-[13px] text-text-muted">
        <Lock className="h-3 w-3" />
        {value}
      </div>
    </div>
  );
}

interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprints: ISprint[];
  members: IUserPublic[];
  activeSprint: ISprint | null;
  canSetSprint: boolean;
}

export function CreateIssueModal({
  open,
  onClose,
  projectId,
  sprints,
  members,
  activeSprint,
  canSetSprint,
}: CreateIssueModalProps) {
  const { mutate: createIssue, isPending } = useCreateIssue(projectId);
  const { userId, canAssignAnyone, canEditDueDate } = useIssueAccess();
  const {
    items: pendingFiles,
    addFiles,
    removeFile,
    reset: resetFiles,
    readyAttachments,
  } = useAttachmentUpload(projectId);

  // from the board an issue goes into the active sprint. Without one it lands in the backlog.
  const isBoardContext = !!activeSprint;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateIssueInput, unknown, CreateIssueOutput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: { priority: 'NO_PRIORITY', type: 'TASK', labelIds: [] },
  });

  const sprintOptions = sprints.map((s) => ({ label: s.name, value: s.id }));
  // a developer can assign only themselves (or nobody)
  const assignable = canAssignAnyone ? members : members.filter((m) => m.id === userId);
  const memberOptions = assignable.map((m) => ({
    label: m.name ?? m.email,
    value: m.id,
  }));

  const handleClose = () => {
    reset();
    resetFiles();
    onClose();
  };

  const onSubmit = (data: CreateIssueOutput) => {
    // status is decided by the server: Todo in the active sprint, Backlog otherwise
    const sprintId = isBoardContext ? activeSprint.id : canSetSprint ? data.sprintId || null : null;

    createIssue(
      {
        ...data,
        sprintId,
        assigneeId: data.assigneeId || null,
        dueDate: canEditDueDate ? data.dueDate : null,
        attachments: readyAttachments,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create issue">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Title"
          placeholder="Issue title"
          error={errors.title?.message}
          {...register('title')}
        />

        <Textarea
          label="Description"
          placeholder="Add a description..."
          error={errors.description?.message}
          {...register('description')}
        />
        <FileUploadList items={pendingFiles} onFilesAdded={addFiles} onRemove={removeFile} />

        <div className="grid grid-cols-2 gap-3">
          <IssueTypeSelect
            label="Type"
            value={watch('type')}
            onValueChange={(v) => setValue('type', v)}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={watch('priority')}
            onValueChange={(v) => setValue('priority', v as CreateIssueInput['priority'])}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {isBoardContext ? (
            <LockedField label="Sprint" value={activeSprint.name} />
          ) : canSetSprint ? (
            <Select
              label="Sprint"
              placeholder="No sprint"
              options={sprintOptions}
              value={watch('sprintId') ?? ''}
              onValueChange={(v) => setValue('sprintId', v || null)}
            />
          ) : (
            <LockedField label="Sprint" value="Backlog" />
          )}
          <Select
            label="Assignee"
            placeholder="Unassigned"
            options={memberOptions}
            value={watch('assigneeId') ?? ''}
            onValueChange={(v) => setValue('assigneeId', v || null)}
          />
        </div>

        {/* only leads and admins set due dates */}
        {canEditDueDate && (
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Due date"
                value={(field.value as Date | null) ?? null}
                onChange={field.onChange}
                error={errors.dueDate?.message}
                minDate={new Date()}
              />
            )}
          />
        )}

        <ProjectLabelSelect
          projectId={projectId}
          label="Labels"
          selectedIds={watch('labelIds') ?? []}
          onChange={(ids) => setValue('labelIds', ids)}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            Create issue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
