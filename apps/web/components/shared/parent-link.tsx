"use client";

import { ArrowUp } from "lucide-react";
import type { IIssueWithRelations } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  onNavigate: (issueId: string) => void;
}

export function ParentLink({ issue, onNavigate }: Props) {
  if (!issue.parent) return null;

  return (
    <button
      onClick={() => onNavigate(issue.parent!.id)}
      className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors w-fit"
    >
      <ArrowUp className="h-3 w-3" />
      <span className="font-mono text-accent">
        #{issue.parent.id.slice(-6).toUpperCase()}
      </span>
      <span>{issue.parent.title}</span>
    </button>
  );
}
