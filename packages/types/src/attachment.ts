import { IUserPublic } from "./user.types";

export interface UploadedFileInfo {
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
}

export interface PendingAttachment {
    id: string;
    status: "uploading" | "done" | "error";
    progress: number;
    errorMessage?: string;
    file: UploadedFileInfo | null;
    fileKey: string | null; // only present once upload succeeds — needed for the save payload
    attachmentId: string | null;
    localName: string;
    localSize: number;
    localMimeType: string;
}

export interface IAttachment extends UploadedFileInfo {
    id: string;
    uploader?: IUserPublic;
    createdAt?: Date;
}