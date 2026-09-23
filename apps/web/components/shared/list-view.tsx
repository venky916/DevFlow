"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  createExpandedRowModel,
  rowSortingFeature,
  rowExpandingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LabelChip } from "@devflow/ui/components/label-chip";
import { Badge } from "@devflow/ui/components/badge";
import {
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  getStatusVariant,
} from "../../lib/issue-constants";
import PageLoading from "./page-loading";
import PageError from "./page-error";
import type { IIssueWithRelations } from "@devflow/types";
import type { PaginatedResponse } from "../../hooks/use-issues";
import { Select } from "@devflow/ui/components/select";
import type { SelectOption } from "@devflow/ui/components/select";
import type { IssueStatus } from "@devflow/types";
import { useMoveIssue } from "../../hooks/use-board";
import { useCanMoveIssue } from "../../hooks/use-can-move-issue"; // NEW

// module scope — created once, not per render
const features = tableFeatures({
  rowSortingFeature,
  rowExpandingFeature,
  sortedRowModel: createSortedRowModel(), // required slot for the feature; never runs — manualSorting bypasses it
  expandedRowModel: createExpandedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type ListViewFeatures = typeof features;

// widened: needs workspace.slug alongside project.slug so per-row permission
// checks can build the same { workspaceSlug, projectSlug } override IssueCard uses.
// On Board's list view this field simply isn't populated — fine, override falls
// through to undefined and usePermissions falls back to useParams(), unchanged.
type ListViewRow = IIssueWithRelations & {
  project?: {
    id: string;
    name: string;
    slug: string;
    workspace?: { slug: string };
  };
};

// Extracted so it can call useCanMoveIssue per-row — each row may belong to a
// different project (My Issues), so permission can't be resolved once for the
// whole table the way a single-project page could.
function StatusCell<T extends ListViewRow>({
  issue,
  statusOptions,
  moveIssue,
  onMoved,
}: {
  issue: T;
  statusOptions: SelectOption[];
  moveIssue: ReturnType<typeof useMoveIssue>["mutate"];
  onMoved: () => void;
}) {
  const override = issue.project?.workspace?.slug
    ? {
        workspaceSlug: issue.project.workspace.slug,
        projectSlug: issue.project.slug,
      }
    : undefined;
  const { canMove } = useCanMoveIssue(override);

  const status = issue.status;
  const childLocked = !issue.parentId && (issue.children?.length ?? 0) > 0;
  const allowed =
    !childLocked && canMove({ assigneeId: issue.assigneeId ?? null });

  if (!allowed) {
    return (
      <Badge variant={getStatusVariant(status)}>{STATUS_LABELS[status]}</Badge>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-[130px]">
      <Select
        value={status}
        onValueChange={(newStatus) => {
          if (newStatus === status) return;
          moveIssue(
            {
              issueId: issue.id,
              data: {
                status: newStatus as IssueStatus,
                position: issue.position,
              },
            },
            { onSuccess: onMoved },
          );
        }}
        options={statusOptions}
        className="h-7 text-[11px]"
      />
    </div>
  );
}

function buildColumns<T extends ListViewRow>(
  showProject: boolean,
  moveIssue: ReturnType<typeof useMoveIssue>["mutate"],
  statusOptions: SelectOption[],
  onMoved: () => void, // NEW — replaces the hardcoded queryClient.invalidateQueries call
) {
  const columnHelper = createColumnHelper<ListViewFeatures, T>();

  return columnHelper.columns([
    columnHelper.accessor((row) => row.title, {
      id: "title",
      header: "Title",
      cell: (info) => {
        const row = info.row;

        return (
          <div className="flex items-center gap-1.5">
            {row.getCanExpand() ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  row.toggleExpanded();
                }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-hover text-text-muted"
              >
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}

            <span className="text-[13px] text-text-primary">
              {info.getValue()}
            </span>
          </div>
        );
      },
    }),
    ...(showProject
      ? [
          columnHelper.accessor((row) => row.project, {
            id: "project",
            header: "Project",
            cell: (info) => (
              <span className="text-[12px] text-text-secondary">
                {info.getValue()?.name}
              </span>
            ),
          }),
        ]
      : []),
    columnHelper.accessor((row) => row.status, {
      id: "status",
      header: "Status",
      cell: (info) => (
        <StatusCell
          issue={info.row.original}
          statusOptions={statusOptions}
          moveIssue={moveIssue}
          onMoved={onMoved}
        />
      ),
    }),
    columnHelper.accessor((row) => row.priority, {
      id: "priority",
      header: "Priority",
      cell: (info) => (
        <div className="flex items-center gap-1.5">
          <span
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[info.getValue()] }}
          />
          <span className="text-[12px] text-text-secondary">
            {info.getValue()}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.assignee, {
      id: "assignee",
      header: "Assignee",
      cell: (info) => {
        const a = info.getValue();
        return a ? (
          <span className="text-[12px] text-text-secondary">
            {a.name ?? a.email}
          </span>
        ) : (
          <span className="text-[12px] text-text-muted">Unassigned</span>
        );
      },
    }),
    columnHelper.accessor((row) => row.labels ?? [], {
      id: "labels",
      header: "Labels",
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((l) => (
            <LabelChip
              key={l.label.id}
              name={l.label.name}
              color={l.label.color}
              size="sm"
            />
          ))}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.dueDate, {
      id: "dueDate",
      header: "Due date",
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="text-[12px] text-text-muted font-mono">
            {v ? new Date(v).toLocaleDateString() : "—"}
          </span>
        );
      },
    }),
  ]);
}

