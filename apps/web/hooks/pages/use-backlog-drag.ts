'use client';

import { useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import type { IBacklogGrouped, IIssueCard } from '@devflow/types';

import { BACKLOG_ID, findIssueContainer, listOf } from '../../lib/backlog-utils';
import { getDropPosition } from '../../lib/fractional-position';
import { useMoveToSprint } from '../use-backlog';

export function useBacklogDrag(data: IBacklogGrouped | undefined) {
  const { mutate: moveToSprint } = useMoveToSprint();
  const [activeIssue, setActiveIssue] = useState<IIssueCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (event: DragStartEvent) => {
    if (!data) return;
    const issueId = String(event.active.id);
    const container = findIssueContainer(data, issueId);
    setActiveIssue(
      container ? (listOf(data, container).find((i) => i.id === issueId) ?? null) : null,
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    if (!data || !event.over) return;

    const issueId = String(event.active.id);
    const overId = String(event.over.id);
    if (issueId === overId) return;

    const from = findIssueContainer(data, issueId);
    if (!from) return;

    // dropped on a section: that section. Dropped on an issue: the section the issue is in.
    const overSection = overId === BACKLOG_ID || data.sprints.some((s) => s.id === overId);
    const to = overSection ? overId : findIssueContainer(data, overId);
    if (!to) return;

    const target = listOf(data, to);
    const others = target.filter((i) => i.id !== issueId);
    // before the issue it was dropped on (the same index works for a move inside one section), or at the end
    const overIndex = overSection ? -1 : target.findIndex((i) => i.id === overId);
    const dropIndex = overIndex >= 0 ? overIndex : others.length;

    // dropped where it already is: nothing to save
    if (from === to && target.findIndex((i) => i.id === issueId) === dropIndex) return;

    moveToSprint({
      issueId,
      data: {
        sprintId: to === BACKLOG_ID ? null : to,
        position: getDropPosition(others, dropIndex),
      },
    });
  };

  // Escape: nothing moves, nothing is saved
  const onDragCancel = () => setActiveIssue(null);

  return { sensors, activeIssue, onDragStart, onDragEnd, onDragCancel };
}
