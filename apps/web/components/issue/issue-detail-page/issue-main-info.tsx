'use client';

import { Loader2 } from 'lucide-react';

import type { IIssueWithRelations, PendingAttachment } from '@devflow/types';
import { FileUploadList } from '@devflow/ui/components/file-upload-list';

import { useIssueAttachments } from '../../../hooks/use-issue-attachments';
import { usePermissions } from '../../../hooks/use-permissions';
import { api } from '../../../lib/axios';
import { canDeleteAttachment } from '../../../lib/permissions';
import { useAuthStore } from '../../../stores/auth.store';
import { ParentLink } from '../../shared/parent-link';
import { SubIssueList } from '../../shared/sub-issue-list';

interface Props {
  issue: IIssueWithRelations;
  projectId: string;
  saving: boolean;
  register: any;
  handleSubmit: any;
  save: any;
  onNavigate: (issueId: string) => void;
  canEditIssue: boolean;
  canUploadAttachment: boolean;
}

export function IssueMainInfo({
  issue,
  projectId,
  saving,
  register,
  handleSubmit,
  save,
  onNavigate,
  canEditIssue,
  canUploadAttachment,
}: Props) {
  const { access } = usePermissions();
  const userId = useAuthStore((s) => s.user?.id);

  const {
    items: attachmentItems,
    addFiles,
    removeFile,
  } = useIssueAttachments(
    issue.id,
    projectId,
    issue.attachments?.map((a: any) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize ?? 0,
      mimeType: a.mimeType ?? '',
      url: a.url,
      uploader: a.uploader,
    })) ?? [],
  );

  const handleDownload = async (item: PendingAttachment) => {
    if (!item.attachmentId) return;
    const res = await api.get(`/issues/${issue.id}/attachments/${item.attachmentId}/download-url`);
    window.location.href = res.data.data.downloadUrl;
  };

  return (
    <div className="flex flex-col gap-4">
      <ParentLink issue={issue} onNavigate={onNavigate} />
      {saving && (
        <span className="ml-auto flex items-center gap-1 text-[11px] text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </span>
      )}
      <input
        className="w-full bg-transparent text-[18px] font-semibold text-text-primary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Issue title"
        disabled={!canEditIssue}
        {...register('title')}
        onBlur={handleSubmit(save)}
      />
      <textarea
        className="min-h-[120px] w-full resize-none bg-transparent text-[13px] text-text-secondary placeholder:text-text-disabled focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Add a description..."
        disabled={!canEditIssue}
        {...register('description')}
        onBlur={handleSubmit(save)}
      />
      <FileUploadList
        items={attachmentItems}
        onFilesAdded={addFiles}
        onRemove={removeFile}
        onDownload={handleDownload}
        readOnly={!canUploadAttachment}
        canDeleteItem={(item) =>
          !!userId && canDeleteAttachment(access, { uploader: item.uploader }, userId)
        }
      />
      <SubIssueList issue={issue} projectId={projectId} onNavigate={onNavigate} />
    </div>
  );
}
