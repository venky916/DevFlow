"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { KanbanColumn } from "./kanban-column";
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const toStatus = over.id as IssueStatus;

    // find which column issue is currently in
    const fromStatus = STATUSES.find((s) =>
      columns[s].some((i) => i.id === issueId),
    );
    if (!fromStatus) return;

    const toColumn = columns[toStatus] ?? columns[fromStatus];
    const newPosition = toColumn.length;

    moveIssue(
      { issueId, data: { status: toStatus, position: newPosition } },
      {
        onError: () => {
          toast.error("Failed to move issue");
        },
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={columns[status]}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>
    </DndContext>
  );
}
