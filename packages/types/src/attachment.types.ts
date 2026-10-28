import { IUserSummary } from './user.types';

export interface UploadedFileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface PendingAttachment {
  id: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
  file: UploadedFileInfo | null;
  fileKey: string | null; // only present once upload succeeds — needed for the save payload
  attachmentId: string | null;
  localName: string;
  localSize: number;
  localMimeType: string;
  uploader?: IUserSummary;
}

export interface IAttachment {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  issueId: string | null;
  createdAt: string;
  uploader: IUserSummary;
  url: string;
}
export interface IUploadTarget {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string | null;
}
