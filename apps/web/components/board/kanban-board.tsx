'use client';

import { useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import type { BoardColumns, BoardStatus, IIssueCard } from '@devflow/types';

import { useMoveIssue } from '../../hooks/use-board';
import { BOARD_STATUSES, findColumn } from '../../lib/board-utils';
import { getDropPosition } from '../../lib/fractional-position';
import { IssueCardBody } from './issue-card';
import { KanbanColumn } from './kanban-column';

const isStatus = (id: string): id is BoardStatus => BOARD_STATUSES.includes(id as BoardStatus);

interface KanbanBoardProps {
  columns: BoardColumns; // from the server (React Query)
  onIssueClick: (issueId: string) => void;
}

export function KanbanBoard({ columns: serverColumns, onIssueClick }: KanbanBoardProps) {
  const { mutate: moveIssue } = useMoveIssue();

  // While a card is being dragged, the columns are a temporary copy that follows the pointer.
  // After the drop it is cleared and the React Query data (already updated) is shown again.
  const [dragColumns, setDragColumns] = useState<BoardColumns | null>(null);
  const [activeIssue, setActiveIssue] = useState<IIssueCard | null>(null);
  const columns = dragColumns ?? serverColumns;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const issueId = String(event.active.id);
    const from = findColumn(columns, issueId);
    if (!from) return;
    setActiveIssue(columns[from].find((i) => i.id === issueId) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const issueId = String(active.id);
    const overId = String(over.id);
    if (issueId === overId) return;

    const from = findColumn(columns, issueId);
    const to = isStatus(overId) ? overId : findColumn(columns, overId);
    if (!from || !to) return;

    // same column: keep the order in sync while dragging, so the drop is computed from the real position
    if (from === to) {
      const column = columns[from];
      const oldIndex = column.findIndex((i) => i.id === issueId);
      const newIndex = column.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      setDragColumns({
        ...columns,
        [from]: arrayMove(column, oldIndex, newIndex),
      });
      return;
    }

    const moved = columns[from].find((i) => i.id === issueId);
    if (!moved) return;

    const fromColumn = columns[from].filter((i) => i.id !== issueId);
    const toColumn = [...columns[to]];
    const overIndex = toColumn.findIndex((i) => i.id === overId);
    if (overIndex >= 0) toColumn.splice(overIndex, 0, moved);
    else toColumn.push(moved);

    setDragColumns({ ...columns, [from]: fromColumn, [to]: toColumn });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);

    const issueId = String(event.active.id);
    const to = findColumn(columns, issueId); // where the card is now
    const from = findColumn(serverColumns, issueId); // where it started

    // dropped outside the board
    if (!event.over || !to || !from) {
      setDragColumns(null);
      return;
    }

    const index = columns[to].findIndex((i) => i.id === issueId);
    const startIndex = serverColumns[from].findIndex((i) => i.id === issueId);

    // dropped where it started: nothing to save
    if (to === from && index === startIndex) {
      setDragColumns(null);
      return;
    }

    const others = columns[to].filter((i) => i.id !== issueId);
    const position = getDropPosition(others, index);

    moveIssue(
      { issueId, data: { status: to, position } },
      { onSettled: () => setDragColumns(null) },
    );
  };

  // Escape: the card goes back, nothing is saved
  const handleDragCancel = () => {
    setActiveIssue(null);
    setDragColumns(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {BOARD_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            issues={columns[status]}
            onIssueClick={onIssueClick}
          />
        ))}
      </div>
      <DragOverlay>{activeIssue && <IssueCardBody issue={activeIssue} />}</DragOverlay>
    </DndContext>
  );
}
