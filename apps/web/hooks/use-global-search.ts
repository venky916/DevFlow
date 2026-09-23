// hooks/use-global-search.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface ISearchResult {
    type: "workspace" | "project" | "issue" | "page";
    id: string;
    name: string;
    context: string | null;
    url: string;
}

export function useGlobalSearch(query: string) {
    const q = query.trim();
    return useQuery<ISearchResult[]>({
        queryKey: ["global-search", q],
        queryFn: async () => {
            const res = await api.get(`/search`, { params: { q } });
            return res.data.data.items;
        },
        enabled: q.length >= 2,
        placeholderData: (prev) => prev, // keep old results visible while the next query loads
    });
}