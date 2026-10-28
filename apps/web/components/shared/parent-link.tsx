'use client';

import { ArrowUp } from 'lucide-react';

import type { IIssueDetail } from '@devflow/types';

interface ParentLinkProps {
  issue: IIssueDetail;
  onNavigate: (issueId: string) => void;
}

export function ParentLink({ issue, onNavigate }: ParentLinkProps) {
  if (!issue.parent) return null;

  return (
    <button
      type="button"
      onClick={() => onNavigate(issue.parent!.id)}
      className="flex w-fit items-center gap-1.5 text-[12px] text-text-muted transition-colors hover:text-text-primary"
    >
      <ArrowUp className="h-3 w-3" />
      <span className="font-mono text-accent">#{issue.parent.id.slice(-6).toUpperCase()}</span>
      <span>{issue.parent.title}</span>
    </button>
  );
}
