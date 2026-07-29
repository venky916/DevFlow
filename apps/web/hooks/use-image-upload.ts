import { useState } from "react";
import { useGetPresignedUrl, uploadFileToB2 } from "./use-upload";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function useImageUpload(folder: "avatars" | "logos") {
    const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();
    const [isUploading, setIsUploading] = useState(false);

    const upload = async (file: File): Promise<string> => {
        if (!file.type.startsWith("image/")) {
            throw new Error("Only images are allowed");
        }
        if (file.size > MAX_IMAGE_SIZE) {
            throw new Error("File too large (max 10MB)");
        }

        setIsUploading(true);
        try {
            const { uploadUrl, publicUrl } = await getPresignedUrl({
                folder,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
            });
            await uploadFileToB2(uploadUrl, file);
            return publicUrl;
        } finally {
            setIsUploading(false);
        }
    };

    return { upload, isUploading };
}