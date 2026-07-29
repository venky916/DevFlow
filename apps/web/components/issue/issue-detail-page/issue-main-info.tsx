"use client";

import { Loader2 } from "lucide-react";
import { ParentLink } from "../../shared/parent-link";
import { SubIssueList } from "../../shared/sub-issue-list";
import type { IIssueWithRelations, PendingAttachment } from "@devflow/types";
import { useIssueAttachments } from "../../../hooks/use-issue-attachments";
import { FileUploadList } from "@devflow/ui/components/file-upload-list";
import { api } from "../../../lib/axios";

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
  const {
    items: attachmentItems,
    addFiles,
    removeFile,
  } = useIssueAttachments(
    issue.id,
    issue.attachments?.map((a: any) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize ?? 0,
      mimeType: a.mimeType ?? "",
      url: a.url,
    })) ?? [],
  );

  const handleDownload = async (item: PendingAttachment) => {
    if (!item.attachmentId) return;
    const res = await api.get(
      `/issues/${issue.id}/attachments/${item.attachmentId}/download-url`,
    );
    window.location.href = res.data.data.downloadUrl;
  };
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

      <FileUploadList
        items={attachmentItems}
        onFilesAdded={addFiles}
        onRemove={removeFile}
        onDownload={handleDownload}
      />

      <SubIssueList
        issue={issue}
        projectId={projectId}
        onNavigate={onNavigate}
      />
    </div>
  );
}
