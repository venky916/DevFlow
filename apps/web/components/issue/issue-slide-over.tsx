"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@devflow/ui/lib/cn";
import { Badge } from "@devflow/ui/components/badge";
import { useIssueById, useUpdateIssue } from "../../hooks/use-issues";
import { IssueFields } from "./issue-fields";
import { ActivityPanel } from "./activity-panel";
import type { IIssueWithRelations } from "@devflow/types";
import { Spinner } from "@devflow/ui/components/spinner";

interface Props {
  issueId: string | null;
  onClose: () => void;
  projectId: string;
}

export function IssueSlideOver({ issueId, onClose, projectId }: Props) {
  const router = useRouter();
  const isOpen = !!issueId;

  const { data: issue, isLoading } = useIssueById(issueId ?? "");

  // close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // update URL
  useEffect(() => {
    if (issueId) {
      const url = new URL(window.location.href);
      url.searchParams.set("issue", issueId);
      window.history.pushState({}, "", url);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("issue");
      window.history.pushState({}, "", url);
    }
  }, [issueId]);

  return (
    <>
      {/* Backdrop — dims board */}
      <div
        className={cn(
          "fixed inset-0 z-30 transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-[42px] right-0 bottom-0 z-40 w-1/2 bg-bg-surface border-l border-border-default",
          "flex flex-col transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : issue ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-accent">
                  #{issue.id.slice(-6).toUpperCase()}
                </span>
                <Badge variant={getStatusVariant(issue.status)}>
                  {STATUS_LABELS[issue.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/issues/${issue.id}`}
                  target="_blank"
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Main area */}
              <div className="flex-1 overflow-y-auto p-4">
                <IssueFields issue={issue} projectId={projectId} />
              </div>

              {/* Activity column */}
              <div className="w-1/4 border-l border-border-default overflow-y-auto p-3 shrink-0">
                <ActivityPanel issueId={issue.id} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "DONE":
      return "success" as const;
    case "IN_PROGRESS":
      return "info" as const;
    case "IN_REVIEW":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}
