import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { PresignedUrlInput } from "@devflow/validators";

export interface PresignedUrlResult {
    uploadUrl: string; // signed PUT url, use once
    fileKey: string;       // e.g. "avatars/uuid.png" — needed later for deleteFile
    publicUrl: string;        // ⚠️ CONFIRM this key name against generatePresignedUploadUrl — clean public url to persist in DB
}

export function useGetPresignedUrl() {
    return useMutation({
        mutationFn: async (data: PresignedUrlInput) => {
            const res = await api.post("/upload/presigned-url", data);
            return res.data.data as PresignedUrlResult;
        },
    });
}

export async function uploadFileToB2(uploadUrl: string, file: File) {
    const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
    });
    if (!res.ok) {
        throw new Error("Upload to storage failed");
    }
}