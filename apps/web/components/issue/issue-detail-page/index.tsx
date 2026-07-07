"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@devflow/ui/components/badge";
import { useIssueById } from "../../../hooks/use-issues";
import { useIssueForm } from "../../../hooks/use-issue-form";
import { STATUS_LABELS, getStatusVariant } from "../../../lib/issue-constants";
import { IssueMainInfo } from "./issue-main-info";
import { IssuePropertiesPanel } from "./issue-properties-panel";
import { CommentsSection } from "./comments-section";
import { ActivityPanel } from "../activity-panel";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const router = useRouter();
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { data: issue, isLoading } = useIssueById(issueId);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-text-muted">Issue not found</p>
      </div>
    );
  }

  return (
    <IssueDetailContent
      issue={issue}
      onBack={() => router.back()}
      onNavigate={(id: string) =>
        router.push(`/${workspaceSlug}/${projectSlug}/issues/${id}`)
      }
      saving={saving}
      onSaving={setSaving}
    />
  );
}

function IssueDetailContent({
  issue,
  onBack,
  onNavigate,
  saving,
  onSaving,
}: {
  issue: IIssueWithRelations;
  onBack: () => void;
  onNavigate: (id: string) => void;
  saving: boolean;
  onSaving: (v: boolean) => void;
}) {
  const form = useIssueForm(issue, issue.projectId, onSaving);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-6 h-[38px] border-b border-border-default shrink-0">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-mono text-accent">
          #{issue.id.slice(-6).toUpperCase()}
        </span>
        <Badge variant={getStatusVariant(issue.status as IssueStatus)}>
          {STATUS_LABELS[issue.status as IssueStatus]}
        </Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
          <IssueMainInfo
            issue={issue}
            projectId={issue.projectId}
            saving={saving}
            register={form.register}
            handleSubmit={form.handleSubmit}
            save={form.save}
            onNavigate={onNavigate}
          />
          <div className="h-px bg-border-default" />
          <CommentsSection issueId={issue.id} />
        </div>
        <div className="w-[400px] shrink-0 border-l border-border-default overflow-y-auto px-4 py-6 flex flex-col gap-6">
          <IssuePropertiesPanel
            issue={issue}
            projectId={issue.projectId}
            form={form}
          />
          <div className="h-px bg-border-default" />
          <ActivityPanel issueId={issue.id} />
        </div>
      </div>
    </div>
  );
}
