"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Badge } from "@devflow/ui/components/badge";
import { cn } from "@devflow/ui/lib/cn";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBacklogGrouped, useMoveToSprint } from "../../hooks/use-backlog";
import { useMoveIssue } from "../../hooks/use-board";
import { useProjectMembers, useProjectSprints } from "../../hooks/use-issues";
import { CreateIssueModal } from "../issue/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";
import { IssueRow } from "./issue-row";
import { FilterBar, type IssueFilters } from "../shared/filter-bar";
import { getFractionalPosition } from "../../lib/fractional-position";
import { PRIORITY_COLORS } from "../../lib/issue-constants";
import type { IIssueWithRelations, ISprint } from "@devflow/types";

function SprintSection({
  sprint,
  onOpen,
}: {
  sprint: ISprint & { issues: IIssueWithRelations[] };
  onOpen: (issueId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: sprint.id });

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 px-2 py-2 hover:bg-bg-hover rounded-[4px] transition-colors group"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
        )}
        <span className="text-[13px] font-medium text-text-primary">
          {sprint.name}
        </span>
        <Badge variant={sprint.status === "ACTIVE" ? "success" : "neutral"}>
          {sprint.status === "ACTIVE" ? "Active" : "Planned"}
        </Badge>
        <span className="text-[11px] font-mono text-text-muted ml-1">
          {sprint.issues.length} issues
        </span>
      </button>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col ml-5 rounded-[4px] transition-colors",
          isOver && "bg-bg-hover",
          collapsed ? "min-h-0" : "min-h-[32px]",
        )}
      >
        <div className={collapsed ? "hidden" : "flex flex-col"}>
          <SortableContext
            items={sprint.issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {sprint.issues.length === 0 ? (
              <p className="text-[12px] text-text-disabled px-3 py-2">
                No issues — drag here to add
              </p>
            ) : (
              sprint.issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} onOpen={onOpen} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

function BacklogSection({
  issues,
  onOpen,
}: {
  issues: IIssueWithRelations[];
  onOpen: (issueId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "BACKLOG" });

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 px-2 py-2 hover:bg-bg-hover rounded-[4px] transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
        )}
        <span className="text-[13px] font-medium text-text-primary">
          Backlog
        </span>
        <span className="text-[11px] font-mono text-text-muted ml-1">
          {issues.length} issues
        </span>
      </button>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col ml-5 rounded-[4px] transition-colors",
          isOver && "bg-bg-hover",
          collapsed ? "min-h-0" : "min-h-[32px]",
        )}
      >
        <div className={collapsed ? "hidden" : "flex flex-col"}>
          <SortableContext
            items={issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {issues.length === 0 ? (
              <p className="text-[12px] text-text-disabled px-3 py-2">
                No issues in backlog
              </p>
            ) : (
              issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} onOpen={onOpen} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

export function BacklogPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<IIssueWithRelations | null>(
    null,
  );
  const [filters, setFilters] = useState<IssueFilters>({});

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  const { data, isLoading, isFetching, refetch } = useBacklogGrouped(
    project?.id ?? "",
    filters,
  );
  const { data: sprints } = useProjectSprints(project?.id ?? "");
  const { data: members } = useProjectMembers(project?.id ?? "");
  const { mutate: moveToSprint } = useMoveToSprint(project?.id ?? "");
  const { mutate: moveIssue } = useMoveIssue();

  const [localSprints, setLocalSprints] = useState<
    (ISprint & { issues: IIssueWithRelations[] })[]
  >([]);
  const [localBacklog, setLocalBacklog] = useState<IIssueWithRelations[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findIssue(issueId: string): IIssueWithRelations | null {
    for (const sprint of localSprints) {
      const found = sprint.issues.find((i) => i.id === issueId);
      if (found) return found;
    }
    return localBacklog.find((i) => i.id === issueId) ?? null;
  }

  function findContainer(issueId: string): string | null {
    for (const sprint of localSprints) {
      if (sprint.issues.some((i) => i.id === issueId)) return sprint.id;
    }
    if (localBacklog.some((i) => i.id === issueId)) return "BACKLOG";
    return null;
  }

  function getListFor(containerId: string): IIssueWithRelations[] {
    if (containerId === "BACKLOG") return localBacklog;
    return localSprints.find((s) => s.id === containerId)?.issues ?? [];
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveIssue(findIssue(event.active.id as string));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);
    if (!over || !data) return;

    const issueId = active.id as string;
    const overId = over.id as string;
    if (issueId === overId) return;

    const fromContainer = findContainer(issueId);
    const allSprintIds = localSprints.map((s) => s.id);

    let toContainer: string;
    if (overId === "BACKLOG" || allSprintIds.includes(overId)) {
      toContainer = overId;
    } else {
      toContainer = findContainer(overId) ?? "BACKLOG";
    }
    if (!fromContainer) return;

    const movedIssue = findIssue(issueId);
    if (!movedIssue) return;

    // ─── same-section reorder ──────────────────────────────────
    if (fromContainer === toContainer) {
      const list = getListFor(fromContainer);
      const oldIndex = list.findIndex((i) => i.id === issueId);
      const newIndex = list.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(list, oldIndex, newIndex);
      const dropIndex = reordered.findIndex((i) => i.id === issueId);
      const listWithoutDragged = reordered.filter((i) => i.id !== issueId);
      const newPosition = getFractionalPosition(listWithoutDragged, dropIndex);

      const updatedIssue = { ...movedIssue, position: newPosition };
      const finalList = reordered.map((i) =>
        i.id === issueId ? updatedIssue : i,
      );

      if (fromContainer === "BACKLOG") {
        setLocalBacklog(finalList);
      } else {
        setLocalSprints((prev) =>
          prev.map((s) =>
            s.id === fromContainer ? { ...s, issues: finalList } : s,
          ),
        );
      }

      moveIssue(
        { issueId, data: { status: movedIssue.status, position: newPosition } },
        {
          onError: () => {
            if (data) {
              setLocalSprints(data.sprints);
              setLocalBacklog(data.backlogIssues);
            }
            toast.error("Failed to reorder issue");
          },
        },
      );
      return;
    }

    // ─── cross-section move ─────────────────────────────────────
    const destList = getListFor(toContainer);
    const overIndex = destList.findIndex((i) => i.id === overId);
    const dropIndex = overIndex >= 0 ? overIndex : destList.length;
    const newPosition = getFractionalPosition(destList, dropIndex);
    const updatedIssue = { ...movedIssue, position: newPosition };

    if (fromContainer === "BACKLOG") {
      setLocalBacklog((prev) => prev.filter((i) => i.id !== issueId));
    } else {
      setLocalSprints((prev) =>
        prev.map((s) =>
          s.id === fromContainer
            ? { ...s, issues: s.issues.filter((i) => i.id !== issueId) }
            : s,
        ),
      );
    }

    if (toContainer === "BACKLOG") {
      setLocalBacklog((prev) => {
        const next = [...prev];
        next.splice(dropIndex, 0, updatedIssue);
        return next;
      });
    } else {
      setLocalSprints((prev) =>
        prev.map((s) => {
          if (s.id !== toContainer) return s;
          const next = [...s.issues];
          next.splice(dropIndex, 0, updatedIssue);
          return { ...s, issues: next };
        }),
      );
    }

    const sprintId = toContainer === "BACKLOG" ? null : toContainer;
    moveToSprint(
      { issueId, data: { sprintId, position: newPosition } },
      {
        onError: () => {
          if (data) {
            setLocalSprints(data.sprints);
            setLocalBacklog(data.backlogIssues);
          }
          toast.error("Failed to move issue");
        },
      },
    );
  };

  useEffect(() => {
    if (!data) return;
    setLocalSprints(data.sprints);
    setLocalBacklog(data.backlogIssues);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalIssues =
    (data?.sprints.reduce((acc, s) => acc + s.issues.length, 0) ?? 0) +
    (data?.backlogIssues.length ?? 0);
  const memberUsers = members?.map((m) => m.user!).filter(Boolean) ?? [];

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-medium text-text-primary">
            Backlog
            <span className="ml-2 text-text-muted font-normal">
              {totalIssues} issues
            </span>
          </h1>
          <div className="h-4 w-px bg-border-default" />
          {project && (
            <FilterBar
              fields={["assignee", "label", "priority", "type", "dueDate"]}
              projectId={project.id}
              members={memberUsers}
              filters={filters}
              onChange={setFilters}
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Issue
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!data || totalIssues === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border-default rounded-[4px]">
            <p className="text-[13px] text-text-muted">No issues yet</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              Create an issue
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-4">
              {localSprints.map((sprint: any) => (
                <SprintSection
                  key={sprint.id}
                  sprint={sprint}
                  onOpen={setSelectedIssueId}
                />
              ))}
              <BacklogSection
                issues={localBacklog}
                onOpen={setSelectedIssueId}
              />
            </div>

            <DragOverlay>
              {activeIssue && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-[4px] border border-border-emphasis bg-bg-surface shadow-lg opacity-95">
                  <div
                    className="h-[5px] w-[5px] rounded-full shrink-0"
                    style={{
                      backgroundColor: PRIORITY_COLORS[activeIssue.priority],
                    }}
                  />
                  <span className="flex-1 text-[13px] text-text-primary truncate">
                    {activeIssue.title}
                  </span>
                  <span className="text-[11px] font-mono text-accent shrink-0">
                    #{activeIssue.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {project && (
        <>
          <CreateIssueModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            projectId={project.id}
            sprints={sprints ?? []}
            members={memberUsers}
            activeSprint={null}
          />
          <IssueSlideOver
            issueId={selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
            projectId={project.id}
            workspaceSlug={workspaceSlug}
            projectSlug={projectSlug}
          />
        </>
      )}
    </div>
  );
}
