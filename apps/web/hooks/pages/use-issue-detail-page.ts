'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { isAxiosError } from 'axios';

import { ROUTES } from '../../constants/routes';
import { ISSUE_ORIGIN_LABELS, issueOriginHref, parseIssueOrigin } from '../../lib/issue-origin';
import { useIssueAccess } from '../use-issue-access';
import { useIssueById } from '../use-issues';

// Everything the detail page needs: the issue, the right address, and where "back" goes
export function useIssueDetailPage(issueId: string) {
  const router = useRouter();
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const from = parseIssueOrigin(useSearchParams().get('from'));
  const fromQuery = from ? `?from=${from}` : '';

  const { data: issue, isLoading, isError, error, refetch } = useIssueById(issueId);
  const project = issue?.project;

  // The issue says which project it belongs to. If the address names another one,
  // go to the right address (permissions are checked against the project in the address).
  const correctHref = project
    ? ROUTES.issue(project.workspace.slug, project.slug, issueId) + fromQuery
    : null;
  const isRedirecting =
    !!project && (project.workspace.slug !== workspaceSlug || project.slug !== projectSlug);

  useEffect(() => {
    if (isRedirecting && correctHref) router.replace(correctHref);
  }, [isRedirecting, correctHref, router]);

  const { canDeleteIssue } = useIssueAccess({
    workspaceSlug: project?.workspace.slug,
    projectSlug: project?.slug,
  });

  // back goes to the page the issue was opened from (the board when we don't know)
  const backHref = from
    ? issueOriginHref(from, workspaceSlug, projectSlug)
    : ROUTES.projectBoard(workspaceSlug, projectSlug);

  return {
    issue,
    isLoading,
    isRedirecting,
    isNotFound: isError && isAxiosError(error) && error.response?.status === 404,
    isError,
    refetch,
    canDelete: canDeleteIssue,
    backHref,
    backLabel: from ? ISSUE_ORIGIN_LABELS[from] : 'Board',
    goBack: () => router.push(backHref),
    // a parent, a sub-issue and a copy are always in the same project
    goToIssue: (id: string) =>
      router.push(ROUTES.issue(workspaceSlug, projectSlug, id) + fromQuery),
  };
}
