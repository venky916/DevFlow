import type {
  EmailJobData,
  InviteEmailData,
  IssueAssignedEmailData,
  PasswordResetEmailData,
} from '@devflow/queues';
import { NotificationTypes } from '@devflow/types';

import { button, detailsBox, heading, note, paragraph, strong } from './components';
import { safeLink } from './config';
import { html, join, oneLine } from './html';
import { renderLayout } from './layout';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string; // plain-text version: shown by some mail apps and helps with spam filters
}

const lines = (...parts: string[]) => parts.join('\n\n');

function invite(d: InviteEmailData): RenderedEmail {
  const role = d.role.toLowerCase();
  const article = /^[aeiou]/.test(role) ? 'an' : 'a';

  const body = join([
    heading(`Join ${d.workspaceName} on DevFlow`),
    paragraph(
      html`${strong(d.invitedBy)} invited you to join ${strong(d.workspaceName)} as ${article}
      ${role}.`,
    ),
    paragraph('The invite expires in 7 days.'),
    button('Accept invite', d.inviteLink),
    note("If you weren't expecting this invite, you can ignore this email."),
  ]);

  return {
    subject: oneLine(`${d.invitedBy} invited you to join ${d.workspaceName} on DevFlow`),
    html: renderLayout(oneLine(`Accept the invite to join ${d.workspaceName}`), body),
    text: lines(
      `${d.invitedBy} invited you to join ${d.workspaceName} as ${article} ${role}.`,
      'The invite expires in 7 days.',
      `Accept invite: ${safeLink(d.inviteLink)}`,
      "If you weren't expecting this invite, you can ignore this email.",
    ),
  };
}

function issueAssigned(d: IssueAssignedEmailData): RenderedEmail {
  const body = join([
    heading(`${d.assignedBy} assigned you an issue`),
    detailsBox(d.issueTitle, d.projectName),
    button('View issue', d.issueLink),
  ]);

  return {
    subject: oneLine(`${d.assignedBy} assigned you: ${d.issueTitle}`),
    html: renderLayout(oneLine(`${d.projectName} · ${d.issueTitle}`), body),
    text: lines(
      `${d.assignedBy} assigned you an issue.`,
      `${d.issueTitle}\n${d.projectName}`,
      `View issue: ${safeLink(d.issueLink)}`,
    ),
  };
}

function passwordReset(d: PasswordResetEmailData): RenderedEmail {
  const body = join([
    heading('Reset your password'),
    paragraph('Use the button below to choose a new password. The link expires in 1 hour.'),
    button('Reset password', d.resetLink),
    note("If you didn't ask for this, you can ignore this email. Your password won't change."),
  ]);

  return {
    subject: 'Reset your DevFlow password',
    html: renderLayout('Choose a new password for your DevFlow account', body),
    text: lines(
      'Use the link below to choose a new password. The link expires in 1 hour.',
      `Reset password: ${safeLink(d.resetLink)}`,
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
    ),
  };
}

// null means "no template for this type": an old job still waiting in Redis
// (comment, sprint and project emails were removed). The worker skips it.
export function renderEmail(job: EmailJobData): RenderedEmail | null {
  switch (job.type) {
    case NotificationTypes.WORKSPACE_INVITED:
      return invite(job.data);
    case NotificationTypes.ISSUE_ASSIGNED:
      return issueAssigned(job.data);
    case NotificationTypes.PASSWORD_RESET:
      return passwordReset(job.data);
    default:
      return null;
  }
}
