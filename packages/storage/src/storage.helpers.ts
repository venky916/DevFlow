import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageClient, BUCKET_PRIVATE, BUCKET_PUBLIC, PUBLIC_URL } from "./client";
import { randomUUID } from 'crypto';

// ─── Upload URL ───────────────────────────────────────────────
// generates a presigned URL the client uses to upload directly to B2
// fileKey is the path inside bucket e.g. "attachments/abc123.png"
export type PresignedUploadResult = {
    uploadUrl: string; // client PUTs file to this URL
    fileKey: string; // client sends this back to API after upload
    publicUrl: string | null // permanent URL to access file (via download presign later)
}

export type UploadFolder = "attachments" | "avatars" | "logos"

const bucketForFolder = (folder: UploadFolder) => folder === "attachments" ? BUCKET_PRIVATE : BUCKET_PUBLIC;

// the key starts with the folder, so a key alone tells us which bucket it is in
const folderOf = (key: string) => key.split("/")[0] as UploadFolder

// ─── Upload URL ───────────────────────────────────────────────
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB for avatars and logos

export const generatePresignedUploadUrl = async (folder: UploadFolder, fileName: string, mimeType: string, fileSize: number, expiresInSeconds = 3000): Promise<PresignedUploadResult> => {

    // public folders only accept small images
    if (folder !== "attachments") {
        if (!IMAGE_TYPES.includes(mimeType)) throw new Error("Only png, jpeg or webp images are allowed")
        if (fileSize > MAX_IMAGE_SIZE) throw new Error("Image must be 2MB or smaller")
    }


    // unique key so files never collide
    const ext = fileName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin"
    const fileKey = `${folder}/${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
        Bucket: bucketForFolder(folder),
        Key: fileKey,
        ContentType: mimeType,
        ContentLength: fileSize
    })

    const uploadUrl = await getSignedUrl(storageClient, command, {
        expiresIn: expiresInSeconds,
        // tell signer to not add checksum headers
        unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm']),
    })

    return {
        uploadUrl,
        fileKey,
        publicUrl: folder === "attachments" ? null : `${PUBLIC_URL}/${fileKey}`,
    }
}

// ─── Download URL ─────────────────────────────────────────────
// since bucket is private, every read needs a signed URL
// expires in 1 hour by default
export const generatePresignedDownloadUrl = async (fileKey: string, expiresInSeconds = 3600, forceDownloadFileName?: string,) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_PRIVATE,
        Key: fileKey,
        ...(forceDownloadFileName && {
            ResponseContentDisposition: `attachment; filename="${forceDownloadFileName}"`,
        }),
    })

    return getSignedUrl(storageClient, command, {
        expiresIn: expiresInSeconds
    })
}

// ─── Delete ───────────────────────────────────────────────────
// used by attachment delete endpoint + future cleanup worker
export const deleteFile = async (fileKey: string) => {
    const command = new DeleteObjectCommand({
        Bucket: bucketForFolder(folderOf(fileKey)),
        Key: fileKey
    })
    await storageClient.send(command)
}

// ─── Public URL helpers ───────────────────────────────────────
// public URL -> key (used when deleting old avatars/logos)
export const keyFromUrl = (url: string) => url.replace(`${PUBLIC_URL}/`, "")

// true only if the URL points inside OUR public bucket and the right folder
export const isPublicUrlIn = (url: string, folder: "avatars" | "logos") =>
    url.startsWith(`${PUBLIC_URL}/${folder}/`)