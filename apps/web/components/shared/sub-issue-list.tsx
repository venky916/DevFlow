'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import type { IIssueWithRelations, IssueStatus } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { Badge } from '@devflow/ui/components/badge';

import {
  useAttachChildIssue,
  useCreateSubIssue,
  useDetachChildIssue,
  useSearchProjectIssues,
} from '../../hooks/use-issues';
import { usePermissions } from '../../hooks/use-permissions';
import { getStatusVariant, STATUS_LABELS } from '../../lib/issue-constants';
import { canProject } from '../../lib/permissions';

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  onNavigate: (issueId: string) => void;
}

export function SubIssueList({ issue, projectId, onNavigate }: Props) {
  const { access } = usePermissions();
  const canCreateSubIssue = canProject(access, 'CREATE_SUB_ISSUE');
  const canAttachChild = canProject(access, 'ATTACH_CHILD_ISSUE');
  const canDetachChild = canProject(access, 'DETACH_CHILD_ISSUE');

  const { mutateAsync: createSubIssue, isPending: creating } = useCreateSubIssue(issue.id);
  const { mutateAsync: attachChild, isPending: attaching } = useAttachChildIssue(issue.id);
  const { mutateAsync: detachChild } = useDetachChildIssue(issue.id);

  const [addTitle, setAddTitle] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const isEligibleParent = !issue.parentId;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

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

  const handleAdd = async () => {
    if (!addTitle.trim()) return;
    try {
      await createSubIssue({ title: addTitle.trim() });
      setAddTitle('');
    } catch {
      toast.error('Failed to create sub-issue');
    }
  };

  const handleAttach = async (issueId: string) => {
    try {
      await attachChild(issueId);
      setQuery('');
      setSearchOpen(false);
    } catch {
      toast.error('Failed to attach issue');
    }
  };

  const handleDetach = async (childId: string) => {
    try {
      await detachChild(childId);
    } catch {
      toast.error('Failed to detach sub-issue');
    }
  };

  const children = issue.children ?? [];
  const total = children.length;
  const doneCount = children.filter((c: any) => c.status === 'DONE').length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  console.log('SubIssueList render', { total, doneCount, progress, children });

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
            <div className="bg-bg-surface-hover h-[3px] w-16 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-success-text transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="flex flex-col gap-1 overflow-hidden rounded-[6px] border border-border-default">
          {children.map((child: any) => (
            <div
              key={child.id}
              className="hover:bg-bg-surface-hover group flex items-center gap-2 px-3 py-2 transition-colors"
            >
              <button
                onClick={() => onNavigate(child.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <Badge variant={getStatusVariant(child.status as IssueStatus)}>
                  {STATUS_LABELS[child.status as IssueStatus]}
                </Badge>
                <span className="truncate text-[13px] text-text-primary">{child.title}</span>
              </button>
              {child.assignee && <Avatar name={child.assignee.name ?? '?'} size="sm" />}
              {canDetachChild && (
                <button
                  onClick={() => handleDetach(child.id)}
                  className="hover:text-status-danger-text text-text-muted opacity-0 transition-colors group-hover:opacity-100"
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
                {(searching || attaching) && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-text-muted" />
                )}
              </div>

              {searchOpen && (
                <div className="absolute z-10 mt-1 max-h-[220px] w-full overflow-y-auto rounded-[4px] border border-border-default bg-bg-surface shadow-lg">
                  {!results?.length ? (
                    <p className="px-3 py-2 text-[12px] text-text-disabled">
                      {searching ? 'Searching...' : 'No eligible issues found'}
                    </p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAttach(r.id)}
                        className="hover:bg-bg-surface-hover w-full px-3 py-2 text-left text-[13px] text-text-primary transition-colors"
                      >
                        {r.title}
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
