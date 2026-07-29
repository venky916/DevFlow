import { useState, useCallback } from "react";
import { useGetPresignedUrl, uploadFileToB2 } from "./use-upload";
import type { PendingAttachment } from "@devflow/types";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export function useAttachmentUpload() {
    const [items, setItems] = useState<PendingAttachment[]>([]);
    const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();

    const addFiles = useCallback((files: File[]) => {
        files.forEach((file) => {
            const id = crypto.randomUUID();

            if (file.size > MAX_ATTACHMENT_SIZE) {
                setItems((prev) => [
                    ...prev,
                    {
                        id,
                        status: "error",
                        progress: 0,
                        errorMessage: "File too large (max 10MB)",
                        file: null,
                        fileKey: null,
                        localName: file.name,
                        localSize: file.size,
                        localMimeType: file.type,
                    },
                ]);
                return;
            }

            setItems((prev) => [
                ...prev,
                {
                    id,
                    status: "uploading",
                    progress: 0,
                    file: null,
                    fileKey: null,
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
                    setItems((prev) =>
                        prev.map((i) =>
                            i.id === id
                                ? {
                                    ...i,
                                    status: "done",
                                    progress: 100,
                                    fileKey,
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
    }, [getPresignedUrl]);

    const removeFile = useCallback((id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const reset = useCallback(() => setItems([]), []);

    const readyAttachments = items
        .filter((i) => i.status === "done" && i.file && i.fileKey)
        .map((i) => ({
            fileKey: i.fileKey!,
            fileName: i.file!.fileName,
            fileSize: i.file!.fileSize,
            mimeType: i.file!.mimeType,
            url: i.file!.url,
        }));

    return { items, addFiles, removeFile, reset, readyAttachments };
}