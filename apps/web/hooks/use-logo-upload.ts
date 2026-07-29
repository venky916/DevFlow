import { useState } from "react";
import { useGetPresignedUrl, uploadFileToB2 } from "./use-upload";
import { useUpdateWorkspaceLogo } from "./use-workspaces";

const MAX_LOGO_SIZE = 10 * 1024 * 1024; // 10MB, matches presignedUrlSchema max

export function useLogoUpload(workspaceId: string) {
    const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();
    const { mutateAsync: updateLogo } = useUpdateWorkspaceLogo(workspaceId);
    const [isUploading, setIsUploading] = useState(false);

    const uploadLogo = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            throw new Error("Only images are allowed");
        }
        if (file.size > MAX_LOGO_SIZE) {
            throw new Error("File too large (max 10MB)");
        }

        setIsUploading(true);
        try {
            const { uploadUrl, publicUrl } = await getPresignedUrl({
                folder: "logos",
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
            });
            await uploadFileToB2(uploadUrl, file);
            await updateLogo(publicUrl);
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadLogo, isUploading };
}