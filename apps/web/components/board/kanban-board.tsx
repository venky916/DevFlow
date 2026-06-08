"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { IssueCard } from "./issue-card";
import { useBoardStore } from "../../stores/board.store";
import { useMoveIssue } from "../../hooks/use-board";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

const STATUSES: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

interface Props {
  projectId: string;
  onIssueClick: (issue: IIssueWithRelations) => void;
}

export function KanbanBoard({ projectId, onIssueClick }: Props) {
  const columns = useBoardStore((s) => s.columns);
  const setColumns = useBoardStore((s) => s.setColumns);
  const { mutate: moveIssue } = useMoveIssue();

  const [activeIssue, setActiveIssue] = useState<IIssueWithRelations | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // find which column an issue belongs to
  function findColumnOfIssue(issueId: string): IssueStatus | null {
    return (
      STATUSES.find((s) => columns[s]?.some((i) => i.id === issueId)) ?? null
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const issueId = event.active.id as string;
    const fromStatus = findColumnOfIssue(issueId);
    if (!fromStatus) return;
    const issue = columns[fromStatus].find((i) => i.id === issueId) ?? null;
    setActiveIssue(issue);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    const fromStatus = findColumnOfIssue(issueId);
    if (!fromStatus) return;

    // overId is either a column status or another issue id
    const toStatus = STATUSES.includes(overId as IssueStatus)
      ? (overId as IssueStatus)
      : findColumnOfIssue(overId);

    if (!toStatus || fromStatus === toStatus) return;

    // move issue across columns optimistically in local state
    const fromCol = [...columns[fromStatus]];
    const toCol = [...columns[toStatus]];
    const issueIndex = fromCol.findIndex((i) => i.id === issueId);
    const [movedIssue] = fromCol.splice(issueIndex, 1);

    // insert at position of the over-card, or end of column
    const overIndex = toCol.findIndex((i) => i.id === overId);
    if (overIndex >= 0) {
      toCol.splice(overIndex, 0, movedIssue as IIssueWithRelations);
    } else {
      toCol.push(movedIssue as IIssueWithRelations);
    }

    setColumns({
      ...columns,
      [fromStatus]: fromCol,
      [toStatus]: toCol,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);
    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    const toStatus = STATUSES.includes(overId as IssueStatus)
      ? (overId as IssueStatus)
      : findColumnOfIssue(overId);

    if (!toStatus) return;

    const toCol = columns[toStatus];
    const newPosition = toCol.findIndex((i) => i.id === issueId);

    moveIssue({
      issueId,
      data: { status: toStatus, position: Math.max(0, newPosition) },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={columns[status] ?? []}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>

      {/* Drag overlay — renders the card being dragged */}
      <DragOverlay>
        {activeIssue && <IssueCard issue={activeIssue} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
