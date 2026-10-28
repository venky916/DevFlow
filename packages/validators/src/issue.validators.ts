import { z } from 'zod';

import { attachmentInputSchema } from './attachment.validators';

const IssueTypeEnum = z.enum(['BUG', 'TASK', 'FEATURE', 'IMPROVEMENT', 'OTHER']);
const IssueStatusEnum = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
const BoardStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
const IssuePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY', 'URGENT']);

// status is decided by the server (active sprint = Todo, otherwise Backlog)
// parentId is not accepted: sub-issues are created or attached from the parent's panel only
export const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(500).optional().nullable(),
  priority: IssuePriorityEnum.optional().default('NO_PRIORITY'),
  type: IssueTypeEnum.optional().default('TASK'),
  sprintId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  labelIds: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentInputSchema).optional(),
});

export const createSubIssueSchema = createIssueSchema.pick({
  title: true,
  description: true,
  priority: true,
  type: true,
  assigneeId: true,
  dueDate: true,
  labelIds: true,
});

// status changes go through /move, sprint changes through /move-to-sprint,
// parent changes through the children endpoints
export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  priority: IssuePriorityEnum.optional(),
  type: IssueTypeEnum.optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

// an issue can only be moved inside the active sprint, so Backlog is not a target.
// position is optional: when missing, the server puts the card at the end of the column
export const moveIssueSchema = z.object({
  status: BoardStatusEnum,
  position: z.string().min(1).max(64).optional(),
});

export const moveIssueToSprintSchema = z.object({
  sprintId: z.string().nullable(),
  position: z.string().min(1).max(64).optional(),
});

export const attachChildSchema = z.object({
  issueId: z.string().min(1),
});

// z.stringbool turns "false" into false (z.coerce.boolean turned it into true)
export const issueFilterSchema = z.object({
  assigneeId: z.string().optional(),
  labelId: z.string().optional(),
  type: IssueTypeEnum.optional(),
  priority: IssuePriorityEnum.optional(),
  status: IssueStatusEnum.optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  noDueDate: z.stringbool().optional(),
  q: z.string().optional(),
});

export const myIssuesFilterSchema = z.object({
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  type: IssueTypeEnum.optional(),
  priority: IssuePriorityEnum.optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  noDueDate: z.stringbool().optional(),
  q: z.string().optional(),
});

export type CreateIssueInput = z.input<typeof createIssueSchema>;
export type CreateIssueOutput = z.output<typeof createIssueSchema>;

export type CreateSubIssueInput = z.input<typeof createSubIssueSchema>;
export type CreateSubIssueOutput = z.output<typeof createSubIssueSchema>;

export type UpdateIssueInput = z.input<typeof updateIssueSchema>;
export type UpdateIssueOutput = z.output<typeof updateIssueSchema>;

export type MoveIssueInput = z.infer<typeof moveIssueSchema>;
export type MoveIssueToSprintInput = z.infer<typeof moveIssueToSprintSchema>;
export type AttachChildInput = z.infer<typeof attachChildSchema>;
