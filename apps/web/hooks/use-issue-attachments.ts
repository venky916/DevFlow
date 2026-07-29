import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { useGetPresignedUrl, uploadFileToB2 } from "./use-upload";
import type { PendingAttachment, UploadedFileInfo, IAttachment } from "@devflow/types";

export function useIssueAttachments(issueId: string, initial: IAttachment[] = []) {
    const qc = useQueryClient();
    const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();

    const [items, setItems] = useState<PendingAttachment[]>(
        initial.map((f) => ({
            id: crypto.randomUUID(),
            status: "done",
            progress: 100,
            file: f,
            fileKey: null, // already-saved attachments don't need fileKey locally — backend owns it
            attachmentId: f.id,
            localName: f.fileName,
            localSize: f.fileSize,
            localMimeType: f.mimeType,
        })),
    );

    const saveAttachment = useMutation({
        mutationFn: async (payload: {
            fileKey: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
            url: string;
        }) => {
            const res = await api.post(`/issues/${issueId}/attachments`, payload);
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["issue", issueId] }),
    });

    const deleteAttachment = useMutation({
        mutationFn: async (attachmentId: string) => {
            await api.delete(`/issues/${issueId}/attachments/${attachmentId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["issue", issueId] }),
    });

    const addFiles = useCallback(
        (files: File[]) => {
            files.forEach((file) => {
                const id = crypto.randomUUID();

                setItems((prev) => [
                    ...prev,
                    {
                        id,
                        status: "uploading",
                        progress: 0,
                        file: null,
                        fileKey: null,
                        attachmentId: null,
                        localName: file.name,
                        localSize: file.size,
                        localMimeType: file.type,
                    },
                ]);

                (async () => {
                    try {
                        const { uploadUrl, fileKey, publicUrl } = await getPresignedUrl({
                            folder: "attachments",
                            fileName: file.name,
                            mimeType: file.type,
                            fileSize: file.size,
                        });
                        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, progress: 50 } : i)));

                        await uploadFileToB2(uploadUrl, file);

                        const saved = await saveAttachment.mutateAsync({
                            fileKey,
                            fileName: file.name,
                            fileSize: file.size,
                            mimeType: file.type,
                            url: publicUrl,
                        });

                        setItems((prev) =>
                            prev.map((i) =>
                                i.id === id
                                    ? {
                                        ...i,
                                        status: "done",
                                        progress: 100,
                                        fileKey,
                                        attachmentId: saved.id,
                                        file: {
                                            fileName: file.name,
                                            fileSize: file.size,
                                            mimeType: file.type,
                                            url: publicUrl,
                                        },
                                    }
                                    : i,
                            ),
                        );
                    } catch {
                        setItems((prev) =>
                            prev.map((i) =>
                                i.id === id ? { ...i, status: "error", errorMessage: "Upload failed" } : i,
                            ),
                        );
                    }
                })();
            });
        },
        [getPresignedUrl, saveAttachment],
    );

    const removeFile = useCallback(
        async (id: string) => {
            const item = items.find((i) => i.id === id);

            // never made it to the backend (mid-upload, or upload failed) — just drop it locally
            if (!item?.attachmentId) {
                setItems((prev) => prev.filter((i) => i.id !== id));
                return;
            }

            try {
                await deleteAttachment.mutateAsync(item.attachmentId);
                setItems((prev) => prev.filter((i) => i.id !== id));
            } catch {
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === id ? { ...i, status: "error", errorMessage: "Delete failed" } : i,
                    ),
                );
            }
        },
        [items, deleteAttachment],
    );

    return { items, addFiles, removeFile };
}