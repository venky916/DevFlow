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
import { getFractionalPosition } from "../../lib/fractional-position";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

const STATUSES: IssueStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

interface Props {
  projectId: string;
  onIssueClick: (issueId: string) => void;
}

export function KanbanBoard({ projectId, onIssueClick }: Props) {
  const columns = useBoardStore((s) => s.columns);
  const setColumns = useBoardStore((s) => s.setColumns);
  const { mutate: moveIssue } = useMoveIssue();

  const [activeIssue, setActiveIssue] = useState<IIssueWithRelations | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findColumnOfIssue(issueId: string): IssueStatus | null {
    return (
      STATUSES.find((s) => columns[s]?.some((i) => i.id === issueId)) ?? null
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const issueId = event.active.id as string;
    const fromStatus = findColumnOfIssue(issueId);
    if (!fromStatus) return;
    setActiveIssue(columns[fromStatus].find((i) => i.id === issueId) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = active.id as string;
    const overId = over.id as string;
    if (issueId === overId) return;

    const fromStatus = findColumnOfIssue(issueId);
    if (!fromStatus) return;

    const toStatus = STATUSES.includes(overId as IssueStatus)
      ? (overId as IssueStatus)
      : findColumnOfIssue(overId);
    if (!toStatus) return;

    if (fromStatus === toStatus) {
      // same-column reorder — keep local array order in sync during drag
      // so handleDragEnd computes neighbors against the ACTUAL drop position,
      // not the card's original index
      const col = columns[fromStatus];
      const oldIndex = col.findIndex((i) => i.id === issueId);
      const newIndex = col.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      setColumns({
        ...columns,
        [fromStatus]: arrayMove(col, oldIndex, newIndex),
      });
      return;
    }

    const fromCol = [...columns[fromStatus]];
    const toCol = [...columns[toStatus]];
    const issueIndex = fromCol.findIndex((i) => i.id === issueId);
    const [movedIssue] = fromCol.splice(issueIndex, 1);

    const overIndex = toCol.findIndex((i) => i.id === overId);
    if (overIndex >= 0) {
      toCol.splice(overIndex, 0, movedIssue as IIssueWithRelations);
    } else {
      toCol.push(movedIssue as IIssueWithRelations);
    }

    setColumns({ ...columns, [fromStatus]: fromCol, [toStatus]: toCol });
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
    const index = toCol.findIndex((i) => i.id === issueId);
    if (index === -1) return;

    // destination list already has the dragged item IN it at `index`
    // (handleDragOver kept it in sync) — pass the list with it removed
    const listWithoutDragged = toCol.filter((i) => i.id !== issueId);
    const dropIndex = toCol.findIndex((i) => i.id === issueId);
    const newPosition = getFractionalPosition(listWithoutDragged, dropIndex);

    moveIssue({ issueId, data: { status: toStatus, position: newPosition } });
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
      <DragOverlay>
        {activeIssue && <IssueCard issue={activeIssue} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
