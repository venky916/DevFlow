"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@devflow/ui/components/avatar";
import { Badge } from "@devflow/ui/components/badge";
import {
  useCreateSubIssue,
  useAttachChildIssue,
  useDetachChildIssue,
  useSearchProjectIssues,
} from "../../hooks/use-issues";
import { usePermissions } from "../../hooks/use-permissions";
import { canProject } from "../../lib/permissions";
import { STATUS_LABELS, getStatusVariant } from "../../lib/issue-constants";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  onNavigate: (issueId: string) => void;
}

export function SubIssueList({ issue, projectId, onNavigate }: Props) {
  const { access } = usePermissions();
  const canCreateSubIssue = canProject(access, "CREATE_SUB_ISSUE");
  const canAttachChild = canProject(access, "ATTACH_CHILD_ISSUE");
  const canDetachChild = canProject(access, "DETACH_CHILD_ISSUE");

  const { mutateAsync: createSubIssue, isPending: creating } =
    useCreateSubIssue(issue.id);
  const { mutateAsync: attachChild, isPending: attaching } =
    useAttachChildIssue(issue.id);
  const { mutateAsync: detachChild } = useDetachChildIssue(issue.id);

  const [addTitle, setAddTitle] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data: results, isLoading: searching } = useSearchProjectIssues(
    projectId,
    debouncedQuery,
    {
      excludeId: issue.id,
      mode: "child",
      enabled: isEligibleParent && searchOpen && canAttachChild,
    },
  );

  if (!isEligibleParent) return null;

  const handleAdd = async () => {
    if (!addTitle.trim()) return;
    try {
      await createSubIssue({ title: addTitle.trim() });
      setAddTitle("");
    } catch {
      toast.error("Failed to create sub-issue");
    }
  };

  const handleAttach = async (issueId: string) => {
    try {
      await attachChild(issueId);
      setQuery("");
      setSearchOpen(false);
    } catch {
      toast.error("Failed to attach issue");
    }
  };

  const handleDetach = async (childId: string) => {
    try {
      await detachChild(childId);
    } catch {
      toast.error("Failed to detach sub-issue");
    }
  };

  const children = issue.children ?? [];
  const total = children.length;
  const doneCount = children.filter((c: any) => c.status === "DONE").length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  console.log("SubIssueList render", { total, doneCount, progress, children });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
          Sub-issues{total > 0 ? ` (${total})` : ""}
        </p>

        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-text-muted">
              {doneCount}/{total}
            </span>
            <div className="w-16 h-[3px] rounded-full bg-bg-surface-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-success-text transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[6px] border border-border-default overflow-hidden">
          {children.map((child: any) => (
            <div
              key={child.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-bg-surface-hover transition-colors group"
            >
              <button
                onClick={() => onNavigate(child.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <Badge variant={getStatusVariant(child.status as IssueStatus)}>
                  {STATUS_LABELS[child.status as IssueStatus]}
                </Badge>
                <span className="text-[13px] text-text-primary truncate">
                  {child.title}
                </span>
              </button>
              {child.assignee && (
                <Avatar name={child.assignee.name ?? "?"} size="sm" />
              )}
              {canDetachChild && (
                <button
                  onClick={() => handleDetach(child.id)}
                  className="text-text-muted hover:text-status-danger-text transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="flex items-center gap-2 border border-border-default rounded-[4px] px-3 py-2">
                <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted shrink-0" />
                )}
              </div>

              {searchOpen && (
                <div className="absolute z-10 mt-1 w-full max-h-[220px] overflow-y-auto bg-bg-surface border border-border-default rounded-[4px] shadow-lg">
                  {!results?.length ? (
                    <p className="px-3 py-2 text-[12px] text-text-disabled">
                      {searching ? "Searching..." : "No eligible issues found"}
                    </p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAttach(r.id)}
                        className="w-full text-left px-3 py-2 text-[13px] text-text-primary hover:bg-bg-surface-hover transition-colors"
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
            <div className="flex items-center gap-2 border border-border-default rounded-[4px] px-3 py-2">
              <Plus className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <input
                className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-disabled focus:outline-none"
                placeholder="Add sub-issue..."
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
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
