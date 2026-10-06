'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import type { ISprintWithCount } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';

import { usePermissions } from '../../hooks/use-permissions';
import { useProjects } from '../../hooks/use-projects';
import {
  useCompleteSprint,
  useDeleteSprint,
  useSprints,
  useStartSprint,
} from '../../hooks/use-sprints';
import { useWorkspaces } from '../../hooks/use-workspaces';
import { canProject } from '../../lib/permissions';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';
import { CreateSprintModal } from './create-sprint-modal';
import { EditSprintModal } from './edit-sprint-modal';
import { SprintCard } from './sprint-card';

export function SprintsPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<ISprintWithCount | null>(null);

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const {
    data: projects,
    isLoading: projLoading,
    isError: projError,
    refetch: refetchProjects,
  } = useProjects(workspace?.id ?? '');
  const project = projects?.find((p) => p.slug === projectSlug);

  const {
    data: sprints,
    isLoading: sprintsLoading,
    isError: sprintsError,
    refetch: refetchSprints,
  } = useSprints(project?.id ?? '');

  const { access, isLoading: permLoading } = usePermissions();
  const canAccessSprints = canProject(access, 'CREATE_SPRINT');

  const [startingId, setStartingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: startSprint } = useStartSprint(project?.id ?? '');
  const { mutate: completeSprint, isPending: completing } = useCompleteSprint(project?.id ?? '');
  const { mutate: deleteSprint } = useDeleteSprint(project?.id ?? '');

  useEffect(() => {
    if (wsLoading || projLoading || permLoading || !project) return;
    if (!canAccessSprints) {
      router.replace(`/no-access?reason=insufficient-role&workspace=${workspaceSlug}`);
    }
  }, [wsLoading, projLoading, permLoading, canAccessSprints, project, router, workspaceSlug]);

  if (wsLoading || projLoading || sprintsLoading || permLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return <PageError message="Couldn't load workspace" onRetry={() => refetchWorkspaces()} />;
  }

  if (projError) {
    return <PageError message="Couldn't load project" onRetry={() => refetchProjects()} />;
  }

  if (sprintsError) {
    return <PageError message="Couldn't load sprints" onRetry={() => refetchSprints()} />;
  }

  if (!project || !canAccessSprints) {
    return <PageLoading />; // !project → ProjectAccessGuard safety net; !canAccessSprints → redirect in flight
  }

  const activeSprint = sprints?.find((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints?.filter((s) => s.status === 'PLANNED') ?? [];
  const completedSprints = sprints?.filter((s) => s.status === 'COMPLETED') ?? [];

  const handleStart = (sprintId: string) => {
    if (activeSprint) {
      toast.error('Complete the active sprint first');
      return;
    }
    setStartingId(sprintId);
    startSprint(sprintId, {
      onSuccess: () => toast.success('Sprint started!'),
      onError: () => toast.error('Failed to start sprint'),
      onSettled: () => setStartingId(null),
    });
  };

  const handleComplete = (sprintId: string) => {
    completeSprint(sprintId, {
      onSuccess: () => toast.success('Sprint completed! Incomplete issues moved to backlog.'),
      onError: () => toast.error('Failed to complete sprint'),
    });
  };

  const handleDelete = (sprintId: string) => {
    setDeletingId(sprintId);
    deleteSprint(sprintId, {
      onSuccess: () => toast.success('Sprint deleted'),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete sprint'),
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-text-primary">Sprints</h1>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New sprint
        </Button>
      </div>

      <div className="h-px bg-border-default" />

      {!sprints?.length && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[4px] border border-border-default py-20">
          <p className="text-[13px] text-text-muted">No sprints yet</p>
          <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
            Create your first sprint
          </Button>
        </div>
      )}

      {activeSprint && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
            Active
          </p>
          <SprintCard
            sprint={activeSprint}
            onComplete={() => handleComplete(activeSprint.id)}
            onEdit={() => setEditingSprint(activeSprint)}
            completing={completing}
            active
          />
        </div>
      )}

      {plannedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
            Planned {plannedSprints.length}
          </p>
          <div className="flex flex-col gap-2">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onStart={() => handleStart(sprint.id)}
                onEdit={() => setEditingSprint(sprint)}
                onDelete={() => handleDelete(sprint.id)}
                starting={startingId === sprint.id}
                deleting={deletingId === sprint.id}
                hasActiveSprint={!!activeSprint}
              />
            ))}
          </div>
        </div>
      )}

      {completedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
            Completed {completedSprints.length}
          </p>
          <div className="flex flex-col gap-2">
            {completedSprints.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} />
            ))}
          </div>
        </div>
      )}

      <CreateSprintModal
        open={showModal}
        onClose={() => setShowModal(false)}
        projectId={project.id}
      />

      {editingSprint && (
        <EditSprintModal
          open={!!editingSprint}
          onClose={() => setEditingSprint(null)}
          projectId={project.id}
          sprint={editingSprint}
        />
      )}
    </div>
  );
}
