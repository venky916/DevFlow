"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@devflow/ui/lib/cn";
import { Badge } from "@devflow/ui/components/badge";
import { useIssueById } from "../../hooks/use-issues";
import { IssueFields } from "./issue-fields";
import { ActivityPanel } from "./activity-panel";
import { useRouter } from "next/navigation";

interface Props {
  issueId: string | null;
  onClose: () => void;
  projectId: string;
  workspaceSlug: string;
  projectSlug: string;
}

export function IssueSlideOver({ issueId, onClose, projectId, workspaceSlug, projectSlug }: Props) {
  const isOpen = !!issueId;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { data: issue, isLoading } = useIssueById(issueId ?? "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
      {/* Backdrop */}
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
          "fixed top-[38px] right-0 bottom-0 z-40 w-1/2 bg-bg-surface border-l border-border-default flex flex-col transition-transform duration-200 ease-out",
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
                {saving && (
                  <span className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
                <button
                  onClick={() => {
                    router.push(`/${workspaceSlug}/${projectSlug}/issues/${issue.id}`);
                  }}
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <IssueFields
                  issue={issue}
                  projectId={projectId}
                  onSaving={setSaving}
                />
              </div>
              <div className="w-[250px] border-l border-border-default overflow-y-auto p-3 shrink-0">
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
