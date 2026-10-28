'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';

import type { IIssueDetail } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { Badge } from '@devflow/ui/components/badge';
import { Spinner } from '@devflow/ui/components/spinner';

import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { useIssueAccess } from '../../hooks/use-issue-access';
import {
  useAttachChildIssue,
  useCreateSubIssue,
  useDetachChildIssue,
  useSearchProjectIssues,
} from '../../hooks/use-issues';
import { getStatusVariant, STATUS_LABELS } from '../../lib/issue-constants';

interface SubIssueListProps {
  issue: IIssueDetail;
  projectId: string;
  projectContext: { workspaceSlug: string; projectSlug: string };
  onNavigate: (issueId: string) => void;
}

export function SubIssueList({ issue, projectId, projectContext, onNavigate }: SubIssueListProps) {
  const { canCreateSubIssue, canAttachChild, canDetachChild } = useIssueAccess(projectContext);

  const { mutate: createSubIssue, isPending: creating } = useCreateSubIssue(issue.id);
  const { mutate: attachChild, isPending: attaching } = useAttachChildIssue(issue.id);
  const { mutate: detachChild } = useDetachChildIssue(issue.id);

  const [addTitle, setAddTitle] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const searchRef = useRef<HTMLDivElement>(null);

  // a sub-issue can't have sub-issues of its own
  const isEligibleParent = !issue.parentId;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data: results, isLoading: searching } = useSearchProjectIssues(
    projectId,
    debouncedQuery,
    {
      excludeId: issue.id,
      mode: 'child',
      enabled: isEligibleParent && searchOpen && canAttachChild,
    },
  );

  if (!isEligibleParent) return null;

  const handleAdd = () => {
    const title = addTitle.trim();
    if (!title) return;
    createSubIssue({ title }, { onSuccess: () => setAddTitle('') });
  };

  const handleAttach = (childId: string) => {
    attachChild(childId, {
      onSuccess: () => {
        setQuery('');
        setSearchOpen(false);
      },
    });
  };

  const children = issue.children;
  const total = children.length;
  const doneCount = children.filter((c) => c.status === 'DONE').length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
          Sub-issues{total > 0 ? ` (${total})` : ''}
        </p>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-text-muted">
              {doneCount}/{total}
            </span>
            <div className="h-[3px] w-16 overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full bg-success-text transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-1 overflow-hidden rounded-[6px] border border-border-default">
          {children.map((child) => (
            <div
              key={child.id}
              className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-hover"
            >
              <button
                type="button"
                onClick={() => onNavigate(child.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Badge variant={getStatusVariant(child.status)}>
                  {STATUS_LABELS[child.status]}
                </Badge>
                <span className="truncate text-[13px] text-text-primary">{child.title}</span>
              </button>
              {child.assignee && <Avatar name={child.assignee.name ?? '?'} size="sm" />}
              {canDetachChild && (
                <button
                  type="button"
                  onClick={() => detachChild(child.id)}
                  className="text-text-muted opacity-0 transition-colors group-hover:opacity-100 hover:text-danger-text focus-visible:opacity-100"
                  aria-label="Remove sub-issue"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(canCreateSubIssue || canAttachChild) && (
        <div className="flex flex-col gap-2">
          {canAttachChild && (
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 rounded-[4px] border border-border-default px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none"
                  placeholder="Search issues to attach..."
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                />
                {(searching || attaching) && <Spinner size="sm" />}
              </div>

              {searchOpen && (
                <div className="absolute z-10 mt-1 max-h-[220px] w-full overflow-y-auto rounded-[4px] border border-border-default bg-bg-surface shadow-lg">
                  {!results?.length ? (
                    <p className="px-3 py-2 text-[12px] text-text-disabled">
                      {searching ? 'Searching...' : 'No eligible issues found'}
                    </p>
                  ) : (
                    results.map((result) => (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => handleAttach(result.id)}
                        className="w-full px-3 py-2 text-left text-[13px] text-text-primary transition-colors hover:bg-bg-hover"
                      >
                        {result.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {canCreateSubIssue && (
            <div className="flex items-center gap-2 rounded-[4px] border border-border-default px-3 py-2">
              <Plus className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <input
                className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none"
                placeholder="Add sub-issue..."
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                disabled={creating}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
