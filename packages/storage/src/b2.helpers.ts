import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client, B2_BUCKET_NAME } from "./b2.client";
import { randomUUID } from 'crypto';

// ─── Upload URL ───────────────────────────────────────────────
// generates a presigned URL the client uses to upload directly to B2
// fileKey is the path inside bucket e.g. "attachments/abc123.png"

export type PresignedUploadResult = {
    uploadUrl: string; // client PUTs file to this URL
    fileKey: string; // client sends this back to API after upload
    publicUrl: string // permanent URL to access file (via download presign later)
}

export type UploadFolder = "attachments" | "avatars" | "logos"

export const generatePresignedUploadUrl = async (folder: UploadFolder, fileName: string, mimeType: string, expiresInSeconds = 3000) => {

    // unique key so files never collide
    const ext = fileName.split('.').pop()
    const fileKey = `${folder}/${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: fileKey,
        ContentType: mimeType
    })

    const uploadUrl = await getSignedUrl(b2Client, command, {
        expiresIn: expiresInSeconds,
        // tell signer to not add checksum headers
        unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm']),
    })

    return {
        uploadUrl,
        fileKey,
        publicUrl: `${process.env.B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileKey}`
    }
}

// ─── Download URL ─────────────────────────────────────────────
// since bucket is private, every read needs a signed URL
// expires in 1 hour by default
export const generatePresignedDownloadUrl = async (fileKey: string, expiresInSeconds = 3600) => {
    const command = new GetObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: fileKey
    })

    return getSignedUrl(b2Client, command, {
        expiresIn: expiresInSeconds
    })
}

// ─── Delete ───────────────────────────────────────────────────
// used by attachment delete endpoint + future cleanup worker

export const deleteFileFromB2 = async (fileKey: string) => {
    const command = new DeleteObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: fileKey
    })
    await b2Client.send(command)
}