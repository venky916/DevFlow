"use client";

import { Plus, RotateCw } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Badge } from "@devflow/ui/components/badge";
import { SearchBox } from "@devflow/ui/components/search-box";
import { FilterBar, type IssueFilters } from "../shared/filter-bar";
import { useCanMoveIssue } from "../../hooks/use-can-move-issue";
import type { ISprint, IUserPublic } from "@devflow/types";

interface Props {
  activeSprint: ISprint | null;
  members: IUserPublic[];
  projectId: string;
  filters: IssueFilters;
  onFiltersChange: (f: IssueFilters) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateIssue: () => void;
  view: "board" | "list";
  onViewChange: (v: "board" | "list") => void;
}

export function BoardHeader({
  activeSprint,
  members,
  projectId,
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing,
  onCreateIssue,
  view,
  onViewChange,
}: Props) {
  const { canCreateIssue } = useCanMoveIssue();

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-text-primary shrink-0">
          {activeSprint?.name ?? "No active sprint"}
        </span>
        {activeSprint && <Badge variant="success">Active</Badge>}
        <div className="h-4 w-px bg-border-default" />
        <SearchBox
          value={filters.q ?? ""}
          onChange={(q) => onFiltersChange({ ...filters, q: q || undefined })}
        />
        <FilterBar
          fields={["assignee", "label", "priority", "type", "dueDate"]}
          projectId={projectId}
          members={members}
          filters={filters}
          onChange={onFiltersChange}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center rounded-[4px] border border-border-default overflow-hidden">
          <button
            onClick={() => onViewChange("board")}
            className={`px-2.5 h-7 text-[12px] transition-colors ${
              view === "board"
                ? "bg-bg-active text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`px-2.5 h-7 text-[12px] transition-colors ${
              view === "list"
                ? "bg-bg-active text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            List
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {canCreateIssue && (
          <Button variant="primary" size="sm" onClick={onCreateIssue}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Issue
          </Button>
        )}
      </div>
    </div>
  );
}
