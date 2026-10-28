const DEFAULT_MESSAGE = 'Something went wrong. Please try again';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // same text for wrong password and unknown email, on purpose
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/wrong-password': 'Incorrect email or password',
  'auth/user-not-found': 'Incorrect email or password',
  'auth/invalid-email': 'Enter a valid email address',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password is too weak',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Check your connection and try again',
  'auth/user-disabled': 'This account has been disabled',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method',
  'auth/popup-blocked': 'Popup was blocked. Allow popups and try again',
  'auth/expired-action-code': 'This link has expired',
  'auth/invalid-action-code': 'This link is invalid or has already been used',
};

// The person closed the popup themselves: not an error, show nothing
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

function getApiMessage(err: unknown): string | undefined {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' ? message : undefined;
}

/**
 * Turns any thrown error into text a person can read.
 * Returns null when nothing should be shown (popup closed by the user).
 */
export function getAuthErrorMessage(
  err: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string | null {
  const code = getErrorCode(err);
  if (code && SILENT_CODES.has(code)) return null;
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  return getApiMessage(err) ?? fallback;
}
