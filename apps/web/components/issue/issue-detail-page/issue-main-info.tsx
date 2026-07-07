"use client";

import { Loader2 } from "lucide-react";
import { ParentLink } from "../../shared/parent-link";
import { SubIssueList } from "../../shared/sub-issue-list";
import type { IIssueWithRelations } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  saving: boolean;
  register: any;
  handleSubmit: any;
  save: any;
  onNavigate: (issueId: string) => void;
}

export function IssueMainInfo({
  issue,
  projectId,
  saving,
  register,
  handleSubmit,
  save,
  onNavigate,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ParentLink issue={issue} onNavigate={onNavigate} />

      {saving && (
        <span className="flex items-center gap-1 text-[11px] text-text-muted ml-auto">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </span>
      )}

      <input
        className="w-full bg-transparent text-[18px] font-semibold text-text-primary placeholder:text-text-disabled focus:outline-none"
        placeholder="Issue title"
        {...register("title")}
        onBlur={handleSubmit(save)}
      />
      <textarea
        className="w-full bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none resize-none min-h-[120px]"
        placeholder="Add a description..."
        {...register("description")}
        onBlur={handleSubmit(save)}
      />

      <SubIssueList
        issue={issue}
        projectId={projectId}
        onNavigate={onNavigate}
      />
    </div>
  );
}
