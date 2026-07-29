import { generatePresignedDownloadUrl } from "@devflow/storage";

// packages/storage or a shared lib
export async function signUrl(rawUrl: string | null | undefined): Promise<string | null> {
    if (!rawUrl) return null;
    const key = rawUrl.includes(`${process.env.B2_BUCKET_NAME}/`)
        ? rawUrl.split(`${process.env.B2_BUCKET_NAME}/`)[1]
        : rawUrl;
    return generatePresignedDownloadUrl(key!);
}