// lib/roles.ts

export const WORKSPACE_ROLE_OPTIONS = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Member', value: 'MEMBER' },
];

export const PROJECT_ROLE_OPTIONS = [
  { label: 'Lead', value: 'LEAD' },
  { label: 'Developer', value: 'DEVELOPER' },
  { label: 'Viewer', value: 'VIEWER' },
];

export function displayName(user?: { name?: string | null; email?: string | null } | null): string {
  return user?.name || user?.email || 'Unknown';
}
