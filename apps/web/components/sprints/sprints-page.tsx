"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import {
  useSprints,
  useStartSprint,
  useCompleteSprint,
} from "../../hooks/use-sprints";
import { CreateSprintModal } from "./create-sprint-modal";
import { SprintCard } from "./sprint-card";
import { toast } from "sonner";
import type { ISprintWithCount } from "@devflow/types";

export function SprintsPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [showModal, setShowModal] = useState(false);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);
  const { data: sprints, isLoading } = useSprints(project?.id ?? "");

  const { mutate: startSprint, isPending: starting } = useStartSprint(
    project?.id ?? "",
  );
  const { mutate: completeSprint, isPending: completing } = useCompleteSprint(
    project?.id ?? "",
  );

  const activeSprint = sprints?.find((s) => s.status === "ACTIVE");
  const plannedSprints = sprints?.filter((s) => s.status === "PLANNED") ?? [];
  const completedSprints =
    sprints?.filter((s) => s.status === "COMPLETED") ?? [];

  const handleStart = (sprintId: string) => {
    if (activeSprint) {
      toast.error("Complete the active sprint first");
      return;
    }
    startSprint(sprintId, {
      onSuccess: () => toast.success("Sprint started!"),
      onError: () => toast.error("Failed to start sprint"),
    });
  };

  const handleComplete = (sprintId: string) => {
    completeSprint(sprintId, {
      onSuccess: () =>
        toast.success("Sprint completed! Incomplete issues moved to backlog."),
      onError: () => toast.error("Failed to complete sprint"),
    });
  };

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-muted">Project not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-text-primary">Sprints</h1>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New sprint
        </Button>
      </div>

      <div className="h-px bg-border-default" />

      {/* No sprints */}
      {!sprints?.length && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border-default rounded-[4px]">
          <p className="text-[13px] text-text-muted">No sprints yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Create your first sprint
          </Button>
        </div>
      )}

      {/* Active sprint */}
      {activeSprint && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
            Active
          </p>
          <SprintCard
            sprint={activeSprint}
            onComplete={() => handleComplete(activeSprint.id)}
            completing={completing}
            active
          />
        </div>
      )}

      {/* Planned sprints */}
      {plannedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
            Planned
          </p>
          <div className="flex flex-col gap-2">
            {plannedSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onStart={() => handleStart(sprint.id)}
                starting={starting}
                hasActiveSprint={!!activeSprint}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed sprints */}
      {completedSprints.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
            Completed
          </p>
          <div className="flex flex-col gap-2">
            {completedSprints.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} />
            ))}
          </div>
        </div>
      )}

      {project && (
        <CreateSprintModal
          open={showModal}
          onClose={() => setShowModal(false)}
          projectId={project.id}
        />
      )}
    </div>
  );
}
