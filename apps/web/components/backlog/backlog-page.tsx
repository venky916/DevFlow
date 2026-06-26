"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBacklogGrouped, useMoveToSprint } from "../../hooks/use-backlog";
import { CreateIssueModal } from "../board/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";
import { useProjectMembers, useProjectSprints } from "../../hooks/use-issues";
import type {
  IIssueWithRelations,
  IssuePriority,
  ISprint,
} from "@devflow/types";
import { arrayMove } from "@dnd-kit/sortable";

// ─── Priority dot colors ──────────────────────────────────────────
const PRIORITY_COLORS: Record<IssuePriority, string> = {
  URGENT: "#E24B4A",
  HIGH: "#EF9F27",
  MEDIUM: "#639922",
  LOW: "#555555",
  NO_PRIORITY: "#333333",
};

// ─── Draggable issue row ──────────────────────────────────────────
function IssueRow({
  issue,
  onOpen,
}: {
  issue: IIssueWithRelations;
  onOpen: (issue: IIssueWithRelations) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 px-3 py-2 rounded-[4px] border border-transparent hover:border-border-default hover:bg-bg-surface transition-colors group cursor-pointer"
      onClick={() => onOpen(issue)}
    >
      {/* Priority dot */}
      <div
        className="h-[5px] w-[5px] rounded-full shrink-0"
        style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
      />

      {/* Title */}
      <span className="flex-1 text-[13px] text-text-primary truncate">
        {issue.title}
      </span>

      {/* ID */}
      <span className="text-[11px] font-mono text-accent shrink-0">
        #{issue.id.slice(-6).toUpperCase()}
      </span>

      {/* Assignee */}
      {issue.assignee && (
        <div className="h-[18px] w-[18px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[9px] font-medium shrink-0">
          {issue.assignee.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </div>
  );
}

// ─── Droppable sprint section ─────────────────────────────────────
function SprintSection({
  sprint,
  onOpen,
}: {
  sprint: ISprint & { issues: IIssueWithRelations[] };
  onOpen: (issue: IIssueWithRelations) => void;
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

      {/* ✅ always rendered — never unmounts, so ref stays alive */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col ml-5 rounded-[4px] transition-colors",
          isOver && "bg-bg-hover",
          collapsed ? "min-h-0" : "min-h-[32px]", // shrink when collapsed
        )}
      >
        {/* ✅ content hidden via CSS, not unmounted */}
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

// ─── Droppable backlog section ────────────────────────────────────
function BacklogSection({
  issues,
  onOpen,
}: {
  issues: IIssueWithRelations[];
  onOpen: (issue: IIssueWithRelations) => void;
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

      {/* ✅ same fix — always rendered */}
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

// ─── Main BacklogPage ─────────────────────────────────────────────
export function BacklogPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssue, setSelectedIssue] =
    useState<IIssueWithRelations | null>(null);
  const [activeIssue, setActiveIssue] = useState<IIssueWithRelations | null>(
    null,
  );

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  const { data, isLoading } = useBacklogGrouped(project?.id ?? "");

  const { data: sprints } = useProjectSprints(project?.id ?? "");
  const { data: members } = useProjectMembers(project?.id ?? "");
  const { mutate: moveToSprint } = useMoveToSprint(project?.id ?? "");
  const [localSprints, setLocalSprints] = useState<
    (ISprint & { issues: IIssueWithRelations[] })[]
  >([]);

  const [localBacklog, setLocalBacklog] = useState<IIssueWithRelations[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // find issue across all sections
  function findIssue(issueId: string): IIssueWithRelations | null {
    for (const sprint of localSprints) {
      const found = sprint.issues.find((i) => i.id === issueId);
      if (found) return found;
    }
    return localBacklog.find((i) => i.id === issueId) ?? null;
  }

  // find which container (sprintId or "BACKLOG") an issue is in
  function findContainer(issueId: string): string | null {
    for (const sprint of localSprints) {
      if (sprint.issues.some((i) => i.id === issueId)) return sprint.id;
    }
    if (localBacklog.some((i) => i.id === issueId)) return "BACKLOG";
    return null;
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

    const fromContainer = findContainer(issueId);
    const allSprintIds = localSprints.map((s) => s.id);

    let toContainer: string;
    if (overId === "BACKLOG" || allSprintIds.includes(overId)) {
      toContainer = overId;
    } else {
      toContainer = findContainer(overId) ?? "BACKLOG";
    }

    if (!fromContainer) return;

    // same section reorder — no change here
    if (fromContainer === toContainer) {
      if (toContainer === "BACKLOG") {
        const oldIndex = localBacklog.findIndex((i) => i.id === issueId);
        const newIndex = localBacklog.findIndex((i) => i.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;
        setLocalBacklog((prev) => arrayMove(prev, oldIndex, newIndex));
      } else {
        setLocalSprints((prev) =>
          prev.map((sprint) => {
            if (sprint.id !== fromContainer) return sprint;
            const oldIndex = sprint.issues.findIndex((i) => i.id === issueId);
            const newIndex = sprint.issues.findIndex((i) => i.id === overId);
            if (oldIndex === -1 || newIndex === -1) return sprint;
            return {
              ...sprint,
              issues: arrayMove(sprint.issues, oldIndex, newIndex),
            };
          }),
        );
      }
      return;
    }

    // ✅ cross-section — update local state immediately (optimistic)
    const movedIssue = findIssue(issueId);
    if (!movedIssue) return;

    // remove from source
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

    // add to destination
    if (toContainer === "BACKLOG") {
      setLocalBacklog((prev) => [...prev, movedIssue]);
    } else {
      setLocalSprints((prev) =>
        prev.map((s) =>
          s.id === toContainer
            ? { ...s, issues: [...s.issues, movedIssue] }
            : s,
        ),
      );
    }

    // fire API
    const sprintId = toContainer === "BACKLOG" ? null : toContainer;
    moveToSprint(
      { issueId, data: { sprintId } },
      {
        onError: () => {
          // rollback — re-sync from server data
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

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
        <h1 className="text-[13px] font-medium text-text-primary">
          Backlog
          <span className="ml-2 text-text-muted font-normal">
            {totalIssues} issues
          </span>
        </h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Issue
        </Button>
      </div>

      {/* List */}
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
              {/* Sprint sections */}
              {localSprints.map((sprint: any) => (
                <SprintSection
                  key={sprint.id}
                  sprint={sprint}
                  onOpen={setSelectedIssue}
                />
              ))}

              {/* Backlog section */}
              <BacklogSection issues={localBacklog} onOpen={setSelectedIssue} />
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

      {/* Modals */}
      {project && (
        <>
          <CreateIssueModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            projectId={project.id}
            sprints={sprints ?? []}
            members={members?.map((m) => m.user!).filter(Boolean) ?? []}
            activeSprint={null}
          />
          <IssueSlideOver
            issueId={selectedIssue?.id ?? null}
            onClose={() => setSelectedIssue(null)}
            projectId={project.id}
            workspaceSlug={workspaceSlug}
            projectSlug={projectSlug}
          />
        </>
      )}
    </div>
  );
}
