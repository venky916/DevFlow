'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, IAttachment, PendingAttachment } from '@devflow/types';

import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { showError } from '../lib/show-error';
import { uploadFileToStorage } from '../lib/upload';
import { issueKeys } from './use-issues';
import { useRequestUploadUrl } from './use-upload';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
// the signed links in the list last 1 hour, so the list is refreshed every 50 minutes
const REFRESH_MS = 50 * 60 * 1000;

// attachments have their own keys, outside the issue keys, so saving a field never reloads them
export const attachmentKeys = {
  all: ['attachments'] as const,
  list: (issueId: string) => [...attachmentKeys.all, issueId] as const,
};

// a saved attachment, shown like an upload that is done
function toItem(attachment: IAttachment): PendingAttachment {
  return {
    id: attachment.id,
    status: 'done',
    progress: 100,
    file: {
      fileName: attachment.fileName,
      fileSize: attachment.fileSize ?? 0,
      mimeType: attachment.mimeType ?? '',
      url: attachment.url,
    },
    fileKey: attachment.fileKey,
    attachmentId: attachment.id,
    localName: attachment.fileName,
    localSize: attachment.fileSize ?? 0,
    localMimeType: attachment.mimeType ?? '',
    uploader: attachment.uploader,
  };
}

// a file that was just picked, before it is uploaded
function newUpload(file: File): PendingAttachment {
  return {
    id: crypto.randomUUID(),
    status: 'uploading',
    progress: 0,
    file: null,
    fileKey: null,
    attachmentId: null,
    localName: file.name,
    localSize: file.size,
    localMimeType: file.type,
  };
}

// ─── Files on an issue (detail page) ──────────────────────────
export function useIssueAttachments(issueId: string, projectId: string) {
  const qc = useQueryClient();
  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();
  // only uploads in progress (or failed) live here. Saved files come from the server.
  const [uploads, setUploads] = useState<PendingAttachment[]>([]);

  const {
    data: attachments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: attachmentKeys.list(issueId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IAttachment[]>>(`/issues/${issueId}/attachments`);
      return res.data.data;
    },
    enabled: !!issueId,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/issues/${issueId}/attachments/${attachmentId}`);
    },
    onSuccess: (_data, attachmentId) => {
      qc.setQueryData<IAttachment[]>(attachmentKeys.list(issueId), (list) =>
        list?.filter((attachment) => attachment.id !== attachmentId),
      );
      qc.invalidateQueries({ queryKey: issueKeys.activities(issueId) });
      toast.success('File deleted');
    },
    onError: (err) => showError(err, "Couldn't delete the file"),
  });

  const patch = (id: string, changes: Partial<PendingAttachment>) =>
    setUploads((prev) =>
      prev.map((upload) => (upload.id === id ? { ...upload, ...changes } : upload)),
    );

  const uploadOne = async (file: File) => {
    const base = newUpload(file);
    const id = base.id;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setUploads((prev) => [
        ...prev,
        { ...base, status: 'error', errorMessage: 'File too large (max 10MB)' },
      ]);
      return;
    }

    setUploads((prev) => [...prev, base]);

    try {
      const { uploadUrl, fileKey } = await requestUploadUrl({
        folder: 'attachments',
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        projectId,
      });
      patch(id, { progress: 50 });
      await uploadFileToStorage(uploadUrl, file);

      const res = await api.post<IApiResponse<IAttachment>>(`/issues/${issueId}/attachments`, {
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // the saved file joins the list and the upload row goes away, in the same moment
      qc.setQueryData<IAttachment[]>(attachmentKeys.list(issueId), (list) => [
        ...(list ?? []),
        res.data.data,
      ]);
      setUploads((prev) => prev.filter((upload) => upload.id !== id));
      qc.invalidateQueries({ queryKey: issueKeys.activities(issueId) });
    } catch (err) {
      patch(id, {
        status: 'error',
        errorMessage: getAuthErrorMessage(err, 'Upload failed') ?? 'Upload failed',
      });
    }
  };

  const addFiles = (files: File[]) => {
    files.forEach((file) => void uploadOne(file));
  };

  // a failed upload is only dropped from the screen. A saved file is deleted on the server.
  const removeFile = (id: string) => {
    if (uploads.some((upload) => upload.id === id)) {
      setUploads((prev) => prev.filter((upload) => upload.id !== id));
      return;
    }
    deleteMutation.mutate(id);
  };

  // the Download button asks for a fresh 5-minute link
  const downloadFile = async (item: PendingAttachment) => {
    if (!item.attachmentId) return;
    try {
      const res = await api.get<IApiResponse<{ downloadUrl: string }>>(
        `/issues/${issueId}/attachments/${item.attachmentId}/download-url`,
      );
      window.location.assign(res.data.data.downloadUrl);
    } catch (err) {
      showError(err, "Couldn't download the file");
    }
  };

  return {
    items: [...attachments.map(toItem), ...uploads],
    isLoading,
    isError,
    refetch,
    addFiles,
    removeFile,
    downloadFile,
    isDeleting: deleteMutation.isPending,
  };
}

// ─── Files picked in the create-issue modal ───────────────────
// They upload right away and are saved together with the issue.
export function useAttachmentUpload(projectId: string) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();

  const patch = (id: string, changes: Partial<PendingAttachment>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const addFiles = (files: File[]) => {
    files.forEach((file) => {
      const base = newUpload(file);
      const id = base.id;

      if (file.size > MAX_ATTACHMENT_SIZE) {
        setItems((prev) => [
          ...prev,
          { ...base, status: 'error', errorMessage: 'File too large (max 10MB)' },
        ]);
        return;
      }

      setItems((prev) => [...prev, base]);

      void (async () => {
        try {
          const { uploadUrl, fileKey, publicUrl } = await requestUploadUrl({
            folder: 'attachments',
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            projectId,
          });
          patch(id, { progress: 50 });
          await uploadFileToStorage(uploadUrl, file);
          patch(id, {
            status: 'done',
            progress: 100,
            fileKey,
            file: {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              url: publicUrl ?? '', // private files have no public url
            },
          });
        } catch (err) {
          patch(id, {
            status: 'error',
            errorMessage: getAuthErrorMessage(err, 'Upload failed') ?? 'Upload failed',
          });
        }
      })();
    });
  };

  const removeFile = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const reset = () => setItems([]);

  const readyAttachments = items
    .filter((item) => item.status === 'done' && item.file && item.fileKey)
    .map((item) => ({
      fileKey: item.fileKey!,
      fileName: item.file!.fileName,
      fileSize: item.file!.fileSize,
      mimeType: item.file!.mimeType,
    }));

  return { items, addFiles, removeFile, reset, readyAttachments };
}
