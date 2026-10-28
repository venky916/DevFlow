'use client';

import { cn } from '@devflow/ui/lib/cn';

import { useIssueSlideOver } from '../../hooks/pages/use-issue-slide-over';
import { PageError } from '../shared/page-error';
import { PageLoading } from '../shared/page-loading';
import { IssuePanel } from './issue-panel';

interface IssueSlideOverProps {
  issueId: string | null;
  onClose: () => void;
}

export function IssueSlideOver({ issueId, onClose }: IssueSlideOverProps) {
  const slide = useIssueSlideOver({ issueId, onClose });

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 transition-opacity duration-200',
          slide.isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed top-[38px] right-0 bottom-0 z-40 flex w-1/2 flex-col border-l border-border-default bg-bg-surface transition-transform duration-200 ease-out',
          slide.isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {slide.isLoading ? (
          <PageLoading />
        ) : slide.isError ? (
          <PageError message="Couldn't load this issue" onRetry={() => slide.refetch()} />
        ) : slide.issue ? (
          <IssuePanel
            issue={slide.issue}
            canDelete={slide.canDeleteIssue}
            onClose={onClose}
            onExpand={slide.expand}
            onNavigate={slide.goToIssue}
          />
        ) : null}
      </div>
    </>
  );
}
