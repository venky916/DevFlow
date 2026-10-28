'use client';

import { parseAsBoolean, parseAsString, useQueryStates } from 'nuqs';

import type { IssueFilters } from '../lib/issue-filters';

const filterParsers = {
  assigneeId: parseAsString,
  labelId: parseAsString,
  priority: parseAsString,
  type: parseAsString,
  projectId: parseAsString,
  sprintId: parseAsString,
  dueDateFrom: parseAsString,
  dueDateTo: parseAsString,
  noDueDate: parseAsBoolean,
  dueDatePreset: parseAsString,
  q: parseAsString,
};

// The filters live in the URL, so a filtered board can be shared or bookmarked.
export function useIssueFilters() {
  const [raw, setRaw] = useQueryStates(filterParsers);

  // empty filters are dropped, so an empty filter bar is `{}`
  const filters = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  ) as IssueFilters;

  const setFilters = (next: IssueFilters) =>
    setRaw({
      assigneeId: next.assigneeId ?? null,
      labelId: next.labelId ?? null,
      priority: next.priority ?? null,
      type: next.type ?? null,
      projectId: next.projectId ?? null,
      sprintId: next.sprintId ?? null,
      dueDateFrom: next.dueDateFrom ?? null,
      dueDateTo: next.dueDateTo ?? null,
      noDueDate: next.noDueDate ?? null,
      dueDatePreset: next.dueDatePreset ?? null,
      q: next.q ?? null,
    });

  return { filters, setFilters };
}
