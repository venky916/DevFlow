import { Request, Response } from 'express';

import { adminAuth, logger } from '@devflow/backend-common';
import { forgotPasswordSchema } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { absoluteUrl, webLinks } from '../lib/web-links';
import { notificationService } from '../services/notification.service';

// Firebase's error codes for an email that has no account
const UNKNOWN_EMAIL_CODES = new Set(['auth/user-not-found', 'auth/email-not-found']);

function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

// ─── FORGOT PASSWORD POST /auth/forgot-password ──────────────────────────
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  // a bad email format reaches the error handler as a 422
  const { email } = forgotPasswordSchema.parse(req.body);

  let rawLink: string | undefined;
  try {
    rawLink = await adminAuth.generatePasswordResetLink(email, {
      url: absoluteUrl('/reset-password'),
      handleCodeInApp: true,
    });
  } catch (err) {
    // only "no such account" is swallowed, so the response never reveals whether the email exists
    if (!UNKNOWN_EMAIL_CODES.has(getErrorCode(err) ?? '')) throw err;
    logger.warn('Password reset requested for an unknown email');
  }

  if (rawLink) {
    // pull the oobCode out of Firebase's link and point it straight at our app
    const oobCode = new URL(rawLink).searchParams.get('oobCode');
    if (!oobCode) throw ApiError.internal('Could not create the reset link');

    await notificationService.sendPasswordResetEmail(
      email,
      absoluteUrl(webLinks.resetPassword(oobCode)),
    );
  }

  // same answer whether or not the account exists
  sendSuccess(res, null, 'If an account exists for this email, a reset link has been sent.');
});