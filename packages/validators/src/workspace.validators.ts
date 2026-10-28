import { z } from 'zod';

// Top-level URLs that are real pages. A workspace slug must never match one,
// because /{slug} would then show the page, not the workspace.
// Add a name here whenever you add a top-level route under app/.
export const RESERVED_WORKSPACE_SLUGS: readonly string[] = [
  'workspaces',
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'invite',
  'no-access',
  'inbox',
  'my-issues',
  'profile',
  'api',
];

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens')
    .refine((s) => !RESERVED_WORKSPACE_SLUGS.includes(s), 'This URL is reserved, choose another'),
  logoUrl: z.url('Invalid URL').optional().nullable(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const updateWorkspaceLogoSchema = z.object({
  url: z.url(),
});

export const createInviteSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type UpdateWorkspaceLogoInput = z.infer<typeof updateWorkspaceLogoSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
