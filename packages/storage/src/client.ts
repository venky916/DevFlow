import { S3Client } from "@aws-sdk/client-s3";

// B2 is S3-compatible — same SDK, different endpoint
export const storageClient = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION ?? "auto",
    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    // disable checksum — B2 doesn't support it
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
})

export const BUCKET_PRIVATE = process.env.STORAGE_BUCKET_PRIVATE!
export const BUCKET_PUBLIC = process.env.STORAGE_BUCKET_PUBLIC!

if (!process.env.STORAGE_PUBLIC_URL) throw new Error("STORAGE_PUBLIC_URL is required")
export const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL!.replace(/\/$/, "")