"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Filter, RotateCw } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Badge } from "@devflow/ui/components/badge";
import { KanbanBoard } from "./kanban-board";
import { useBoard } from "../../hooks/use-board";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBoardStore } from "../../stores/board.store";
import type { IIssueWithRelations, IUserPublic } from "@devflow/types";
import { useProjectSprints, useProjectMembers } from "../../hooks/use-issues";
import { CreateIssueModal } from "./create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";

export function BoardPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [selectedIssue, setSelectedIssue] =
    useState<IIssueWithRelations | null>(null);
  const activeSprint = useBoardStore((s) => s.activeSprint);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);
  const { isLoading } = useBoard(project?.id ?? "");

  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const { data: sprints } = useProjectSprints(project?.id ?? "");
  const { data: members } = useProjectMembers(project?.id ?? "");

  const memberUsers: IUserPublic[] =
    members?.map((m) => m.user!).filter(Boolean) ?? [];

  const selectedIssueId = selectedIssue?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-text-primary">
            {activeSprint?.name ?? "No active sprint"}
          </span>
          {activeSprint && <Badge variant="success">Active</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateIssue(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Issue
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {project && (
          <KanbanBoard projectId={project.id} onIssueClick={setSelectedIssue} />
        )}
      </div>

      {project && (
        <CreateIssueModal
          open={showCreateIssue}
          onClose={() => setShowCreateIssue(false)}
          projectId={project.id}
          sprints={sprints ?? []}
          members={memberUsers}
          activeSprint={activeSprint}
        />
      )}

      {project && (
        <IssueSlideOver
          issueId={selectedIssueId}
          onClose={() => setSelectedIssue(null)}
          projectId={project.id}
        />
      )}
    </div>
  );
}
