'use client';

import { toast } from 'sonner';

export function useCopyLink() {
  return async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
}
