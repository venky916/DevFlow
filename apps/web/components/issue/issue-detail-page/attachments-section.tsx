'use client';

import { useState } from 'react';

import type { IIssueDetail, PendingAttachment } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { ConfirmModal } from '@devflow/ui/components/confirm-modal';
import { FileUploadList } from '@devflow/ui/components/file-upload-list';
import { Spinner } from '@devflow/ui/components/spinner';

import { useIssueAttachments } from '../../../hooks/use-attachments';
import { useIssueAccess } from '../../../hooks/use-issue-access';
import { PanelTitle } from '../../shared/panel-title';

interface AttachmentsSectionProps {
  issue: IIssueDetail;
  projectContext: { workspaceSlug: string; projectSlug: string };
}

export function AttachmentsSection({ issue, projectContext }: AttachmentsSectionProps) {
  const { userId, isLead, canMove } = useIssueAccess(projectContext);
  const files = useIssueAttachments(issue.id, issue.project.id);
  const [fileToDelete, setFileToDelete] = useState<PendingAttachment | null>(null);

  // leads and admins add files to any issue, a developer only to an issue assigned to them
  const canAdd = canMove({ assigneeId: issue.assigneeId });
  // the uploader, a lead or an admin can delete
  const canDeleteItem = (item: PendingAttachment) =>
    !item.attachmentId || isLead || item.uploader?.id === userId;

  const savedCount = files.items.filter((item) => item.attachmentId).length;

  const askToRemove = (id: string) => {
    const item = files.items.find((i) => i.id === id);
    if (item?.attachmentId)
      setFileToDelete(item); // a saved file: ask first
    else files.removeFile(id); // a failed upload: just drop it
  };

  return (
    <div className="flex flex-col gap-2">
      <PanelTitle>Attachments{savedCount > 0 ? ` (${savedCount})` : ''}</PanelTitle>

      {files.isLoading ? (
        <Spinner size="sm" />
      ) : files.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-text-muted">Couldn&apos;t load the files.</p>
          <Button variant="ghost" size="sm" onClick={() => files.refetch()}>
            Retry
          </Button>
        </div>
      ) : files.items.length === 0 && !canAdd ? (
        <p className="text-[12px] text-text-disabled">No attachments</p>
      ) : (
        <FileUploadList
          items={files.items}
          onFilesAdded={files.addFiles}
          onRemove={askToRemove}
          onDownload={files.downloadFile}
          readOnly={!canAdd}
          canDeleteItem={canDeleteItem}
        />
      )}

      <ConfirmModal
        open={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={() => {
          if (fileToDelete) files.removeFile(fileToDelete.id);
          setFileToDelete(null);
        }}
        title="Delete file?"
        description={`This will permanently delete "${fileToDelete?.localName ?? ''}".`}
        confirmLabel="Delete"
        isLoading={files.isDeleting}
        variant="danger"
      />
    </div>
  );
}
