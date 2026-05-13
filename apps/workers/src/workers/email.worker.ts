import { Worker, Job } from "bullmq";
import { Resend } from 'resend';
import { prisma } from "@devflow/db";
import { logger } from "@devflow/backend-common";
import { EmailJobData } from "@devflow/queues";
import { connection } from "../lib/redis";

const resend = new Resend(process.env.RESEND_API_KEY!);

// ─── Email templates ──────────────────────────────────────────────
const getEmailContent = (type: EmailJobData['type'], data: Record<string, any>) => {
    switch (type) {
        case "ISSUE_ASSIGNED":
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

        case "ISSUE_COMMENTED":
            return {
                subject: `New comment on: ${data.issueTitle}`,
                html: `
          <h2>New Comment</h2>
          <p><strong>${data.commentedBy}</strong> commented on <strong>${data.issueTitle}</strong>:</p>
          <blockquote>${data.comment}</blockquote>
          <a href="${data.issueLink}">View Issue</a>
        `,
            };


        case "SPRINT_STARTED":
            return {
                subject: `Sprint started: ${data.sprintName}`,
                html: `
          <h2>Sprint Started!</h2>
          <p>Sprint <strong>${data.sprintName}</strong> has started in <strong>${data.projectName}</strong>.</p>
          <p>Issues in sprint: ${data.issueCount}</p>
        `,
            };

        case "SPRINT_COMPLETED":
            return {
                subject: `Sprint completed: ${data.sprintName}`,
                html: `
          <h2>Sprint Completed!</h2>
          <p>Sprint <strong>${data.sprintName}</strong> has been completed.</p>
          <p>✅ Done: ${data.doneCount}</p>
          <p>🔄 Moved to backlog: ${data.incompleteCount}</p>
        `,
            };

        case "WORKSPACE_INVITE":
            return {
                subject: `You've been invited to ${data.workspaceName}`,
                html: `
          <h2>Workspace Invitation</h2>
          <p><strong>${data.invitedBy}</strong> invited you to join <strong>${data.workspaceName}</strong>.</p>
          <a href="${data.inviteLink}">Accept Invitation</a>
        `,
            };

        case "PROJECT_ADDED":
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

    await resend.emails.send({ from: 'DevFlow<onboarding@resend.dev >', to, subject, html });

    logger.info({ jobId: job.id, to, type }, "Email sent successfully")
}

export const emailWorker = new Worker<EmailJobData>("email-queue", emailFunction, { connection, concurrency: 5 });

emailWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Email job completed")
})

emailWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error }, "Email job failed")
})