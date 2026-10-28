'use client';

import { useQuery } from '@tanstack/react-query';

import type {
  IApiResponse,
  IMyIssue,
  IMyIssuesBoard,
  IMyIssuesProject,
  IPaginatedData,
} from '@devflow/types';

import { api } from '../lib/axios';
import { toMyIssuesFilters, type IssueFilters } from '../lib/issue-filters';
import { issueKeys } from './use-issues';

export interface MyIssuesListParams extends IssueFilters {
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'priority' | 'dueDate' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export function useMyIssuesBoard(filters: IssueFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: issueKeys.myBoard(filters),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IMyIssuesBoard>>('/users/my-issues/board', {
        params: toMyIssuesFilters(filters),
      });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
    placeholderData: (previous) => previous, // keep the old board visible while a filter loads
  });
}

export function useMyIssuesList(params: MyIssuesListParams = {}, options?: { enabled?: boolean }) {
  const { page = 1, limit = 25, sortBy = 'updatedAt', sortOrder = 'desc', ...filters } = params;

  return useQuery({
    queryKey: issueKeys.myList({ ...filters, page, limit, sortBy, sortOrder }),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IPaginatedData<IMyIssue>>>('/users/my-issues/list', {
        params: { ...toMyIssuesFilters(filters), page, limit, sortBy, sortOrder },
      });
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
    placeholderData: (previous) => previous, // keep the old page's rows while the next one loads
  });
}

// the projects where you have issues, for the project filter
export function useMyIssuesProjects() {
  return useQuery({
    queryKey: issueKeys.myProjects(),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IMyIssuesProject[]>>('/users/my-issues/projects');
      return res.data.data;
    },
  });
}
