import { useState } from "react";
import { useDeleteIssue, useDuplicateIssue } from "../../hooks/use-issues";
import { toast } from "sonner";
import { Copy, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
  IssueActionsDropdown,
} from "@devflow/ui/components/dropdown";
import { ConfirmModal } from "@devflow/ui/components/confirm-modal";
import { IIssueWithRelations } from "@devflow/types";

interface IssueActionsMenuProps {
  issue: IIssueWithRelations;
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
  const { mutate: deleteIssue, isPending: deleting } =
    useDeleteIssue(projectId);
  const { mutate: duplicateIssue, isPending: duplicating } =
    useDuplicateIssue(projectId);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
    setOpen(false);
  };

  const handleDuplicate = () => {
    duplicateIssue(
      {
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        labelIds: issue.labels?.map((l: any) => l.labelId) ?? [],
      },
      {
        onSuccess: (newIssue) => {
          toast.success("Issue duplicated");
          onDuplicated(newIssue.id);
        },
        onError: () => toast.error("Failed to duplicate issue"),
      },
    );
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="...">
        <MoreHorizontal className="h-4 w-4" />
      </button>
       <IssueActionsDropdown open={open} onClose={() => setOpen(false)}>
        <DropdownItem icon={Link2} label="Copy link" onClick={handleCopyLink} />
        <DropdownItem
          icon={Copy}
          label="Duplicate issue"
          onClick={handleDuplicate}
        />
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
