import { S3Client } from "@aws-sdk/client-s3";

// B2 is S3-compatible — same SDK, different endpoint
export const b2Client = new S3Client({
    endpoint: process.env.B2_ENDPOINT!,
    region: process.env.B2_REGION!,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APP_KEY!,
    },
    // disable checksum — B2 doesn't support it
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
})

export const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME!