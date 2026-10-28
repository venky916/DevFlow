'use client';

import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';

import { Tabs } from '@devflow/ui/components/tabs';

import { useRequireWorkspaceRole } from '../../../hooks/use-workspaces';
import { PageContainer } from '../../shared/page-container';
import { PageHeading } from '../../shared/page-heading';
import { PageLoading } from '../../shared/page-loading';
import { GeneralTab } from './general-tab';
import { MembersTab } from './members-tab';
import { PendingInvitesTab } from './pending-invites-tab';
import { SendInviteTab } from './send-invite-tab';

export function WorkspaceSettings() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspace, isAllowed } = useRequireWorkspaceRole(workspaceSlug, 'UPDATE_WORKSPACE');
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'general' });

  // the guard already loaded and checked the workspace; this covers the redirect in flight
  if (!workspace || !isAllowed) return <PageLoading />;

  return (
    <PageContainer size="medium" className="mx-0">
      <PageHeading title="Workspace Settings" />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          {
            label: 'General',
            value: 'general',
            content: <GeneralTab workspace={workspace} />,
          },
          {
            label: 'Members',
            value: 'members',
            content: <MembersTab workspaceId={workspace.id} />,
          },
          {
            label: 'Send Invite',
            value: 'send-invite',
            content: <SendInviteTab workspaceId={workspace.id} />,
          },
          {
            label: 'Pending',
            value: 'pending',
            content: <PendingInvitesTab workspaceId={workspace.id} />,
          },
        ]}
      />
    </PageContainer>
  );
}
