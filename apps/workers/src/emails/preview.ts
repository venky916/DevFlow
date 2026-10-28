import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';

import type { EmailJobData } from '@devflow/queues';
import { NotificationTypes } from '@devflow/types';

import { renderEmail } from './templates';

const base = process.env.BASE_WEB_URL ?? 'http://localhost:3000';

const samples: EmailJobData[] = [
  {
    to: 'test@example.com',
    type: NotificationTypes.WORKSPACE_INVITED,
    data: {
      workspaceName: 'Techcorp',
      invitedBy: 'Ravi Kumar',
      inviteLink: `${base}/invite?token=abc123`,
      role: 'MEMBER',
    },
  },
  {
    to: 'test@example.com',
    type: NotificationTypes.ISSUE_ASSIGNED,
    data: {
      assignedBy: 'Ravi Kumar',
      // the nasty title is on purpose: it must show up as plain text
      issueTitle: 'Fix <b>login</b> <a href="https://evil.com">click here</a>',
      projectName: 'devflow-be · Techcorp',
      issueLink: `${base}/techcorp/devflow-be/issues/abc123`,
    },
  },
  {
    to: 'test@example.com',
    type: NotificationTypes.PASSWORD_RESET,
    data: { resetLink: `${base}/reset-password?oobCode=abc123` },
  },
];

mkdirSync('email-previews', { recursive: true });
for (const job of samples) {
  const email = renderEmail(job);
  if (email) writeFileSync(`email-previews/${job.type}.html`, email.html);
}
console.log('Wrote email-previews/*.html. Open them in a browser.');
