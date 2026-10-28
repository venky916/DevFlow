// Paths in the web app. Keep in sync with constants/routes.ts in apps/web.
export const webLinks = {
  project: (workspaceSlug: string, projectSlug: string) => `/${workspaceSlug}/${projectSlug}`,
  board: (workspaceSlug: string, projectSlug: string) => `/${workspaceSlug}/${projectSlug}/board`,
  issue: (workspaceSlug: string, projectSlug: string, issueId: string) =>
    `/${workspaceSlug}/${projectSlug}/issues/${issueId}`,
  invite: (token: string) => `/invite?token=${token}`,
  resetPassword: (oobCode: string) => `/reset-password?oobCode=${encodeURIComponent(oobCode)}`,
};

// For emails, which need a full URL
export const absoluteUrl = (path: string) => `${process.env.BASE_WEB_URL}${path}`;