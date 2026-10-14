'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, IUploadTarget } from '@devflow/types';
import type { RequestUploadUrlInput } from '@devflow/validators';

import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { uploadFileToStorage } from '../lib/upload';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Step 1: ask the API for a one-time upload link
export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: async (input: RequestUploadUrlInput) => {
      const res = await api.post<IApiResponse<IUploadTarget>>('/upload/presigned-url', input);
      return res.data.data;
    },
  });
}

// Steps 1 + 2: returns the public URL, or null after showing an error toast
export function useUploadImage(folder: 'avatars' | 'logos') {
  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only images are allowed');
      return null;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('File too large (max 10MB)');
      return null;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, publicUrl } = await requestUploadUrl({
        folder,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      if (!publicUrl) throw new Error('No public URL returned');
      await uploadFileToStorage(uploadUrl, file);
      return publicUrl;
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Failed to upload image');
      if (message) toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
}