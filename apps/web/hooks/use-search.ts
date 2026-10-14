'use client';

import { useQuery } from '@tanstack/react-query';

import type { IApiResponse, ISearchResponse } from '@devflow/types';

import { api } from '../lib/axios';

const MIN_QUERY_LENGTH = 2;

export const searchKeys = {
  query: (q: string) => ['search', q] as const,
};

export function useGlobalSearch(query: string) {
  const q = query.trim();

  return useQuery({
    queryKey: searchKeys.query(q),
    queryFn: async () => {
      const res = await api.get<IApiResponse<ISearchResponse>>('/search', { params: { q } });
      return res.data.data.items;
    },
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: (previous) => previous, // keep old results visible while the next query loads
  });
}