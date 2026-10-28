'use client';

import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';

import { Tabs } from '@devflow/ui/components/tabs';

import { useRequireProjectAccess } from '../../../hooks/use-projects';
import { PageContainer } from '../../shared/page-container';
import { PageHeading } from '../../shared/page-heading';
import { PageLoading } from '../../shared/page-loading';
import { AddMemberTab } from './add-member-tab';
import { GeneralTab } from './general-tab';
import { LabelsTab } from './labels-tab';
import { MembersTab } from './members-tab';

export function ProjectSettings() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { project, isAllowed } = useRequireProjectAccess(
    workspaceSlug,
    projectSlug,
    'UPDATE_PROJECT',
  );
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'general' });

  // the guard already loaded the project; this covers the redirect in flight
  if (!project || !isAllowed) return <PageLoading />;

  return (
    <PageContainer size="medium" className="mx-0">
      <PageHeading title="Project Settings" />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            label: 'General',
            value: 'general',
            content: <GeneralTab project={project} workspaceSlug={workspaceSlug} />,
          },
          {
            label: 'Members',
            value: 'members',
            content: <MembersTab projectId={project.id} />,
          },
          {
            label: 'Add Member',
            value: 'add-member',
            content: <AddMemberTab projectId={project.id} />,
          },
          {
            label: 'Labels',
            value: 'labels',
            content: <LabelsTab projectId={project.id} />,
          },
        ]}
      />
    </PageContainer>
  );
}
