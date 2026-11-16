import { z } from 'zod';

export const joinProjectSchema = z.object({
  type: z.literal('JOIN_PROJECT'),
  payload: z.object({
    projectId: z.string().min(1),
  }),
});

export const leaveProjectSchema = z.object({
  type: z.literal('LEAVE_PROJECT'),
  payload: z.object({
    projectId: z.string().min(1),
  }),
});

export const joinIssueSchema = z.object({
  type: z.literal('JOIN_ISSUE'),
  payload: z.object({
    issueId: z.string().min(1),
  }),
});

export const leaveIssueSchema = z.object({
  type: z.literal('LEAVE_ISSUE'),
  payload: z.object({
    issueId: z.string().min(1),
  }),
});

export const cursorMoveSchema = z.object({
  type: z.literal('CURSOR_MOVE'),
  payload: z.object({
    projectId: z.string().min(1),
    // x is a fraction of the board's width (0 to 1), y is pixels from the top of its content
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(20000),
  }),
});

export const cursorLeaveSchema = z.object({
  type: z.literal('CURSOR_LEAVE'),
  payload: z.object({
    projectId: z.string().min(1),
  }),
});

export const dragStartSchema = z.object({
  type: z.literal('DRAG_START'),
  payload: z.object({
    projectId: z.string().min(1),
    issueId: z.string().min(1),
  }),
});

export const dragEndSchema = z.object({
  type: z.literal('DRAG_END'),
  payload: z.object({
    projectId: z.string().min(1),
    issueId: z.string().min(1),
    // true: a move is being saved, so the card is about to jump. false: cancelled or dropped back.
    dropped: z.boolean(),
  }),
});

export const wsEVentSchema = z.discriminatedUnion('type', [
  joinProjectSchema,
  leaveProjectSchema,
  leaveIssueSchema,
  cursorMoveSchema,
]);

export const presenceActionSchema = z.object({
  type: z.literal('PRESENCE_ACTION'),
  payload: z.object({
    issueId: z.string().min(1),
    // null means "stopped"
    kind: z.enum(['commenting', 'editing', 'uploading']).nullable(),
  }),
});

export type WsEvent = z.infer<typeof wsEVentSchema>;
