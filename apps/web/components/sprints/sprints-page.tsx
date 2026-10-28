'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Zap } from 'lucide-react';

import type { ISprintWithCount } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';

import { useRequireProjectAccess } from '../../hooks/use-projects';
import {
  useCompleteSprint,
  useDeleteSprint,
  useSprints,
  useStartSprint,
} from '../../hooks/use-sprints';
import { EmptyState } from '../shared/empty-state';
import { PageContainer } from '../shared/page-container';
import { PageError } from '../shared/page-error';
import { PageHeading } from '../shared/page-heading';
import { PageLoading } from '../shared/page-loading';
import { PanelTitle } from '../shared/panel-title';
import { CreateSprintModal } from './create-sprint-modal';
import { EditSprintModal } from './edit-sprint-modal';
import { SprintCard } from './sprint-card';

export function SprintsPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { project, isAllowed } = useRequireProjectAccess(
    workspaceSlug,
    projectSlug,
    'CREATE_SPRINT',
  );
  const projectId = isAllowed && project ? project.id : '';

  const { data: sprints, isLoading, isError, refetch } = useSprints(projectId);
  const {
    mutate: startSprint,
    isPending: starting,
    variables: startingId,
  } = useStartSprint(projectId);
  const { mutate: completeSprint, isPending: completing } = useCompleteSprint(projectId);
  const {
    mutate: deleteSprint,
    isPending: deleting,
    variables: deletingId,
  } = useDeleteSprint(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [editingSprint, setEditingSprint] = useState<ISprintWithCount | null>(null);

  // the guard already loaded the project; this also covers the redirect in flight
  if (!project || !isAllowed || isLoading) return <PageLoading />;
  if (isError || !sprints) {
    return <PageError message="Couldn't load sprints" onRetry={() => refetch()} />;
  }

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');

  return (
    <PageContainer size="full">
      <PageHeading
        title="Sprints"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 size-3.5" />
            New sprint
          </Button>
        }
      />

      <div className="h-px bg-border-default" />

      {sprints.length === 0 && (
        <EmptyState
          icon={<Zap className="size-5" />}
          message="No sprints yet"
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
              Create your first sprint
            </Button>
          }
        />
      )}

      {activeSprint && (
        <div className="flex flex-col gap-3">
          <PanelTitle>Active</PanelTitle>
          <SprintCard
            sprint={activeSprint}
            active
            onComplete={() => completeSprint(activeSprint.id)}
            onEdit={() => setEditingSprint(activeSprint)}
            completing={completing}
          />
        </div>
      )}

      {plannedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <PanelTitle>Planned {plannedSprints.length}</PanelTitle>
          <div className="flex flex-col gap-2">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onStart={() => startSprint(sprint.id)}
                onEdit={() => setEditingSprint(sprint)}
                onDelete={() => deleteSprint(sprint.id)}
                starting={starting && startingId === sprint.id}
                deleting={deleting && deletingId === sprint.id}
                hasActiveSprint={!!activeSprint}
              />
            ))}
          </div>
        </div>
      )}

      {completedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <PanelTitle>Completed {completedSprints.length}</PanelTitle>
          <div className="flex flex-col gap-2">
            {completedSprints.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} />
            ))}
          </div>
        </div>
      )}

      <CreateSprintModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={project.id}
      />

      {editingSprint && (
        <EditSprintModal
          open
          onClose={() => setEditingSprint(null)}
          projectId={project.id}
          sprint={editingSprint}
        />
      )}
    </PageContainer>
  );
}
