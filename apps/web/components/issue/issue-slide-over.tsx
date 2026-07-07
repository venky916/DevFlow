"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@devflow/ui/lib/cn";
import { Badge } from "@devflow/ui/components/badge";
import { useRouter } from "next/navigation";
import { useIssueById } from "../../hooks/use-issues";
import { IssueFields } from "./issue-fields";
import { ActivityPanel } from "./activity-panel";
import { STATUS_LABELS, getStatusVariant } from "../../lib/issue-constants";
import type { IssueStatus } from "@devflow/types";

interface Props {
  issueId: string | null;
  onClose: () => void;
  projectId: string;
  workspaceSlug: string;
  projectSlug: string;
}

export function IssueSlideOver({
  issueId,
  onClose,
  projectId,
  workspaceSlug,
  projectSlug,
}: Props) {
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
      <div
        className={cn(
          "fixed inset-0 z-30 transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-accent">
                  #{issue.id.slice(-6).toUpperCase()}
                </span>
                <Badge variant={getStatusVariant(issue.status as IssueStatus)}>
                  {STATUS_LABELS[issue.status as IssueStatus]}
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
                  onClick={() =>
                    router.push(
                      `/${workspaceSlug}/${projectSlug}/issues/${issue.id}`,
                    )
                  }
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

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <IssueFields
                  issue={issue}
                  projectId={projectId}
                  onSaving={setSaving}
                  onNavigate={(id) =>
                    router.push(`/${workspaceSlug}/${projectSlug}/issues/${id}`)
                  }
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
