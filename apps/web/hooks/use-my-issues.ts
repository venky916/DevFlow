import { useQuery } from '@tanstack/react-query';

import type { IIssueWithRelations, IssueStatus } from '@devflow/types';

import type { IssueFilters } from '../components/shared/filter-bar';
import { api } from '../lib/axios';
import type { PaginatedResponse } from './use-issues';

// getMyIssues includes `project` — not part of the shared IIssueWithRelations,
// since board/backlog issues never carry it (already scoped to one project)
export interface IMyIssue extends IIssueWithRelations {
  project: {
    id: string;
    name: string;
    slug: string;
    workspace: { id: string; slug: string };
  };
}

// extends IssueFilters rather than redeclaring the same fields — this is
// what fixes the dueDatePreset type mismatch, since there's now only one
// real definition of it (IssueFilters'), not two that can drift apart.
// projectId/sprintId/priority/type/dueDate*/noDueDate/dueDatePreset all
// already exist on IssueFilters, so nothing new needs declaring here —
// this interface exists only so My Issues has its own name for the concept
export interface MyIssuesFilters extends IssueFilters {}

export interface MyIssuesListParams extends MyIssuesFilters {
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'priority' | 'dueDate' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface MyIssuesBoardResponse {
  columns: Record<IssueStatus, IMyIssue[]>;
}

export function useMyIssuesBoard(filters: MyIssuesFilters = {}) {
  return useQuery<MyIssuesBoardResponse>({
    queryKey: ['my-issues-board', filters],
    queryFn: async () => {
      const res = await api.get('/users/my-issues/board', {
        params: {
          projectId: filters.projectId,
          sprintId: filters.sprintId,
          priority: filters.priority,
          type: filters.type,
          dueDateFrom: filters.dueDateFrom,
          dueDateTo: filters.dueDateTo,
          noDueDate: filters.noDueDate,
          q: filters.q,
        },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev, // NEW — same fix as useBoard
  }); // includes refetch, isFetching by default
}

export function useMyIssuesList(params: MyIssuesListParams = {}) {
  const { page = 1, limit = 25, sortBy = 'updatedAt', sortOrder = 'desc', ...filters } = params;

  return useQuery<PaginatedResponse<IMyIssue>>({
    queryKey: ['my-issues-list', filters, page, limit, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get('/users/my-issues/list', {
        params: {
          projectId: filters.projectId,
          sprintId: filters.sprintId,
          priority: filters.priority,
          type: filters.type,
          dueDateFrom: filters.dueDateFrom,
          dueDateTo: filters.dueDateTo,
          noDueDate: filters.noDueDate,
          q: filters.q,
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });
      return res.data.data;
    },
    placeholderData: (prev) => prev, // keep old page's rows visible while next page loads
  });
}
