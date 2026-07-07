"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";
import { SectionHeading } from "../../shared/section-heading";
import {
  useProjectMembers,
  useAddProjectMember,
} from "../../../hooks/use-project-settings";
import { useWorkspaceMembers } from "../../../hooks/use-workspace-settings";
import { PROJECT_ROLE_OPTIONS, displayName } from "../../../lib/roles";
import type { ProjectRole } from "@devflow/types";

interface Props {
  projectId: string;
  workspaceId: string;
}

export function AddMemberTab({ projectId, workspaceId }: Props) {
  const { data: workspaceMembers, isLoading } =
    useWorkspaceMembers(workspaceId);
  const { data: projectMembers } = useProjectMembers(projectId);
  const { mutate: addMember, isPending } = useAddProjectMember(projectId);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<ProjectRole>("DEVELOPER");

  const projectMemberIds = new Set(
    projectMembers?.map((m: any) => m.userId) ?? [],
  );
  const available =
    workspaceMembers?.filter((m: any) => !projectMemberIds.has(m.userId)) ?? [];

  const memberOptions = available.map((m: any) => ({
    label: displayName(m.user),
    value: m.userId,
  }));

  const handleMemberChange = (userId: string) => {
    setSelectedUserId(userId);
    const member = available.find((m: any) => m.userId === userId);
    setRole(member?.role === "VIEWER" ? "VIEWER" : "DEVELOPER");
  };

  const isSelectedViewer =
    available.find((m: any) => m.userId === selectedUserId)?.role === "VIEWER";

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
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? "Failed to add member"),
      },
    );
  };

  if (isLoading)
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );

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
                : PROJECT_ROLE_OPTIONS
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
