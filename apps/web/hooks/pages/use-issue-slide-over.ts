'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ROUTES } from '../../constants/routes';
import { issueOriginFromPath } from '../../lib/issue-origin';
import { useIssueAccess } from '../use-issue-access';
import { useIssueById } from '../use-issues';

interface Options {
  issueId: string | null;
  onClose: () => void;
}

export function useIssueSlideOver({ issueId, onClose }: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = !!issueId;

  const { data: issue, isLoading, isError, refetch } = useIssueById(issueId ?? '');
  // the issue says which project it belongs to, so this works on any page
  const { canDeleteIssue } = useIssueAccess({
    workspaceSlug: issue?.project.workspace.slug,
    projectSlug: issue?.project.slug,
  });
  const from = issueOriginFromPath(pathname);

  // Escape closes the panel, but only while it is open and nothing else (a modal) handled the key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // a parent, a sub-issue and a copy are always in the same project
  const goToIssue = (id: string) => {
    if (!issue) return;
    router.push(ROUTES.issue(issue.project.workspace.slug, issue.project.slug, id));
  };

  // the full page remembers where you came from, for the back arrow and the sidebar
  const expand = () => {
    if (!issue) return;
    router.push(
      ROUTES.issue(issue.project.workspace.slug, issue.project.slug, issue.id) +
        (from ? `?from=${from}` : ''),
    );
  };

  return { isOpen, issue, isLoading, isError, refetch, canDeleteIssue, goToIssue, expand };
}
