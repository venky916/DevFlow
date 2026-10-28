'use client';

import { useParams } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';

import type { IssueFilters } from '../../lib/issue-filters';
import { useBacklogGrouped } from '../use-backlog';
import { useIssueAccess } from '../use-issue-access';
import { useIssueFilters } from '../use-issue-filters';
import { useProjectBySlug, useProjectMembers } from '../use-projects';
import { useSprints, useStartSprint } from '../use-sprints';
import { useBacklogDrag } from './use-backlog-drag';

// Everything the backlog page needs
export function useBacklogPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  // already cached by the project guard, so this makes no request
  const { data: project } = useProjectBySlug(workspaceSlug, projectSlug);
  const projectId = project?.id ?? '';

  const [issueId, setIssueId] = useQueryState('issue', parseAsString);
  const { filters, setFilters } = useIssueFilters();
  const { canCreateIssue, canMoveToSprint, canStartSprint } = useIssueAccess();

  const backlog = useBacklogGrouped(projectId, filters);
  const { data: members } = useProjectMembers(projectId);
  const { data: sprints } = useSprints(projectId);
  const {
    mutate: startSprint,
    isPending: starting,
    variables: startingId,
  } = useStartSprint(projectId);
  const drag = useBacklogDrag(backlog.data);

  const data = backlog.data;
  const totalIssues =
    (data?.sprints.reduce((total, s) => total + s.issues.length, 0) ?? 0) +
    (data?.backlogIssues.length ?? 0);

  return {
    workspaceSlug,
    projectSlug,
    project,
    issueId,
    setIssueId,
    filters,
    changeFilters: (next: IssueFilters) => setFilters(next),
    hasFilters: Object.keys(filters).length > 0,
    backlog,
    data,
    totalIssues,
    members: members?.map((m) => m.user) ?? [],
    // completed sprints can't take new issues
    openSprints: sprints?.filter((s) => s.status !== 'COMPLETED') ?? [],
    hasActiveSprint: !!data?.sprints.some((s) => s.status === 'ACTIVE'),
    canCreateIssue,
    canMoveToSprint,
    canStartSprint,
    startSprint,
    startingId: starting ? startingId : null,
    drag,
  };
}
