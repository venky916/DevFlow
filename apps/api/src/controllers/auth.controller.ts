import { Request, Response } from 'express';
import { emailQueue } from "@devflow/queues";
import { NotificationTypes } from "@devflow/types";
import { logger, adminAuth } from '@devflow/backend-common';


export const me = (req: Request, res: Response) => {
    return res.json({ user: req.user });
};

export async function forgotPassword(req: Request, res: Response) {
    const { email } = req.body; // validate with your forgotPasswordSchema

    try {
        const rawLink = await adminAuth.generatePasswordResetLink(email, {
            url: `${process.env.BASE_WEB_URL}/reset-password`,
            handleCodeInApp: true,
        });

        // pull the oobCode out of Firebase's generated link
        const oobCode = new URL(rawLink).searchParams.get("oobCode");

        // build your own link pointing straight at your app
        const resetLink = `${process.env.BASE_WEB_URL}/reset-password?oobCode=${oobCode}`;

        await emailQueue.add("send-email", {
            to: email,
            type: NotificationTypes.PASSWORD_RESET,
            data: { resetLink },
        });
    } catch (err) {
        // swallow the "user not found" case — don't leak whether the email exists
        logger.warn({ email, err }, "Password reset requested for unknown/failed email");
    }

    // always respond success regardless of outcome
    res.json({ message: "If an account exists for this email, a reset link has been sent." });
}