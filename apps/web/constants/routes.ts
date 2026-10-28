export const ROUTES = {
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  invite: '/invite',
  workspaces: '/workspaces',
  inbox: '/inbox',
  myIssues: '/my-issues',
  profile: '/profile',

  workspace: (slug: string) => `/${slug}`,
  workspaceSettings: (slug: string) => `/${slug}/settings`,
  workspaceAnalytics: (slug: string) => `/${slug}/analytics`,

  project: (workspaceSlug: string, projectSlug: string) => `/${workspaceSlug}/${projectSlug}`,
  projectSettings: (workspaceSlug: string, projectSlug: string) =>
    `/${workspaceSlug}/${projectSlug}/settings`,
  projectBoard: (workspaceSlug: string, projectSlug: string) =>
    `/${workspaceSlug}/${projectSlug}/board`,
  projectBacklog: (workspaceSlug: string, projectSlug: string) =>
    `/${workspaceSlug}/${projectSlug}/backlog`,
  projectSprints: (workspaceSlug: string, projectSlug: string) =>
    `/${workspaceSlug}/${projectSlug}/sprints`,
  projectAnalytics: (workspaceSlug: string, projectSlug: string) =>
    `/${workspaceSlug}/${projectSlug}/analytics`,
  issue: (workspaceSlug: string, projectSlug: string, issueId: string) =>
    `/${workspaceSlug}/${projectSlug}/issues/${issueId}`,

  noAccess: (reason: 'not-a-member' | 'insufficient-role', workspaceSlug?: string) => {
    const params = new URLSearchParams({ reason });
    if (workspaceSlug) params.set('workspace', workspaceSlug);
    return `/no-access?${params.toString()}`;
  },
} as const;
