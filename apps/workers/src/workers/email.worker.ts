import { Job, Worker } from 'bullmq';
import nodemailer from 'nodemailer';

import { logger } from '@devflow/backend-common';
import { createRedisConnection, EmailJobData } from '@devflow/queues';

import { renderEmail } from '../emails/templates';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
});

async function emailFunction(job: Job<EmailJobData>) {
  const { to, type } = job.data;

  // the address is personal data, so it is not written to the logs
  logger.info({ jobId: job.id, type }, 'Processing email job');

  const email = renderEmail(job.data);
  if (!email) {
    logger.warn({ jobId: job.id, type }, 'No email template for this type, skipping');
    return;
  }

  try {
    const response = await transporter.sendMail({
      from: `DevFlow <${process.env.GMAIL_USER}>`,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    logger.info({ jobId: job.id, type, messageId: response.messageId }, '✅ Email sent');
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        type,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof Error && 'code' in error ? (error as any).code : null,
      },
      '❌ Email failed to send',
    );
    throw error; // BullMQ will retry
  }
}

export const emailWorker = new Worker<EmailJobData>('email-queue', emailFunction, {
  connection: createRedisConnection(),
  concurrency: 2,
});

(async () => {
  try {
    await emailWorker.waitUntilReady();
    logger.info('✅ Email worker connected to Redis');
  } catch (error) {
    logger.error({ error }, '❌ Email worker FAILED to connect to Redis');
    process.exit(1);
  }
})();

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email job completed');
});

emailWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Email job failed');
});
