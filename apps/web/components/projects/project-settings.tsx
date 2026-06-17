"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, X, ShieldCheck } from "lucide-react";
import { Tabs } from "@devflow/ui/components/tabs";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useAuthStore } from "../../stores/auth.store";
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
  useWorkspaceMembers,
} from "../../hooks/use-project-settings";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import type { ProjectRole } from "@devflow/types";

// ─── Helpers ──────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { label: "Lead", value: "LEAD" },
  { label: "Developer", value: "DEVELOPER" },
  { label: "Viewer", value: "VIEWER" },
];

function roleVariant(role: ProjectRole) {
  switch (role) {
    case "LEAD":
      return "success" as const;
    case "DEVELOPER":
      return "neutral" as const;
    case "VIEWER":
      return "neutral" as const;
  }
}

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
  projectId,
  projectName,
  projectDescription,
  canDelete,
}: {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm({
    values: {
      name: projectName,
      description: projectDescription ?? "",
    },
  });

  const onSave = async (data: { name: string; description: string }) => {
    try {
      await api.patch(`/projects/${projectId}`, data);
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update project");
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        "Delete this project? All issues, sprints, and data will be permanently lost.",
      )
    )
      return;
    try {
      await api.delete(`/projects/${projectId}`);
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      router.push(`/${workspaceSlug}`);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionHeading
          title="Project details"
          description="Update the project name and description."
        />
        <form
          onSubmit={handleSubmit(onSave)}
          className="flex flex-col gap-3 max-w-[400px]"
        >
          <Input label="Project name" {...register("name")} />
          <Input label="Description" {...register("description")} />
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

      {canDelete && (
        <>
          <div className="h-px bg-border-default" />
          <div className="flex flex-col gap-3 p-4 rounded-[4px] border border-danger-text">
            <p className="text-[13px] font-medium text-danger-text">
              Danger Zone
            </p>
            <p className="text-[12px] text-text-muted">
              Permanently delete this project and all its issues, sprints, and
              data. This cannot be undone.
            </p>
            <div>
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete project
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────
function MembersTab({
  projectId,
  isLead,
}: {
  projectId: string;
  isLead: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { mutate: updateRole, isPending: updatingRole } =
    useUpdateProjectMemberRole(projectId);
  const { mutate: removeMember } = useRemoveProjectMember(projectId);
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
        title="Project members"
        description="Manage who has access to this project and their roles."
      />
      <div className="flex flex-col gap-2">
        {members?.map((member: any) => {
          const isMe = member.userId === user?.id;
          const isLeadMember = member.role === "LEAD";
          const canChangeRole = isLead && !isMe;
          const canRemove = isLead && !isMe;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default hover:border-border-emphasis transition-colors"
            >
              <Avatar
                name={displayName(member.user)}
                src={member.user?.avatarUrl ?? undefined}
                size="sm"
              />
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
                  {isLeadMember && (
                    <ShieldCheck className="h-3 w-3 text-success-text shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  {member.user?.email}
                </p>
              </div>

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
                          { userId: member.userId, role: role as ProjectRole },
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
                  <Badge variant={roleVariant(member.role as ProjectRole)}>
                    {member.role}
                  </Badge>
                )}
              </div>

              {canRemove ? (
                <button
                  onClick={() =>
                    removeMember(member.userId, {
                      onSuccess: () => toast.success("Member removed"),
                      onError: () => toast.error("Failed to remove member"),
                    })
                  }
                  className="text-text-muted hover:text-danger-text transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="w-3.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Member tab ───────────────────────────────────────────────
function AddMemberTab({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const { data: workspaceMembers, isLoading } =
    useWorkspaceMembers(workspaceId);
  const { data: projectMembers } = useProjectMembers(projectId);
  const { mutate: addMember, isPending } = useAddProjectMember(projectId);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<ProjectRole>("DEVELOPER");

  // filter out workspace members already in the project
  const projectMemberIds = new Set(
    projectMembers?.map((m: any) => m.userId) ?? [],
  );
  const available =
    workspaceMembers?.filter((m: any) => !projectMemberIds.has(m.userId)) ?? [];

  const memberOptions = available.map((m: any) => ({
    label: m.user?.name ?? m.user?.email ?? "Unknown",
    value: m.userId,
  }));

  const selectedMember = available.find(
    (m: any) => m.userId === selectedUserId,
  );
  const isSelectedViewer = selectedMember?.role === "VIEWER";

  // When selected member changes, force role to VIEWER if they're workspace VIEWER
  const handleMemberChange = (userId: string) => {
    setSelectedUserId(userId);
    const member = available.find((m: any) => m.userId === userId);
    if (member?.role === "VIEWER") {
      setRole("VIEWER");
    } else {
      setRole("DEVELOPER");
    }
  };

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMember(
      { userId: selectedUserId, role },
      {
        onSuccess: () => {
          toast.success("Member added to project");
          setSelectedUserId("");
          setRole("DEVELOPER");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message ?? "Failed to add member");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[440px]">
      <SectionHeading
        title="Add member"
        description="Add a workspace member to this project. They must already be in the workspace."
      />

      {memberOptions.length === 0 ? (
        <p className="text-[13px] text-text-muted">
          All workspace members are already in this project.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Select
            label="Member"
            placeholder="Select a member..."
            options={memberOptions}
            value={selectedUserId}
            onValueChange={handleMemberChange}
          />
          <Select
            label="Role"
            options={
              isSelectedViewer
                ? [{ label: "Viewer", value: "VIEWER" }]
                : ROLE_OPTIONS
            }
            value={role}
            onValueChange={(v) => setRole(v as ProjectRole)}
          />
          <div>
            <Button
              onClick={handleAdd}
              disabled={!selectedUserId || isPending}
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add to project"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────
export function ProjectSettings() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const user = useAuthStore((s) => s.user);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);
  const { data: members } = useProjectMembers(project?.id ?? "");

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  const myMember = members?.find((m: any) => m.userId === user?.id);
  const isLead = myMember?.role === "LEAD";
  const wsRole = workspace?.members?.find(
    (m: any) => m.userId === user?.id,
  )?.role;
  const isAdmin = wsRole === "ADMIN";

  const tabs = [
    {
      label: "General",
      value: "general",
      content: (
        <GeneralTab
          projectId={project.id}
          projectName={project.name}
          projectDescription={project.description}
          canDelete={isAdmin}
        />
      ),
    },
    {
      label: "Members",
      value: "members",
      content: <MembersTab projectId={project.id} isLead={isLead} />,
    },
    ...(isLead || isAdmin
      ? [
          {
            label: "Add Member",
            value: "add-member",
            content: (
              <AddMemberTab
                projectId={project.id}
                workspaceId={workspace!.id}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Project Settings
          </h1>
          <Tabs tabs={tabs} />
        </div>
      </div>
    </div>
  );
}