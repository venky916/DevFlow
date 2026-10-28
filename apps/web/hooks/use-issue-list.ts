'use client';

import { useQuery } from '@tanstack/react-query';

import type { IApiResponse, IIssueCard, IPaginatedData } from '@devflow/types';

import { api } from '../lib/axios';
import { toApiFilters, type IssueFilters } from '../lib/issue-filters';
import { issueKeys } from './use-issues';

export interface IssueListParams extends IssueFilters {
  page?: number;
  limit?: number;
  sortBy?: 'position' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export function useIssueList(
  projectId: string,
  params: IssueListParams = {},
  options?: { enabled?: boolean },
) {
  const { page = 1, limit = 25, sortBy = 'position', sortOrder = 'asc', ...filters } = params;

  return useQuery({
    queryKey: issueKeys.list(projectId, { ...filters, page, limit, sortBy, sortOrder }),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IPaginatedData<IIssueCard>>>(
        `/projects/${projectId}/issues/list`,
        { params: { ...toApiFilters(filters), page, limit, sortBy, sortOrder } },
      );
      return res.data.data;
    },
    enabled: !!projectId && (options?.enabled ?? true),
    placeholderData: (previous) => previous, // keep the old page's rows while the next one loads
  });
}