interface Props<T extends IIssueWithRelations> {
  data?: PaginatedResponse<T>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
  page: number;
  onPageChange: (p: number) => void;
  sorting: SortingState;
  onSortingChange: (s: SortingState) => void;
  onIssueClick: (issueId: string) => void;
  showProjectColumn?: boolean;
}

export function ListView<T extends IIssueWithRelations>({
  data,
  isLoading,
  isFetching,
  isError,
  refetch,
  page,
  onPageChange,
  sorting,
  onSortingChange,
  onIssueClick,
  showProjectColumn = false,
}: Props<T>) {
  const { mutate: moveIssue } = useMoveIssue();
  const statusOptions = showProjectColumn
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => option.value !== "BACKLOG");

  // Fix A: whichever page owns this table already owns the right query key
  // (useIssueList for Board, useMyIssuesList for My Issues) and passed its own
  // `refetch` in as a prop — use that instead of guessing a queryClient key here.
  const columns = buildColumns<T>(
    showProjectColumn,
    moveIssue,
    statusOptions,
    refetch,
  );

  const table = useTable({
    features,
    columns,
    data: data?.items ?? [],
    state: { sorting },
    getSubRows: (row) => (row.children ?? []) as T[],
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
      onPageChange(1);
    },
    manualSorting: true, // server already sorted this page — never recompute client-side
  });

  if (isLoading) return <PageLoading />;
  if (isError) {
    return (
      <PageError message="Couldn't load issues" onRetry={() => refetch()} />
    );
  }

  const meta = data?.meta;

  return (
    <div className="flex flex-col h-full">
      <div
        className={`flex-1 overflow-auto ${isFetching ? "opacity-60 transition-opacity" : ""}`}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg-app border-b border-border-default">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.05em] font-mono text-text-muted cursor-pointer select-none"
                  >
                    <span
                      className={`flex items-center gap-1 ${
                        header.column.id === "title" ? "pl-[26px]" : ""
                      }`}
                    >
                      {!header.isPlaceholder && (
                        <table.FlexRender header={header} />
                      )}
                      {header.column.getIsSorted() === "asc" && (
                        <ChevronUp className="h-3 w-3" />
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onIssueClick(row.original.id)}
                className={`border-b border-border-default hover:bg-bg-hover cursor-pointer transition-colors`}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!data?.items.length && (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-text-muted">
              No issues match these filters
            </p>
          </div>
        )}
      </div>

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-default shrink-0">
          <span className="text-[12px] text-text-muted">
            {meta.total} issue{meta.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-7 w-7 flex items-center justify-center rounded-[4px] text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[12px] text-text-muted font-mono">
              {meta.page} / {Math.ceil(meta.total / meta.limit)}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!meta.hasMore}
              className="h-7 w-7 flex items-center justify-center rounded-[4px] text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
