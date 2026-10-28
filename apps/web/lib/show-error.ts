import { toast } from 'sonner';

import { getAuthErrorMessage } from './auth-errors';

export function showError(err: unknown, fallback: string) {
  const message = getAuthErrorMessage(err, fallback);
  if (message) toast.error(message);
}
