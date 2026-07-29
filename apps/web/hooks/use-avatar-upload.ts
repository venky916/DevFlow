import { useState } from "react";
import { useGetPresignedUrl, uploadFileToB2 } from "./use-upload";
import { useUpdateAvatar } from "./use-user";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // matches presignedUrlSchema max

export function useAvatarUpload() {
    const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();
    const { mutateAsync: updateAvatar } = useUpdateAvatar();
    const [isUploading, setIsUploading] = useState(false);

    const uploadAvatar = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            throw new Error("Only images are allowed");
        }
        if (file.size > MAX_AVATAR_SIZE) {
            throw new Error("File too large (max 10MB)");
        }

        setIsUploading(true);
        try {
            const { uploadUrl, publicUrl} = await getPresignedUrl({
                folder: "avatars",
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
            });
            await uploadFileToB2(uploadUrl, file);
            await updateAvatar(publicUrl);
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadAvatar, isUploading };
}