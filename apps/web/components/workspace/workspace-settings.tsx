"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Trash2, X, Clock, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Tabs } from "@devflow/ui/components/tabs";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useAuthStore } from "../../stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import {
  useWorkspaceMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useWorkspaceInvites,
  useCreateInvite,
  useCancelInvite,
} from "../../hooks/use-workspace-settings";
import type { WorkspaceRole } from "@devflow/types";

// ─── Helpers ──────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { label: "Admin", value: "ADMIN" },
  { label: "Developer", value: "DEVELOPER" },
  { label: "Viewer", value: "VIEWER" },
];

function roleVariant(role: WorkspaceRole) {
  switch (role) {
    case "ADMIN":
      return "warning" as const;
    case "DEVELOPER":
      return "neutral" as const;
    case "VIEWER":
      return "neutral" as const;
  }
}

// display name with email fallback
function displayName(user?: { name?: string | null; email?: string | null }) {
  if (!user) return "Unknown";
  if (user.name) return user.name;
  if (user.email) return user.email.split("@")[0];
  return "Unknown";
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[13px] font-medium text-text-primary">{title}</p>
      {description && (
        <p className="text-[12px] text-text-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ─── General tab ──────────────────────────────────────────────────
function GeneralTab({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const myRole = workspace?.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === "ADMIN";

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm({
    values: { name: workspaceName },
  });

  const onSave = async (data: { name: string }) => {
    try {
      await api.patch(`/workspaces/${workspaceId}`, data);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace updated");
    } catch {
      toast.error("Failed to update workspace");
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        "Delete this workspace? All projects and issues will be permanently lost.",
      )
    )
      return;
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace deleted");
      router.push("/workspaces");
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionHeading
          title="Workspace name"
          description="The display name shown across DevFlow."
        />
        <form
          onSubmit={handleSubmit(onSave)}
          className="flex flex-col gap-3 max-w-[400px]"
        >
          <Input {...register("name")} placeholder="My workspace" />
          <div>
            <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>

      {isAdmin && (
        <>
          <div className="h-px bg-border-default" />
          <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
            <p className="text-[13px] font-medium text-danger-text">
              Danger Zone
            </p>
            <p className="text-[12px] text-text-muted">
              Permanently delete this workspace and all its projects, sprints,
              and issues. This cannot be undone.
            </p>
            <div>
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete workspace
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────
function MembersTab({ workspaceId }: { workspaceId: string }) {
  const user = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const { mutate: updateRole, isPending: updatingRole } =
    useUpdateMemberRole(workspaceId);
  const { mutate: removeMember } = useRemoveMember(workspaceId);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const myRole = workspace?.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === "ADMIN";

  // track which member's role is being updated
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Workspace members"
        description="Manage who has access to this workspace and their roles."
      />

      <div className="flex flex-col gap-2">
        {members?.map((member: any) => {
          const isMe = member.userId === user?.id;
          const canChangeRole = isAdmin && !isMe;
          const canRemove = isAdmin && !isMe;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default hover:border-border-emphasis transition-colors"
            >
              {/* Avatar */}
              <Avatar
                name={displayName(member.user)}
                src={member.user?.avatarUrl ?? undefined}
                size="sm"
              />

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] text-text-primary truncate">
                    {displayName(member.user)}
                  </p>
                  {isMe && (
                    <span className="text-[10px] text-text-muted font-mono shrink-0">
                      you
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  {member.user?.email}
                  {member.joinedAt && (
                    <span className="ml-1.5">
                      · joined{" "}
                      {formatDistanceToNow(new Date(member.joinedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </p>
              </div>

              {/* Role — dropdown if can change, badge if not */}
              <div className="shrink-0">
                {canChangeRole ? (
                  <div className="w-[130px]">
                    <Select
                      options={ROLE_OPTIONS}
                      value={member.role}
                      disabled={updatingId === member.userId && updatingRole}
                      onValueChange={(role) => {
                        setUpdatingId(member.userId);
                        updateRole(
                          {
                            userId: member.userId,
                            role: role as WorkspaceRole,
                          },
                          {
                            onSuccess: () => {
                              toast.success(`Role updated to ${role}`);
                              setUpdatingId(null);
                            },
                            onError: () => {
                              toast.error("Failed to update role");
                              setUpdatingId(null);
                            },
                          },
                        );
                      }}
                    />
                  </div>
                ) : (
                  <Badge variant={roleVariant(member.role as WorkspaceRole)}>
                    {member.role}
                  </Badge>
                )}
              </div>

              {/* Remove button */}
              {canRemove ? (
                <button
                  onClick={() =>
                    removeMember(member.userId, {
                      onSuccess: () => toast.success("Member removed"),
                      onError: () => toast.error("Failed to remove member"),
                    })
                  }
                  className="text-text-muted hover:text-danger-text transition-colors shrink-0"
                  title="Remove from workspace"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                // placeholder to keep alignment
                <div className="w-3.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Send invite tab ──────────────────────────────────────────────
function SendInviteTab({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("DEVELOPER");
  const { mutate: createInvite, isPending } = useCreateInvite(workspaceId);

  const handleSend = () => {
    if (!email.trim()) return;
    createInvite(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          toast.success(`Invite sent to ${email}`);
          setEmail("");
          setRole("DEVELOPER");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message ?? "Failed to send invite");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 max-w-[440px]">
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
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onValueChange={(v) => setRole(v as WorkspaceRole)}
        />
        <div>
          <Button
            onClick={handleSend}
            disabled={!email.trim() || isPending}
            size="sm"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Send invite"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pending invites tab ──────────────────────────────────────────
function PendingInvitesTab({ workspaceId }: { workspaceId: string }) {
  const { data: invites, isLoading } = useWorkspaceInvites(workspaceId);
  const { mutate: cancelInvite } = useCancelInvite(workspaceId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Pending invitations"
        description="Invites that have been sent but not yet accepted."
      />

      {!invites?.length ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 border border-border-default rounded-[4px]">
          <Clock className="h-5 w-5 text-text-muted" />
          <p className="text-[13px] text-text-muted">No pending invites</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default"
            >
              {/* Email avatar placeholder */}
              <div className="h-6 w-6 rounded-full bg-bg-surface border border-border-default flex items-center justify-center shrink-0">
                <span className="text-[10px] text-text-muted">
                  {invite?.email?.[0]?.toUpperCase()}
                </span>
              </div>

              {/* Email + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text-primary truncate">
                  {invite.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant={roleVariant(invite.role as WorkspaceRole)}>
                    {invite.role}
                  </Badge>
                  <span className="text-[11px] text-text-muted">
                    expires{" "}
                    {formatDistanceToNow(new Date(invite.expiresAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {invite.inviter && (
                    <span className="text-[11px] text-text-muted">
                      · by {invite.inviter.name ?? invite.inviter.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={() =>
                  cancelInvite(invite.id, {
                    onSuccess: () => toast.success("Invite cancelled"),
                    onError: () => toast.error("Failed to cancel invite"),
                  })
                }
                className="text-text-muted hover:text-danger-text transition-colors shrink-0"
                title="Cancel invite"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────
export function WorkspaceSettings() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb header */}
      <div className="flex items-center px-5 h-[38px] border-b border-border-default shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] font-mono">
          <span className="text-text-muted">{workspace.name}</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary">Settings</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Workspace Settings
          </h1>
          <Tabs
            tabs={[
              {
                label: "General",
                value: "general",
                content: (
                  <GeneralTab
                    workspaceId={workspace.id}
                    workspaceName={workspace.name}
                  />
                ),
              },
              {
                label: "Members",
                value: "members",
                content: <MembersTab workspaceId={workspace.id} />,
              },
              {
                label: "Send Invite",
                value: "send-invite",
                content: <SendInviteTab workspaceId={workspace.id} />,
              },
              {
                label: "Pending",
                value: "pending",
                content: <PendingInvitesTab workspaceId={workspace.id} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
