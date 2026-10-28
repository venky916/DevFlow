'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  createExpandedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

import type { BoardStatus, IIssueCard, IPaginatedData, SprintStatus } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { LabelChip } from '@devflow/ui/components/label-chip';
import { Select } from '@devflow/ui/components/select';
import { cn } from '@devflow/ui/lib/cn';

import { useMoveIssue } from '../../hooks/use-board';
import { useIssueAccess } from '../../hooks/use-issue-access';
import {
  BOARD_STATUS_OPTIONS,
  getStatusVariant,
  PRIORITY_COLORS,
  STATUS_LABELS,
} from '../../lib/issue-constants';
import { isStatusLocked } from '../../lib/issue-rules';
import { PageError } from './page-error';
import { PageLoading } from './page-loading';

// module scope: created once, not per render
const features = tableFeatures({
  rowSortingFeature,
  rowExpandingFeature,
  sortedRowModel: createSortedRowModel(), // required slot for the feature; never runs, manualSorting bypasses it
  expandedRowModel: createExpandedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

type ListViewFeatures = typeof features;

// my issues rows also carry their project, so permissions are checked in that project
type ListViewRow = IIssueCard & {
  project?: {
    id: string;
    name: string;
    slug: string;
    workspace?: { slug: string };
  };
  // my issues rows carry their sprint. Rows without one come from the active sprint (the board's list).
  sprint?: { status: SprintStatus } | null;
};
// Own component: each row asks permission for its own project and owns its own move request.
function StatusCell({ issue }: { issue: ListViewRow }) {
  const override = issue.project?.workspace?.slug
    ? {
        workspaceSlug: issue.project.workspace.slug,
        projectSlug: issue.project.slug,
      }
    : undefined;
  const { canMove } = useIssueAccess(override);
  const { mutate: moveIssue, isPending } = useMoveIssue();

  // only issues in the active sprint have a status to change
  const inActiveSprint = issue.sprint === undefined || issue.sprint?.status === 'ACTIVE';
  // Backlog issues and parents with sub-issues show their status but don't let you change it
  const allowed =
    inActiveSprint && !isStatusLocked(issue) && canMove({ assigneeId: issue.assigneeId ?? null });

  if (!allowed) {
    return <Badge variant={getStatusVariant(issue.status)}>{STATUS_LABELS[issue.status]}</Badge>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-[130px]">
      <Select
        value={issue.status}
        disabled={isPending}
        onValueChange={(next) => {
          if (next === issue.status) return;
          // no position: the server puts the issue at the end of its new column
          moveIssue({
            issueId: issue.id,
            data: { status: next as BoardStatus },
          });
        }}
        options={BOARD_STATUS_OPTIONS}
        className="h-7 text-[11px]"
      />
    </div>
  );
}

function buildColumns<T extends ListViewRow>(showProject: boolean) {
  const columnHelper = createColumnHelper<ListViewFeatures, T>();

  return columnHelper.columns([
    columnHelper.accessor((row) => row.title, {
      id: 'title',
      header: 'Title',
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
                aria-label={row.getIsExpanded() ? 'Hide sub-issues' : 'Show sub-issues'}
                className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-hover"
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
            <span className="text-[13px] text-text-primary">{info.getValue()}</span>
          </div>
        );
      },
    }),
    ...(showProject
      ? [
          columnHelper.accessor((row) => row.project, {
            id: 'project',
            header: 'Project',
            cell: (info) => (
              <span className="text-[12px] text-text-secondary">{info.getValue()?.name}</span>
            ),
          }),
        ]
      : []),
    columnHelper.accessor((row) => row.status, {
      id: 'status',
      header: 'Status',
      cell: (info) => <StatusCell issue={info.row.original} />,
    }),
    columnHelper.accessor((row) => row.priority, {
      id: 'priority',
      header: 'Priority',
      cell: (info) => (
        <div className="flex items-center gap-1.5">
          <span
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[info.getValue()] }}
          />
          <span className="text-[12px] text-text-secondary">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.assignee, {
      id: 'assignee',
      header: 'Assignee',
      cell: (info) => {
        const assignee = info.getValue();
        return assignee ? (
          <span className="text-[12px] text-text-secondary">{assignee.name ?? 'Unnamed'}</span>
        ) : (
          <span className="text-[12px] text-text-muted">Unassigned</span>
        );
      },
    }),
    columnHelper.accessor((row) => row.labels ?? [], {
      id: 'labels',
      header: 'Labels',
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
          ))}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.dueDate, {
      id: 'dueDate',
      header: 'Due date',
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="font-mono text-[12px] text-text-muted">
            {value ? new Date(value).toLocaleDateString() : '—'}
          </span>
        );
      },
    }),
  ]);
}

interface ListViewProps<T extends ListViewRow> {
  data?: IPaginatedData<T>;
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
  flat?: boolean;
}

export function ListView<T extends ListViewRow>({
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
  flat = false,
}: ListViewProps<T>) {
  const columns = useMemo(() => buildColumns<T>(showProjectColumn), [showProjectColumn]);

  const table = useTable({
    features,
    columns,
    data: data?.items ?? [],
    state: { sorting },
    // sub-issue rows only carry a few fields (title, status, assignee), the cast reflects that
    getSubRows: (row) => (flat ? [] : (row.children as unknown as T[])),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(next);
      onPageChange(1);
    },
    manualSorting: true, // the server already sorted this page
  });

  if (isLoading) return <PageLoading />;
  if (isError) {
    return <PageError message="Couldn't load issues" onRetry={() => refetch()} />;
  }

  const meta = data?.meta;

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex-1 overflow-auto', isFetching && 'opacity-60 transition-opacity')}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 border-b border-border-default bg-bg-app">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-3 py-2 text-left font-mono text-[11px] tracking-[0.05em] text-text-muted uppercase select-none"
                  >
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        header.column.id === 'title' && 'pl-[26px]',
                      )}
                    >
                      {!header.isPlaceholder && <table.FlexRender header={header} />}
                      {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                      {header.column.getIsSorted() === 'desc' && (
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
                className="cursor-pointer border-b border-border-default transition-colors hover:bg-bg-hover"
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
            <p className="text-[13px] text-text-muted">No issues match these filters</p>
          </div>
        )}
      </div>

      {meta && meta.total > meta.limit && (
        <div className="flex shrink-0 items-center justify-between border-t border-border-default px-3 py-2">
          <span className="text-[12px] text-text-muted">
            {meta.total} issue{meta.total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[12px] text-text-muted">
              {meta.page} / {Math.ceil(meta.total / meta.limit)}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!meta.hasMore}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
