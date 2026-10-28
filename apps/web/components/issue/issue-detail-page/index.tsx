'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

import { useIssueDetailPage } from '../../../hooks/pages/use-issue-detail-page';
import { EmptyState } from '../../shared/empty-state';
import { PageError } from '../../shared/page-error';
import { PageLoading } from '../../shared/page-loading';
import { IssueDetailContent } from './issue-detail-content';

export function IssueDetailPage({ issueId }: { issueId: string }) {
  const page = useIssueDetailPage(issueId);

  // the loading state also shows while the address is being corrected
  if (page.isLoading || page.isRedirecting) return <PageLoading />;

  if (page.isNotFound) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <EmptyState
          icon={<Search className="size-5" />}
          message="Issue not found"
          action={
            <Link
              href={page.backHref}
              className="text-[13px] text-accent transition-colors hover:underline"
            >
              Back to {page.backLabel}
            </Link>
          }
        />
      </div>
    );
  }

  if (page.isError || !page.issue) {
    return <PageError message="Couldn't load this issue" onRetry={() => page.refetch()} />;
  }

  return (
    <IssueDetailContent
      issue={page.issue}
      canDelete={page.canDelete}
      backHref={page.backHref}
      backLabel={page.backLabel}
      onDeleted={page.goBack}
      onNavigate={page.goToIssue}
    />
  );
}
