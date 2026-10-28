'use client';

import { useParams, usePathname, useSearchParams } from 'next/navigation';

import { ROUTES } from '../constants/routes';
import { useUIStore } from '../stores/ui.store';
import { useProjectBySlug } from './use-projects';
import { useWorkspaceBySlug } from './use-workspaces';

const PAGE_LABELS: Record<string, string> = {
  board: 'Board',
  backlog: 'Backlog',
  sprints: 'Sprints',
  settings: 'Settings',
  members: 'Members',
  notifications: 'Notifications',
  profile: 'Profile',
  'my-issues': 'My Issues',
  inbox: 'Inbox',
  workspaces: 'Workspaces',
  analytics: 'Analytics',
};

export function usePageHeader(pageTitle?: string) {
  const params = useParams<{ workspaceSlug?: string; projectSlug?: string }>();
  const workspaceSlug = params.workspaceSlug ?? '';
  const projectSlug = params.projectSlug ?? '';
  const pathname = usePathname();
  const from = useSearchParams().get('from');

  const openSearch = useUIStore((s) => s.openCommandPalette);
  const toggleMobileDrawer = useUIStore((s) => s.toggleMobileDrawer);

  // both are already cached by the guards, so these make no request
  const { data: workspace } = useWorkspaceBySlug(workspaceSlug);
  const { data: project } = useProjectBySlug(workspaceSlug, projectSlug);

  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? '';
  const onIssuePage = segments[segments.length - 2] === 'issues';

  const isLeaf = lastSegment !== projectSlug && lastSegment !== workspaceSlug;
  const pageLabel =
    pageTitle ??
    (onIssuePage && from ? PAGE_LABELS[from] : isLeaf ? PAGE_LABELS[lastSegment] : undefined);

  const crumbs = [
    workspaceSlug ? (workspace?.name ?? workspaceSlug) : null,
    projectSlug ? (project?.name ?? projectSlug) : null,
    pageLabel ?? null,
  ].filter((crumb): crumb is string => !!crumb);

  // from an issue, "back" returns to the list it was opened from; otherwise one level up
  const originHref: Record<string, string> = {
    'my-issues': ROUTES.myIssues,
    board: ROUTES.projectBoard(workspaceSlug, projectSlug),
    backlog: ROUTES.projectBacklog(workspaceSlug, projectSlug),
  };
  const parentHref = '/' + segments.slice(0, -1).join('/');
  const backHref = (onIssuePage && from && originHref[from]) || parentHref;

  return {
    crumbs,
    backHref,
    showBack: segments.length > 1,
    openSearch,
    toggleMobileDrawer,
  };
}
