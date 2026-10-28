'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { ProjectRole } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { Select } from '@devflow/ui/components/select';
import { Spinner } from '@devflow/ui/components/spinner';
import { addProjectMemberSchema, type AddProjectMemberInput } from '@devflow/validators';

import { useAddProjectMember, useAvailableProjectMembers } from '../../../hooks/use-projects';
import { displayName, PROJECT_ROLE_OPTIONS } from '../../../lib/roles';
import { PageError } from '../../shared/page-error';
import { SectionHeading } from '../../shared/section-heading';

export function AddMemberTab({ projectId }: { projectId: string }) {
  const { data: available, isLoading, isError, refetch } = useAvailableProjectMembers(projectId);
  const { mutate: addMember, isPending } = useAddProjectMember(projectId);

  const { handleSubmit, setValue, watch, reset } = useForm<AddProjectMemberInput>({
    resolver: zodResolver(addProjectMemberSchema),
    defaultValues: { userId: '', role: 'DEVELOPER' },
  });
  const userId = watch('userId');

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }
  if (isError || !available) {
    return <PageError message="Couldn't load members" onRetry={() => refetch()} />;
  }

  const memberOptions = available.map((m) => ({
    label: displayName(m.user),
    value: m.userId,
  }));

  return (
    <div className="flex max-w-md flex-col gap-4">
      <SectionHeading
        title="Add member"
        description="Add a workspace member to this project. They must already be in the workspace."
      />
      {memberOptions.length === 0 ? (
        <p className="text-body text-text-muted">
          All workspace members are already in this project.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit((data) => addMember(data, { onSuccess: () => reset() }))}
          className="flex flex-col gap-3"
        >
          <Select
            label="Member"
            placeholder="Select a member..."
            options={memberOptions}
            value={userId}
            onValueChange={(value) => setValue('userId', value)}
          />
          <Select
            label="Role"
            options={PROJECT_ROLE_OPTIONS}
            value={watch('role')}
            onValueChange={(role) => setValue('role', role as ProjectRole)}
          />
          <div>
            <Button type="submit" size="sm" loading={isPending} disabled={!userId}>
              Add to project
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
