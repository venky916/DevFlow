'use client';

import type { IMyIssue, IssueStatus } from '@devflow/types';

import { STATUS_LABELS } from '../../lib/issue-constants';
import { IssueCardBody } from '../board/issue-card';

interface MyIssuesColumnProps {
  status: IssueStatus;
  issues: IMyIssue[];
  onIssueClick: (issueId: string) => void;
}

export function MyIssuesColumn({ status, issues, onIssueClick }: MyIssuesColumnProps) {
  return (
    <div className="flex min-w-[240px] flex-1 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
          {STATUS_LABELS[status]}
        </span>
        <span className="font-mono text-[11px] text-text-disabled">{issues.length}</span>
      </div>

      <div className="flex min-h-[100px] flex-col gap-2 rounded-[4px] p-1">
        {issues.map((issue) => (
          <div key={issue.id} onClick={() => onIssueClick(issue.id)}>
            <IssueCardBody
              issue={issue}
              projectLabel={issue.project.name}
              onChildClick={onIssueClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
