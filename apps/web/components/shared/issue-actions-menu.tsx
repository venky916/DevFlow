import { useState } from 'react';
import { CircleEllipsis, Copy, Link2, Trash2 } from 'lucide-react';

import type { IIssueDetail } from '@devflow/types';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import {
  DropdownDivider,
  DropdownItem,
  IssueActionsDropdown,
} from '@devflow/ui/components/dropdown';

import { useCopyLink } from '../../hooks/use-clipboard';
import { useDeleteIssue, useDuplicateIssue } from '../../hooks/use-issues';

interface IssueActionsMenuProps {
  issue: IIssueDetail;
  projectId: string;
  canDelete: boolean;
  onDeleted: () => void;
  onDuplicated: (id: string) => void;
}

export function IssueActionsMenu({
  issue,
  projectId,
  canDelete,
  onDeleted,
  onDuplicated,
}: IssueActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: deleteIssue, isPending: deleting } = useDeleteIssue();
  const { mutate: duplicateIssue } = useDuplicateIssue(projectId);
  const copyLink = useCopyLink();

  const handleDuplicate = () => {
    setOpen(false);
    duplicateIssue(
      {
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        labelIds: issue.labels.map((l) => l.id),
      },
      { onSuccess: (created) => onDuplicated(created.id) },
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center text-text-muted transition-colors hover:text-text-primary"
        aria-label="Issue actions"
      >
        <CircleEllipsis className="h-4 w-4" />
      </button>
      <IssueActionsDropdown open={open} onClose={() => setOpen(false)}>
        <DropdownItem
          icon={Link2}
          label="Copy link"
          onClick={() => {
            setOpen(false);
            void copyLink(window.location.href);
          }}
        />
        <DropdownItem icon={Copy} label="Duplicate issue" onClick={handleDuplicate} />
        {canDelete && (
          <>
            <DropdownDivider />
            <DropdownItem
              icon={Trash2}
              label="Delete issue"
              danger
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
            />
          </>
        )}
      </IssueActionsDropdown>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => deleteIssue(issue.id, { onSuccess: onDeleted })}
        title="Delete issue?"
        description="This issue and its sub-issues, comments, and attachments will be permanently lost. This cannot be undone."
        confirmLabel="Delete issue"
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
