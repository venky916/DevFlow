import { create } from "zustand";
import type { IIssueWithRelations, IssueStatus, ISprint } from "@devflow/types";

type BoardColumns = Record<IssueStatus, IIssueWithRelations[]>;

interface BoardState {
    columns: BoardColumns;
    activeSprint: ISprint | null;
    setColumns: (columns: BoardColumns) => void;
    setActiveSprint: (sprint: ISprint | null) => void;
    moveIssue: (issueId: string, from: IssueStatus, to: IssueStatus, newPosition: string) => void;
}

const EMPTY_COLUMNS: BoardColumns = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
};

export const useBoardStore = create<BoardState>((set) => ({
    columns: EMPTY_COLUMNS,
    activeSprint: null,
    setColumns: (columns) => set({ columns }),
    setActiveSprint: (activeSprint) => set({ activeSprint }),

    // newPosition is a fractional-indexing key (string), not an array index.
    // Insert sorted by position rather than splicing at a literal index —
    // fractional keys are generated so plain string comparison gives the
    // correct order, so a straight sort after insert is enough.
    moveIssue: (issueId, from, to, newPosition) =>
        set((state) => {
            const columns = structuredClone(state.columns);
            const issue = columns[from].find((i) => i.id === issueId);
            if (!issue) return state;

            columns[from] = columns[from].filter((i) => i.id !== issueId);
            issue.status = to;
            issue.position = newPosition;

            columns[to] = [...columns[to], issue].sort((a, b) =>
                a.position < b.position ? -1 : a.position > b.position ? 1 : 0
            );

            return { columns };
        }),
}));