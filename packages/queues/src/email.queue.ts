import { Queue } from 'bullmq';

import { NotificationTypes } from '@devflow/types';

import { createRedisConnection } from './connection';

// What each email needs. A missing or misspelled field is a compile error.
export interface InviteEmailData {
  workspaceName: string;
  invitedBy: string;
  inviteLink: string;
  role: string;
}

export interface IssueAssignedEmailData {
  assignedBy: string;
  issueTitle: string;
  projectName: string;
  issueLink: string;
}

export interface PasswordResetEmailData {
  resetLink: string;
}

// Email is only for things the person can't see in the app: invites, password resets, and assignments.
// Everything else (comments, mentions, sprints, projects) is an in-app notification only.
export type EmailJobData = { to: string } & (
  | { type: typeof NotificationTypes.WORKSPACE_INVITED; data: InviteEmailData }
  | { type: typeof NotificationTypes.ISSUE_ASSIGNED; data: IssueAssignedEmailData }
  | { type: typeof NotificationTypes.PASSWORD_RESET; data: PasswordResetEmailData }
);

export type EmailType = EmailJobData['type'];

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000, // wait 30s before retry (email sending)
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
