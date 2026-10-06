'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { WorkspaceRole } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { Input } from '@devflow/ui/components/input';
import { Select } from '@devflow/ui/components/select';

import { useCreateInvite } from '../../../hooks/use-workspace-settings';
import { WORKSPACE_ROLE_OPTIONS } from '../../../lib/roles';
import { SectionHeading } from '../../shared/section-heading';

interface Props {
  workspaceId: string;
}

export function SendInviteTab({ workspaceId }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const { mutate: createInvite, isPending } = useCreateInvite(workspaceId);

  const handleSend = () => {
    if (!email.trim()) return;
    createInvite(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          toast.success(`Invite sent to ${email}`);
          setEmail('');
          setRole('MEMBER');
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message ?? 'Failed to send invite');
        },
      },
    );
  };

  return (
    <div className="flex max-w-[440px] flex-col gap-4">
      <SectionHeading
        title="Invite by email"
        description="Send an invite link to a colleague. The invite expires in 7 days."
      />
      <div className="flex flex-col gap-3">
        <Input
          label="Email address"
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Select
          label="Role"
          options={WORKSPACE_ROLE_OPTIONS}
          value={role}
          onValueChange={(v) => setRole(v as WorkspaceRole)}
        />
        <div>
          <Button onClick={handleSend} disabled={!email.trim() || isPending} size="sm">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send invite'}
          </Button>
        </div>
      </div>
    </div>
  );
}
