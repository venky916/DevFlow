"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs } from "@devflow/ui/components/tabs";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { api } from "../../lib/axios";
import { useQueryClient } from "@tanstack/react-query";

export function WorkspaceSettings() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values: { name: workspace?.name ?? "" },
  });

  const onSave = async (data: { name: string }) => {
    try {
      await api.patch(`/workspaces/${workspace?.id}`, data);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace updated!");
    } catch {
      toast.error("Failed to update workspace");
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this workspace? This cannot be undone.")) return;
    try {
      await api.delete(`/workspaces/${workspace?.id}`);
      toast.success("Workspace deleted");
      router.push("/workspaces");
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  return (
    <div className="flex flex-col w-full p-6 gap-6 max-w-[680px]">
      <h1 className="text-xl font-medium text-text-primary">Settings</h1>
      <div className="h-px bg-border-default" />

      <Tabs
        tabs={[
          {
            label: "General",
            value: "general",
            content: (
              <div className="flex flex-col gap-6">
                <form
                  onSubmit={handleSubmit(onSave)}
                  className="flex flex-col gap-4"
                >
                  <Input label="Workspace name" {...register("name")} />
                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </form>

                {/* Danger zone */}
                <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
                  <p className="text-[13px] font-medium text-danger-text">
                    Danger Zone
                  </p>
                  <p className="text-[12px] text-text-muted">
                    Deleting this workspace will permanently remove all
                    projects, issues, and data.
                  </p>
                  <div>
                    <Button variant="danger" size="sm" onClick={onDelete}>
                      Delete workspace
                    </Button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Members",
            value: "members",
            content: <WorkspaceMembersTab workspaceId={workspace?.id ?? ""} />,
          },
          {
            label: "Invites",
            value: "invites",
            content: <WorkspaceInvitesTab workspaceId={workspace?.id ?? ""} />,
          },
        ]}
      />
    </div>
  );
}

function WorkspaceMembersTab({ workspaceId }: { workspaceId: string }) {
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const members = workspace?.members ?? [];

  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 rounded-[4px] border border-border-default"
        >
          <div className="flex items-center gap-3">
            <Avatar
              name={member.user?.name ?? member.user?.email ?? "?"}
              size="sm"
            />
            <div>
              <p className="text-[13px] text-text-primary">
                {member.user?.name ?? "Unknown"}
              </p>
              <p className="text-[11px] text-text-muted">
                {member.user?.email}
              </p>
            </div>
          </div>
          <Badge variant="neutral">{member.role}</Badge>
        </div>
      ))}
    </div>
  );
}

function WorkspaceInvitesTab({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sendInvite = async () => {
    if (!email) return;
    try {
      setSending(true);
      await api.post(`/workspaces/${workspaceId}/invites`, { email });
      toast.success(`Invite sent to ${email}!`);
      setEmail("");
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-text-muted">
        Invite members to your workspace by email.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="colleague@company.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={sendInvite}
          disabled={sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send invite"
          )}
        </Button>
      </div>
    </div>
  );
}
