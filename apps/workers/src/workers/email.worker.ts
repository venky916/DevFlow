import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
// import { Resend } from "resend";
import { logger } from "@devflow/backend-common";
import { EmailJobData, createRedisConnection } from "@devflow/queues";
import { NotificationTypes } from "@devflow/types";

// const resend = new Resend(process.env.RESEND_API_KEY!);
// ─── Nodemailer transporter ───────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER!,
        pass: process.env.GMAIL_APP_PASSWORD!
    }
});

// ─── Email templates ──────────────────────────────────────────────
const getEmailContent = (type: EmailJobData['type'], data: Record<string, any>) => {
    switch (type) {
        case NotificationTypes.ISSUE_ASSIGNED:
            return {
                subject: `You've been assigned to: ${data.issueTitle}`,
                html: `
          <h2>New Issue Assigned</h2>
          <p>Hi ${data.assigneeName},</p>
          <p><strong>${data.assignedBy}</strong> assigned you to:</p>
          <h3>${data.issueTitle}</h3>
          <p>Project: ${data.projectName}</p>
          <a href="${data.issueLink}">View Issue</a>
        `,
            };

        case NotificationTypes.ISSUE_COMMENTED:
            return {
                subject: `New comment on: ${data.issueTitle}`,
                html: `
          <h2>New Comment</h2>
          <p><strong>${data.commentedBy}</strong> commented on <strong>${data.issueTitle}</strong>:</p>
          <blockquote>${data.comment}</blockquote>
          <a href="${data.issueLink}">View Issue</a>
        `,
            };


        case NotificationTypes.SPRINT_STARTED:
            return {
                subject: `Sprint started: ${data.sprintName}`,
                html: `
          <h2>Sprint Started!</h2>
          <p>Sprint <strong>${data.sprintName}</strong> has started in <strong>${data.projectName}</strong>.</p>
          <p>Issues in sprint: ${data.issueCount}</p>
        `,
            };

        case NotificationTypes.SPRINT_COMPLETED:
            return {
                subject: `Sprint completed: ${data.sprintName}`,
                html: `
          <h2>Sprint Completed!</h2>
          <p>Sprint <strong>${data.sprintName}</strong> has been completed.</p>
          <p>✅ Done: ${data.doneCount}</p>
          <p>🔄 Moved to backlog: ${data.incompleteCount}</p>
        `,
            };

        case NotificationTypes.WORKSPACE_INVITED:
            return {
                subject: `You've been invited to join ${data.workspaceName} on DevFlow`,
                html: `
            <h2>You're invited!</h2>
            <p><strong>${data.invitedBy}</strong> invited you to join <strong>${data.workspaceName}</strong> as <strong>${data.role}</strong>.</p>
            <p>This invite expires in 7 days.</p>
            <a href="${data.inviteLink}" style="
                background: #6366f1;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                display: inline-block;
                margin-top: 16px;
            ">Accept Invite</a>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
                If you didn't expect this invite, you can ignore this email.
            </p>
        `
            }

        case NotificationTypes.PROJECT_ADDED:
            return {
                subject: `You've been added to: ${data.projectName}`,
                html: `
          <h2>Added to Project</h2>
          <p>You've been added to <strong>${data.projectName}</strong> as ${data.role}.</p>
        `,
            };

        default:
            return {
                subject: 'DevFlow Notification',
                html: '<p>You have a new notification from DevFlow.</p>',
            };
    }
}

async function emailFunction(job: Job<EmailJobData>) {
    const { to, type, data } = job.data;

    logger.info({ jobId: job.id, to, type }, "Processing email job")

    const { subject, html } = getEmailContent(type, data);

    try {
        const response = await transporter.sendMail({
            from: `DevFlow <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html
        })

        logger.info({
            jobId: job.id,
            to,
            type,
            messageId: response.messageId,
            response: response.response
        }, "✅ Email sent successfully")

    } catch (error) {
        logger.error({
            jobId: job.id,
            to,
            error: error instanceof Error ? error.message : String(error),
            errorCode: error instanceof Error && 'code' in error ? (error as any).code : null
        }, "❌ Email failed to send")
        throw error  // BullMQ will retry
    }
}

export const emailWorker = new Worker<EmailJobData>("email-queue", emailFunction, { connection: createRedisConnection(), concurrency: 2 });

(async () => {
    try {
        await emailWorker.waitUntilReady()
        logger.info("✅ Email worker connected to Redis")
    } catch (error) {
        logger.error({ error }, "❌ Activity worker FAILED to connect to Redis")
        process.exit(1)
    }
})()

emailWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Email job completed")
})

emailWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error }, "Email job failed")
})