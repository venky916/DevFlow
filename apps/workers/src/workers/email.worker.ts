import { Job, Worker } from 'bullmq';
import nodemailer from 'nodemailer';

import { captureError, logger } from '@devflow/backend-common';
import { createRedisConnection, EmailJobData, isFinalFailure, runJob } from '@devflow/queues';

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

  // the address is personal data, so it is never written to the logs
  logger.debug({ jobId: job.id, type }, 'Processing email job');

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

    logger.info({ jobId: job.id, type, messageId: response.messageId }, 'Email sent');
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        type,
        reason: error instanceof Error ? error.message : String(error),
        code: (error as { code?: string }).code,
      },
      'Email failed to send',
    );
    throw error; // BullMQ will retry
  }
}

export const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  (job) => runJob(job, () => emailFunction(job)),
  { connection: createRedisConnection(), concurrency: 2 },
);

(async () => {
  try {
    await emailWorker.waitUntilReady();
    logger.info('Email worker connected to Redis');
  } catch (err) {
    logger.error({ err }, 'Email worker could not connect to Redis');
    process.exit(1);
  }
})();

emailWorker.on('completed', (job) => {
  runJob(job, () => logger.debug({ jobId: job.id }, 'Email job completed'));
});

// the reason was already logged where it failed. This line shows how many tries were used.
emailWorker.on('failed', (job, err) => {
  runJob(job, () => {
    logger.error({ jobId: job?.id, attempts: job?.attemptsMade }, 'Email job failed');
    if (isFinalFailure(job)) captureError(err, { queue: 'email', jobId: job?.id });
  });
});
