'use client';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Menu, Search } from 'lucide-react';

import { useProjects } from '../../hooks/use-projects';
import { useWorkspaces } from '../../hooks/use-workspaces';
import { useUIStore } from '../../stores/ui.store';

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

interface PageHeaderProps {
  pageTitle?: string;
}

export function PageHeader({ pageTitle }: PageHeaderProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug?: string;
    projectSlug?: string;
  }>();
  const pathname = usePathname();
  const router = useRouter();
  const toggleMobileDrawer = useUIStore((s) => s.toggleMobileDrawer);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects } = useProjects(currentWorkspace?.id ?? '');
  const currentProject = projects?.find((p) => p.slug === projectSlug);

  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const onIssueDetailRoute = segments[segments.length - 2] === 'issues';
  const page =
    pageTitle ??
    (onIssueDetailRoute && from
      ? (PAGE_LABELS[from] ?? null)
      : lastSegment !== projectSlug && lastSegment !== workspaceSlug
        ? (PAGE_LABELS[lastSegment as string] ?? null)
        : null);

  const crumbs = [
    workspaceSlug ? (currentWorkspace?.name ?? workspaceSlug) : null,
    projectSlug ? (currentProject?.name ?? projectSlug) : null,
    page,
  ].filter(Boolean) as string[];

  const backTarget =
    onIssueDetailRoute && from
      ? from === 'my-issues'
        ? '/my-issues'
        : `/${workspaceSlug}/${projectSlug}/${from}`
      : '/' + segments.slice(0, -1).join('/');

  const showBack = segments.length > 1;

  return (
    <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border-default px-5">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMobileDrawer}
          className="cursor-pointer text-text-muted transition-colors hover:text-text-primary min-[1025px]:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-3.5 w-3.5" />
        </button>
        {showBack && (
          <button
            onClick={() => router.push(backTarget)}
            className="cursor-pointer text-text-muted transition-colors hover:text-text-primary"
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 font-mono text-[12px]">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-muted">/</span>}
              <span className={i === crumbs.length - 1 ? 'text-text-secondary' : 'text-text-muted'}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      <button
        className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-primary"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: true,
              bubbles: true,
            }),
          );
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="rounded-[3px] border border-border-default px-1.5 py-0.5 font-mono text-[11px]">
          ⌘K
        </span>
      </button>
    </div>
  );
}
