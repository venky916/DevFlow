import { generatePresignedDownloadUrl, extractKeyFromUrl } from "@devflow/storage";

// packages/storage or a shared lib
export async function signUrl(rawUrl: string | null | undefined): Promise<string | null> {
    if (!rawUrl) return null;
    return generatePresignedDownloadUrl(extractKeyFromUrl(rawUrl));
}